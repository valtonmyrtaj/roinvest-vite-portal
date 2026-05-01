-- Migration: launch access hardening
-- Date: 2026-05-01
-- Purpose:
-- 1. Remove anonymous access from app-owned business tables and RPCs.
-- 2. Gate app data behind approved Supabase users.
-- 3. Restrict writes to Sales Director users through RLS.
-- 4. Restore the upcoming-payments RPC contract used by the frontend.

create or replace function public.current_approved_user_role()
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select au.role
  from public.approved_users au
  where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and au.status = 'active'
  limit 1;
$function$;

create or replace function public.is_approved_portal_user()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select public.current_approved_user_role() is not null;
$function$;

create or replace function public.is_sales_director()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select public.current_approved_user_role() = 'sales_director';
$function$;

revoke all on function public.current_approved_user_role() from public, anon;
revoke all on function public.is_approved_portal_user() from public, anon;
revoke all on function public.is_sales_director() from public, anon;
grant execute on function public.current_approved_user_role() to authenticated, service_role;
grant execute on function public.is_approved_portal_user() to authenticated, service_role;
grant execute on function public.is_sales_director() to authenticated, service_role;

do $block$
declare
  table_name text;
  policy_record record;
  app_tables text[] := array[
    'crm_daily_log',
    'crm_leads',
    'crm_showings',
    'dashboard_snapshots',
    'marketing_data',
    'marketing_offline',
    'owner_entities',
    'unit_history',
    'unit_payments',
    'unit_payment_receipts',
    'unit_reservations',
    'unit_sales',
    'units'
  ];
begin
  foreach table_name in array app_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('revoke all on table public.%I from public, anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('alter table public.%I enable row level security', table_name);

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_record.policyname, table_name);
    end loop;

    execute format(
      'create policy app_select_approved on public.%I for select to authenticated using (public.is_approved_portal_user())',
      table_name
    );
    execute format(
      'create policy app_insert_sales_director on public.%I for insert to authenticated with check (public.is_sales_director())',
      table_name
    );
    execute format(
      'create policy app_update_sales_director on public.%I for update to authenticated using (public.is_sales_director()) with check (public.is_sales_director())',
      table_name
    );
    execute format(
      'create policy app_delete_sales_director on public.%I for delete to authenticated using (public.is_sales_director())',
      table_name
    );
  end loop;
end;
$block$;

revoke all on table public.approved_users from public, anon;
grant select on table public.approved_users to authenticated;
alter table public.approved_users enable row level security;

do $block$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'approved_users'
  loop
    execute format('drop policy if exists %I on public.approved_users', policy_record.policyname);
  end loop;
end;
$block$;

create policy approved_users_select_self
on public.approved_users
for select
to authenticated
using (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and status = 'active'
);

do $block$
declare
  function_record record;
  app_functions text[] := array[
    'cancel_unit_reservation',
    'complete_unit_sale',
    'create_unit_reservation',
    'expire_unit_reservations',
    'extend_unit_reservation',
    'get_units_shell_summary',
    'list_sales_upcoming_payments',
    'list_unit_owner_options',
    'register_payment_receipt_with_split',
    'reporting_get_sale_metrics',
    'reporting_get_sale_monthly_series',
    'reporting_get_sale_typology_breakdown'
  ];
begin
  for function_record in
    select
      n.nspname,
      p.proname,
      oidvectortypes(p.proargtypes) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(app_functions)
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon',
      function_record.nspname,
      function_record.proname,
      function_record.args
    );
    execute format(
      'grant execute on function %I.%I(%s) to authenticated, service_role',
      function_record.nspname,
      function_record.proname,
      function_record.args
    );
    execute format(
      'alter function %I.%I(%s) security invoker',
      function_record.nspname,
      function_record.proname,
      function_record.args
    );
  end loop;
end;
$block$;

do $block$
declare
  function_record record;
begin
  for function_record in
    select
      n.nspname,
      p.proname,
      oidvectortypes(p.proargtypes) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'run_reservation_expiry_job'
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon, authenticated',
      function_record.nspname,
      function_record.proname,
      function_record.args
    );
    execute format(
      'grant execute on function %I.%I(%s) to service_role',
      function_record.nspname,
      function_record.proname,
      function_record.args
    );
  end loop;
end;
$block$;

do $block$
begin
  if to_regclass('public.reporting_sale_facts') is not null then
    revoke all on public.reporting_sale_facts from public, anon;
    grant select on public.reporting_sale_facts to authenticated, service_role;
    alter view public.reporting_sale_facts set (security_invoker = true);
  end if;
end;
$block$;

drop function if exists public.list_sales_upcoming_payments(text);

create or replace function public.list_sales_upcoming_payments(
  p_owner_scope text default 'all'::text
)
returns table(
  payment_id uuid,
  payment_unit_id uuid,
  payment_sale_id uuid,
  payment_installment_number integer,
  payment_amount numeric,
  payment_paid_amount numeric,
  payment_remaining_amount numeric,
  payment_due_date date,
  payment_paid_date date,
  payment_status text,
  payment_notes text,
  payment_created_at timestamp with time zone,
  unit_id uuid,
  unit_code text,
  unit_block text,
  unit_type text,
  unit_level text,
  unit_size numeric,
  unit_price numeric,
  unit_status text,
  unit_owner_category text,
  unit_owner_name text,
  unit_created_at timestamp with time zone,
  unit_updated_at timestamp with time zone,
  sale_final_price numeric,
  sale_date date,
  sale_buyer_name text,
  sale_buyer_phone text,
  sale_payment_type text,
  sale_crm_lead_id uuid
)
language sql
stable
security invoker
set search_path to 'public'
as $function$
  with normalized_scope as (
    select nullif(trim(coalesce(p_owner_scope, 'all')), '') as owner_scope
  ),
  receipt_totals as (
    select
      r.payment_id,
      coalesce(sum(r.amount), 0)::numeric as paid_amount
    from public.unit_payment_receipts r
    group by r.payment_id
  )
  select
    p.id as payment_id,
    p.unit_id::uuid as payment_unit_id,
    p.sale_id as payment_sale_id,
    p.installment_number as payment_installment_number,
    p.amount as payment_amount,
    coalesce(rt.paid_amount, 0)::numeric as payment_paid_amount,
    greatest(p.amount - coalesce(rt.paid_amount, 0), 0)::numeric as payment_remaining_amount,
    p.due_date as payment_due_date,
    p.paid_date as payment_paid_date,
    p.status as payment_status,
    p.notes as payment_notes,
    p.created_at as payment_created_at,
    u.id as unit_id,
    u.unit_id as unit_code,
    u.block as unit_block,
    u.type as unit_type,
    u.level as unit_level,
    u.size as unit_size,
    u.price as unit_price,
    u.status as unit_status,
    u.owner_category as unit_owner_category,
    u.owner_name as unit_owner_name,
    u.created_at as unit_created_at,
    u.updated_at as unit_updated_at,
    s.final_price as sale_final_price,
    s.sale_date as sale_date,
    s.buyer_name as sale_buyer_name,
    s.buyer_phone as sale_buyer_phone,
    s.payment_type as sale_payment_type,
    s.crm_lead_id as sale_crm_lead_id
  from public.unit_payments p
  join public.units u on u.id = p.unit_id::uuid
  left join public.unit_sales s
    on s.unit_id = u.id
    and s.status = 'active'
  left join receipt_totals rt
    on rt.payment_id = p.id
  cross join normalized_scope ns
  where greatest(p.amount - coalesce(rt.paid_amount, 0), 0) > 0
    and u.status = 'E shitur'
    and (
      ns.owner_scope is null
      or ns.owner_scope = 'all'
      or u.owner_category = ns.owner_scope
    )
  order by p.due_date asc, u.unit_id asc, p.installment_number asc;
$function$;

revoke execute on function public.list_sales_upcoming_payments(text) from public, anon;
grant execute on function public.list_sales_upcoming_payments(text) to authenticated, service_role;
