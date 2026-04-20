-- Migration: reporting_sale_facts phase 2
-- Date: 2026-04-17
-- Purpose:
-- 1. Add monthly financial series RPC for SalesPage
-- 2. Add typology financial breakdown RPC for SalesPage
-- 3. Keep all period / owner-scope semantics anchored on reporting_sale_facts
-- 4. Refuse to aggregate cohorts contaminated by duplicate active sales

create or replace function public.reporting_get_sale_monthly_series(
  p_owner_scope text default 'all',
  p_year integer default null
)
returns table (
  owner_scope text,
  series_year integer,
  month_number integer,
  month_label text,
  month_short_label text,
  sold_units bigint,
  contracted_value numeric
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

  if p_year is null then
    raise exception 'Year is required';
  end if;

  if exists (
    select 1
    from public.reporting_sale_facts rsf
    where (v_owner_scope = 'all' or rsf.owner_category = v_owner_scope)
      and extract(year from rsf.sale_date)::integer = p_year
      and rsf.has_duplicate_active_sales_for_unit
  ) then
    raise exception 'Duplicate active sales detected in reporting cohort. Resolve sale integrity before trusting monthly series.';
  end if;

  return query
  with month_scaffold as (
    select *
    from (
      values
        (1, 'Janar'::text, 'Jan'::text),
        (2, 'Shkurt'::text, 'Shk'::text),
        (3, 'Mars'::text, 'Mar'::text),
        (4, 'Prill'::text, 'Pri'::text),
        (5, 'Maj'::text, 'Maj'::text),
        (6, 'Qershor'::text, 'Qer'::text),
        (7, 'Korrik'::text, 'Kor'::text),
        (8, 'Gusht'::text, 'Gus'::text),
        (9, 'Shtator'::text, 'Sht'::text),
        (10, 'Tetor'::text, 'Tet'::text),
        (11, 'Nëntor'::text, 'Nën'::text),
        (12, 'Dhjetor'::text, 'Dhj'::text)
    ) as months(month_number, month_label, month_short_label)
  ),
  filtered_sales as (
    select *
    from public.reporting_sale_facts rsf
    where (v_owner_scope = 'all' or rsf.owner_category = v_owner_scope)
      and extract(year from rsf.sale_date)::integer = p_year
  ),
  grouped as (
    select
      extract(month from rsf.sale_date)::integer as month_number,
      count(*)::bigint as sold_units,
      coalesce(sum(rsf.final_price), 0)::numeric as contracted_value
    from filtered_sales rsf
    group by extract(month from rsf.sale_date)::integer
  )
  select
    v_owner_scope as owner_scope,
    p_year as series_year,
    months.month_number,
    months.month_label,
    months.month_short_label,
    coalesce(grouped.sold_units, 0)::bigint as sold_units,
    coalesce(grouped.contracted_value, 0)::numeric as contracted_value
  from month_scaffold months
  left join grouped
    on grouped.month_number = months.month_number
  order by months.month_number;
end;
$function$;


create or replace function public.reporting_get_sale_typology_breakdown(
  p_owner_scope text default 'all',
  p_year integer default null,
  p_month integer default null
)
returns table (
  owner_scope text,
  period_year integer,
  period_month integer,
  typology text,
  typology_order integer,
  sold_units bigint,
  contracted_value numeric,
  unit_record_ids uuid[],
  sale_ids uuid[]
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

  if p_year is null then
    raise exception 'Year is required';
  end if;

  if p_month is not null and (p_month < 1 or p_month > 12) then
    raise exception 'Month must be between 1 and 12';
  end if;

  if exists (
    select 1
    from public.reporting_sale_facts rsf
    where (v_owner_scope = 'all' or rsf.owner_category = v_owner_scope)
      and extract(year from rsf.sale_date)::integer = p_year
      and (p_month is null or extract(month from rsf.sale_date)::integer = p_month)
      and rsf.has_duplicate_active_sales_for_unit
  ) then
    raise exception 'Duplicate active sales detected in reporting cohort. Resolve sale integrity before trusting typology breakdown.';
  end if;

  return query
  with typology_scaffold as (
    select *
    from (
      values
        ('Banesë'::text, 1),
        ('Penthouse'::text, 2),
        ('Lokal'::text, 3),
        ('Garazhë'::text, 4)
    ) as typologies(typology, typology_order)
  ),
  filtered_sales as (
    select *
    from public.reporting_sale_facts rsf
    where (v_owner_scope = 'all' or rsf.owner_category = v_owner_scope)
      and extract(year from rsf.sale_date)::integer = p_year
      and (p_month is null or extract(month from rsf.sale_date)::integer = p_month)
  ),
  grouped as (
    select
      rsf.typology,
      count(*)::bigint as sold_units,
      coalesce(sum(rsf.final_price), 0)::numeric as contracted_value,
      coalesce(
        array_agg(rsf.unit_record_id order by rsf.sale_date desc, rsf.unit_code asc),
        array[]::uuid[]
      ) as unit_record_ids,
      coalesce(
        array_agg(rsf.sale_id order by rsf.sale_date desc, rsf.unit_code asc),
        array[]::uuid[]
      ) as sale_ids
    from filtered_sales rsf
    group by rsf.typology
  )
  select
    v_owner_scope as owner_scope,
    p_year as period_year,
    p_month as period_month,
    scaffold.typology,
    scaffold.typology_order,
    coalesce(grouped.sold_units, 0)::bigint as sold_units,
    coalesce(grouped.contracted_value, 0)::numeric as contracted_value,
    coalesce(grouped.unit_record_ids, array[]::uuid[]) as unit_record_ids,
    coalesce(grouped.sale_ids, array[]::uuid[]) as sale_ids
  from typology_scaffold scaffold
  left join grouped
    on grouped.typology = scaffold.typology
  order by scaffold.typology_order;
end;
$function$;
