CREATE OR REPLACE FUNCTION public.get_units_shell_summary(
  p_stock_category text DEFAULT NULL::text,
  p_stock_entity text DEFAULT NULL::text
)
RETURNS TABLE(
  total_units integer,
  available_units_count integer,
  investitor_units_count integer,
  land_owners_units_count integer,
  construction_companies_units_count integer,
  scope_total_count integer,
  scope_available_count integer,
  scope_reserved_count integer,
  scope_sold_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with normalized_filters as (
    select
      nullif(trim(coalesce(p_stock_category, '')), '') as stock_category,
      nullif(trim(coalesce(p_stock_entity, '')), '') as stock_entity
  ),
  base_counts as (
    select
      count(*)::integer as total_units,
      count(*) filter (where status = 'Në dispozicion')::integer as available_units_count,
      count(*) filter (where owner_category = 'Investitor')::integer as investitor_units_count,
      count(*) filter (where owner_category = 'Pronarët e tokës')::integer as land_owners_units_count,
      count(*) filter (where owner_category = 'Kompani ndërtimore')::integer as construction_companies_units_count
    from public.units
  ),
  scoped_counts as (
    select
      count(*)::integer as scope_total_count,
      count(*) filter (where u.status = 'Në dispozicion')::integer as scope_available_count,
      count(*) filter (where u.status = 'E rezervuar')::integer as scope_reserved_count,
      count(*) filter (where u.status = 'E shitur')::integer as scope_sold_count
    from public.units u
    cross join normalized_filters nf
    where (nf.stock_category is null or u.owner_category = nf.stock_category)
      and (nf.stock_entity is null or u.owner_name = nf.stock_entity)
  )
  select
    bc.total_units,
    bc.available_units_count,
    bc.investitor_units_count,
    bc.land_owners_units_count,
    bc.construction_companies_units_count,
    sc.scope_total_count,
    sc.scope_available_count,
    sc.scope_reserved_count,
    sc.scope_sold_count
  from base_counts bc
  cross join scoped_counts sc;
$function$;
