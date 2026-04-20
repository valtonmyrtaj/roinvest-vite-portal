-- Migration: reporting_sale_facts phase 1
-- Date: 2026-04-17
-- Purpose:
-- 1. Introduce a sale-centric reporting view keyed on sale_id
-- 2. Define backend-owned financial KPI aggregation via reporting_get_sale_metrics
-- 3. Keep financial aggregation anchored on unit_sales + unit_payments.sale_id
-- 4. Surface duplicate-active-sale risk instead of silently hiding it

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
payment_rollups as (
  select
    up.sale_id,
    count(*)::integer as payment_row_count,
    count(*) filter (where up.status = 'E paguar')::integer as paid_payment_count,
    count(*) filter (where up.status <> 'E paguar')::integer as unpaid_payment_count,
    coalesce(sum(up.amount) filter (where up.status = 'E paguar'), 0)::numeric as paid_amount,
    coalesce(sum(up.amount) filter (where up.status <> 'E paguar'), 0)::numeric as scheduled_unpaid_amount,
    min(up.due_date) filter (where up.status <> 'E paguar') as next_unpaid_due_date,
    max(up.paid_date) filter (where up.status = 'E paguar') as last_paid_date
  from public.unit_payments up
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


create or replace function public.reporting_get_sale_metrics(
  p_owner_scope text default 'all',
  p_year integer default null,
  p_month integer default null
)
returns table (
  owner_scope text,
  period_year integer,
  period_month integer,
  sold_units bigint,
  contracted_value numeric,
  collected_value numeric,
  pending_value numeric,
  has_payment_data boolean
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_owner_scope text := coalesce(nullif(trim(p_owner_scope), ''), 'all');
begin
  if v_owner_scope not in ('all', 'Investitor', 'Pronarët e tokës', 'Kompani ndërtimore') then
    raise exception 'Invalid owner_scope: %', v_owner_scope;
  end if;

  if p_month is not null and p_year is null then
    raise exception 'Month filtering requires a year';
  end if;

  if p_month is not null and (p_month < 1 or p_month > 12) then
    raise exception 'Month must be between 1 and 12';
  end if;

  if exists (
    select 1
    from public.reporting_sale_facts rsf
    where (v_owner_scope = 'all' or rsf.owner_category = v_owner_scope)
      and (p_year is null or extract(year from rsf.sale_date)::integer = p_year)
      and (p_month is null or extract(month from rsf.sale_date)::integer = p_month)
      and rsf.has_duplicate_active_sales_for_unit
  ) then
    raise exception 'Duplicate active sales detected in reporting cohort. Resolve sale integrity before trusting financial metrics.';
  end if;

  return query
  select
    v_owner_scope as owner_scope,
    p_year as period_year,
    p_month as period_month,
    count(*)::bigint as sold_units,
    coalesce(sum(rsf.final_price), 0)::numeric as contracted_value,
    coalesce(sum(rsf.paid_amount), 0)::numeric as collected_value,
    coalesce(sum(rsf.pending_amount), 0)::numeric as pending_value,
    coalesce(bool_or(rsf.has_payment_rows), false) as has_payment_data
  from public.reporting_sale_facts rsf
  where (v_owner_scope = 'all' or rsf.owner_category = v_owner_scope)
    and (p_year is null or extract(year from rsf.sale_date)::integer = p_year)
    and (p_month is null or extract(month from rsf.sale_date)::integer = p_month);
end;
$function$;
