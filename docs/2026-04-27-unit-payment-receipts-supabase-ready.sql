-- Supabase-ready SQL: Unit payment receipts
-- Date: 2026-04-27
-- Purpose:
-- 1. Keep unit_payments as installment obligations
-- 2. Store actual money received as receipt rows
-- 3. Support partial payments without rewriting the original payment plan
-- 4. Keep reporting/upcoming-payment RPCs anchored on actual receipts
--
-- Run this whole file once in Supabase SQL Editor.
-- Do not run only a selected block.

begin;

create table if not exists public.unit_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.unit_payments(id) on delete cascade,
  amount numeric not null,
  paid_date date not null,
  notes text null,
  created_at timestamp with time zone not null default now()
);

do $unit_payment_receipts_constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.unit_payment_receipts'::regclass
      and conname = 'unit_payment_receipts_amount_positive_check'
  ) then
    alter table public.unit_payment_receipts
      add constraint unit_payment_receipts_amount_positive_check
      check (amount > 0);
  end if;
end;
$unit_payment_receipts_constraints$;

create index if not exists unit_payment_receipts_payment_id_idx
  on public.unit_payment_receipts (payment_id);

create index if not exists unit_payment_receipts_paid_date_idx
  on public.unit_payment_receipts (paid_date);

grant select, insert, update, delete on public.unit_payment_receipts to anon, authenticated, service_role;

alter table public.unit_payment_receipts enable row level security;

drop policy if exists unit_payment_receipts_select_policy on public.unit_payment_receipts;
drop policy if exists unit_payment_receipts_insert_policy on public.unit_payment_receipts;
drop policy if exists unit_payment_receipts_update_policy on public.unit_payment_receipts;
drop policy if exists unit_payment_receipts_delete_policy on public.unit_payment_receipts;

create policy unit_payment_receipts_select_policy
on public.unit_payment_receipts
for select
to anon, authenticated
using (true);

create policy unit_payment_receipts_insert_policy
on public.unit_payment_receipts
for insert
to anon, authenticated
with check (true);

create policy unit_payment_receipts_update_policy
on public.unit_payment_receipts
for update
to anon, authenticated
using (true)
with check (true);

create policy unit_payment_receipts_delete_policy
on public.unit_payment_receipts
for delete
to anon, authenticated
using (true);

create or replace function public.validate_unit_payment_receipt_total()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $validate_unit_payment_receipt_total$
declare
  v_payment_amount numeric;
  v_existing_receipts numeric;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.amount <= 0 then
    raise exception 'Shuma e pagesës duhet të jetë më e madhe se 0';
  end if;

  if new.paid_date is null then
    raise exception 'Data e pagesës është e detyrueshme';
  end if;

  if new.paid_date > current_date then
    raise exception 'Data e pagesës nuk mund të jetë në të ardhmen';
  end if;

  select p.amount
  into v_payment_amount
  from public.unit_payments p
  where p.id = new.payment_id
  for update;

  if v_payment_amount is null then
    raise exception 'Kësti nuk ekziston';
  end if;

  select coalesce(sum(r.amount), 0)
  into v_existing_receipts
  from public.unit_payment_receipts r
  where r.payment_id = new.payment_id
    and (tg_op = 'INSERT' or r.id <> new.id);

  if round((v_existing_receipts + new.amount)::numeric, 2) > round(v_payment_amount::numeric, 2) then
    raise exception 'Pagesa e tejkalon shumën e mbetur të këstit';
  end if;

  return new;
end;
$validate_unit_payment_receipt_total$;

drop trigger if exists unit_payment_receipts_validate_total_trg on public.unit_payment_receipts;
create trigger unit_payment_receipts_validate_total_trg
before insert or update on public.unit_payment_receipts
for each row
execute function public.validate_unit_payment_receipt_total();

create or replace function public.sync_unit_payment_from_receipts(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $sync_unit_payment_from_receipts$
declare
  v_payment_amount numeric;
  v_received_amount numeric;
  v_last_paid_date date;
begin
  select p.amount
  into v_payment_amount
  from public.unit_payments p
  where p.id = p_payment_id;

  if v_payment_amount is null then
    return;
  end if;

  select
    coalesce(sum(r.amount), 0),
    max(r.paid_date)
  into v_received_amount, v_last_paid_date
  from public.unit_payment_receipts r
  where r.payment_id = p_payment_id;

  if round(v_received_amount::numeric, 2) >= round(v_payment_amount::numeric, 2) then
    update public.unit_payments
    set
      status = 'E paguar',
      paid_date = coalesce(v_last_paid_date, due_date)
    where id = p_payment_id
      and (status is distinct from 'E paguar' or paid_date is distinct from coalesce(v_last_paid_date, due_date));
  else
    update public.unit_payments
    set
      status = 'E papaguar',
      paid_date = null
    where id = p_payment_id
      and (status is distinct from 'E papaguar' or paid_date is not null);
  end if;
end;
$sync_unit_payment_from_receipts$;

create or replace function public.sync_unit_payment_from_receipts_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $sync_unit_payment_from_receipts_trigger$
begin
  if tg_op = 'DELETE' then
    perform public.sync_unit_payment_from_receipts(old.payment_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.payment_id is distinct from new.payment_id then
    perform public.sync_unit_payment_from_receipts(old.payment_id);
  end if;

  perform public.sync_unit_payment_from_receipts(new.payment_id);
  return new;
end;
$sync_unit_payment_from_receipts_trigger$;

drop trigger if exists unit_payment_receipts_sync_payment_trg on public.unit_payment_receipts;
create trigger unit_payment_receipts_sync_payment_trg
after insert or update or delete on public.unit_payment_receipts
for each row
execute function public.sync_unit_payment_from_receipts_trigger();

create or replace function public.ensure_receipt_for_paid_unit_payment()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $ensure_receipt_for_paid_unit_payment$
declare
  v_existing_receipts numeric;
  v_missing_amount numeric;
begin
  if new.status <> 'E paguar' then
    return new;
  end if;

  select coalesce(sum(r.amount), 0)
  into v_existing_receipts
  from public.unit_payment_receipts r
  where r.payment_id = new.id;

  v_missing_amount := new.amount - v_existing_receipts;

  if round(v_missing_amount::numeric, 2) > 0 then
    insert into public.unit_payment_receipts (
      payment_id,
      amount,
      paid_date,
      notes
    ) values (
      new.id,
      v_missing_amount,
      coalesce(new.paid_date, new.due_date),
      'Pagesë e regjistruar'
    );
  end if;

  return new;
end;
$ensure_receipt_for_paid_unit_payment$;

drop trigger if exists unit_payments_ensure_paid_receipt_trg on public.unit_payments;
create trigger unit_payments_ensure_paid_receipt_trg
after insert or update of status, paid_date, amount on public.unit_payments
for each row
execute function public.ensure_receipt_for_paid_unit_payment();

insert into public.unit_payment_receipts (
  payment_id,
  amount,
  paid_date,
  notes
)
select
  p.id,
  p.amount - coalesce(r.receipt_total, 0),
  coalesce(p.paid_date, p.due_date),
  'Backfill nga këstet e paguara ekzistuese'
from public.unit_payments p
left join (
  select
    payment_id,
    sum(amount) as receipt_total
  from public.unit_payment_receipts
  group by payment_id
) r on r.payment_id = p.id
where p.status = 'E paguar'
  and round((p.amount - coalesce(r.receipt_total, 0))::numeric, 2) > 0;

do $resync_unit_payments_from_receipts$
declare
  v_payment record;
begin
  for v_payment in
    select id
    from public.unit_payments
  loop
    perform public.sync_unit_payment_from_receipts(v_payment.id);
  end loop;
end;
$resync_unit_payments_from_receipts$;

create or replace view public.reporting_sale_facts as
with active_sales as (
  select
    us.id as sale_id,
    us.status as sale_status,
    us.sale_date,
    us.final_price,
    us.buyer_name,
    us.payment_type,
    us.notes as sale_notes,
    us.crm_lead_id,
    us.reservation_id,
    us.showing_id,
    us.created_at as sale_created_at,
    us.updated_at as sale_updated_at,
    us.unit_id as unit_record_id
  from public.unit_sales us
  where us.status = 'active'
),
active_sale_duplicates as (
  select
    a.unit_record_id,
    count(*)::integer as active_sale_count_for_unit
  from active_sales a
  group by a.unit_record_id
),
receipt_totals as (
  select
    r.payment_id,
    coalesce(sum(r.amount), 0)::numeric as paid_amount,
    max(r.paid_date) as last_paid_date
  from public.unit_payment_receipts r
  group by r.payment_id
),
payment_rollups as (
  select
    up.sale_id,
    count(*)::integer as payment_row_count,
    count(*) filter (where coalesce(rt.paid_amount, 0) >= up.amount)::integer as paid_payment_count,
    count(*) filter (where coalesce(rt.paid_amount, 0) < up.amount)::integer as unpaid_payment_count,
    coalesce(sum(coalesce(rt.paid_amount, 0)), 0)::numeric as paid_amount,
    coalesce(sum(greatest(up.amount - coalesce(rt.paid_amount, 0), 0)), 0)::numeric as scheduled_unpaid_amount,
    min(up.due_date) filter (where coalesce(rt.paid_amount, 0) < up.amount) as next_unpaid_due_date,
    max(rt.last_paid_date) as last_paid_date
  from public.unit_payments up
  left join receipt_totals rt
    on rt.payment_id = up.id
  where up.sale_id is not null
  group by up.sale_id
)
select
  a.sale_id,
  a.sale_status,
  a.sale_date,
  a.final_price,
  a.buyer_name,
  a.payment_type,
  a.sale_notes,
  a.crm_lead_id,
  a.reservation_id,
  a.showing_id,
  a.sale_created_at,
  a.sale_updated_at,
  a.unit_record_id,
  u.unit_id as unit_code,
  u.status as current_unit_status,
  u.block,
  u.type as unit_type,
  u.level,
  case
    when u.level = 'Penthouse' then 'Penthouse'
    when u.type = 'Lokal' then 'Lokal'
    when u.type = 'Garazhë' then 'Garazhë'
    else 'Banesë'
  end as typology,
  u.size,
  u.price as listing_price,
  u.owner_category,
  u.owner_name,
  d.active_sale_count_for_unit,
  (d.active_sale_count_for_unit > 1) as has_duplicate_active_sales_for_unit,
  coalesce(pr.payment_row_count, 0) as payment_row_count,
  coalesce(pr.paid_payment_count, 0) as paid_payment_count,
  coalesce(pr.unpaid_payment_count, 0) as unpaid_payment_count,
  coalesce(pr.paid_amount, 0)::numeric as paid_amount,
  coalesce(pr.scheduled_unpaid_amount, 0)::numeric as scheduled_unpaid_amount,
  greatest(a.final_price - coalesce(pr.paid_amount, 0), 0)::numeric as pending_amount,
  (coalesce(pr.payment_row_count, 0) > 0) as has_payment_rows,
  pr.next_unpaid_due_date,
  pr.last_paid_date
from active_sales a
join public.units u
  on u.id = a.unit_record_id
join active_sale_duplicates d
  on d.unit_record_id = a.unit_record_id
left join payment_rollups pr
  on pr.sale_id = a.sale_id;

grant select on public.reporting_sale_facts to anon, authenticated, service_role;

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
  sale_payment_type text,
  sale_crm_lead_id uuid
)
language sql
stable
security definer
set search_path to 'public'
as $list_sales_upcoming_payments$
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
$list_sales_upcoming_payments$;

grant execute on function public.list_sales_upcoming_payments(text) to anon, authenticated, service_role;

commit;
