CREATE OR REPLACE FUNCTION public.list_unit_owner_options()
RETURNS TABLE(category text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with raw_options as (
    select
      oe.category::text as category,
      trim(regexp_replace(coalesce(oe.name, ''), '\s+', ' ', 'g')) as name
    from public.owner_entities oe

    union all

    select
      u.owner_category::text as category,
      trim(regexp_replace(coalesce(u.owner_name, ''), '\s+', ' ', 'g')) as name
    from public.units u
  ),
  normalized_options as (
    select
      category,
      name
    from raw_options
    where category in ('Investitor', 'Pronarët e tokës', 'Kompani ndërtimore')
      and name <> ''
  )
  select distinct on (category, lower(name))
    category,
    name
  from normalized_options
  order by category, lower(name), name;
$function$;
