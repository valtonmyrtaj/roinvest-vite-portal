-- Migration: expire_unit_reservations return-shape fix
-- Date: 2026-04-23
-- Purpose:
-- 1. Preserve the canonical reservation expiry flow
-- 2. Return `public.units` rows in the actual composite table shape
-- 3. Unblock the live cron runner when expired reservations exist

CREATE OR REPLACE FUNCTION public.expire_unit_reservations(
  p_unit_ids uuid[] DEFAULT NULL::uuid[],
  p_cutoff timestamp with time zone DEFAULT now()
)
RETURNS SETOF public.units
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  return query
  with candidate_reservations as (
    select
      ur.id as reservation_id,
      ur.unit_id,
      to_jsonb(u.*) as previous_data
    from public.unit_reservations ur
    join public.units u on u.id = ur.unit_id
    where ur.status = 'Aktive'
      and u.status = 'E rezervuar'
      and ur.expires_at is not null
      and ur.expires_at <= coalesce(p_cutoff, now())
      and (p_unit_ids is null or ur.unit_id = any(p_unit_ids))
    for update of ur, u
  ),
  updated_reservations as (
    update public.unit_reservations ur
    set
      status = 'E skaduar',
      updated_at = now()
    from candidate_reservations cr
    where ur.id = cr.reservation_id
    returning ur.id
  ),
  updated_units as (
    update public.units u
    set
      status = 'Në dispozicion',
      reservation_expires_at = null,
      updated_at = now()
    from candidate_reservations cr
    where u.id = cr.unit_id
    returning
      u as unit_row,
      cr.previous_data
  ),
  inserted_history as (
    insert into public.unit_history (
      unit_id,
      change_reason,
      previous_data,
      new_data,
      changed_at
    )
    select
      (uu.unit_row).id,
      'Rezervimi skadoi',
      uu.previous_data,
      to_jsonb(uu.unit_row),
      now()
    from updated_units uu
    returning id
  )
  select (uu.unit_row).*
  from updated_units uu;
end;
$function$;
