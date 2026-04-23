-- Migration: reservation management flow
-- Date: 2026-04-23
-- Purpose:
-- 1. Add canonical extend/cancel RPCs for active reservations
-- 2. Make reservation expiry history semantically distinct from manual release
-- 3. Keep units mirror and unit_history aligned with reservation authority

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
      u.*,
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
      uu.id,
      'Rezervimi skadoi',
      uu.previous_data,
      to_jsonb(uu) - 'previous_data',
      now()
    from updated_units uu
    returning id
  )
  select
    uu.bathrooms,
    uu.bedrooms,
    uu.block,
    uu.buyer_lead_id,
    uu.buyer_name,
    uu.created_at,
    uu.id,
    uu.level,
    uu.notes,
    uu.owner_category,
    uu.owner_name,
    uu.price,
    uu.reservation_expires_at,
    uu.sale_date,
    uu.sale_price,
    uu.size,
    uu.status,
    uu.toilets,
    uu.type,
    uu.unit_id,
    uu.updated_at
  from updated_units uu;
end;
$function$;

CREATE OR REPLACE FUNCTION public.extend_unit_reservation(
  p_reservation_id uuid,
  p_expires_at timestamp with time zone,
  p_notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_unit_id uuid;
  v_previous_unit jsonb;
  v_new_unit jsonb;
  v_trimmed_notes text;
begin
  if p_reservation_id is null then
    raise exception 'reservation_id është i detyrueshëm';
  end if;

  if p_expires_at is null then
    raise exception 'Data e re e skadimit është e detyrueshme';
  end if;

  v_trimmed_notes := nullif(trim(coalesce(p_notes, '')), '');

  select
    ur.unit_id,
    to_jsonb(u.*)
  into
    v_unit_id,
    v_previous_unit
  from public.unit_reservations ur
  join public.units u on u.id = ur.unit_id
  where ur.id = p_reservation_id
    and ur.status = 'Aktive'
  for update of ur, u;

  if v_unit_id is null then
    raise exception 'Rezervimi aktiv nuk u gjet';
  end if;

  update public.unit_reservations
  set
    expires_at = p_expires_at,
    notes = coalesce(v_trimmed_notes, notes),
    updated_at = now()
  where id = p_reservation_id;

  update public.units
  set
    status = 'E rezervuar',
    reservation_expires_at = p_expires_at,
    updated_at = now()
  where id = v_unit_id
  returning to_jsonb(public.units.*) into v_new_unit;

  insert into public.unit_history (
    unit_id,
    change_reason,
    previous_data,
    new_data,
    changed_at
  ) values (
    v_unit_id,
    'Rezervimi u zgjat',
    v_previous_unit,
    v_new_unit,
    now()
  );

  return p_reservation_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_unit_reservation(
  p_reservation_id uuid,
  p_notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_unit_id uuid;
  v_previous_unit jsonb;
  v_new_unit jsonb;
  v_trimmed_notes text;
begin
  if p_reservation_id is null then
    raise exception 'reservation_id është i detyrueshëm';
  end if;

  v_trimmed_notes := nullif(trim(coalesce(p_notes, '')), '');

  select
    ur.unit_id,
    to_jsonb(u.*)
  into
    v_unit_id,
    v_previous_unit
  from public.unit_reservations ur
  join public.units u on u.id = ur.unit_id
  where ur.id = p_reservation_id
    and ur.status = 'Aktive'
  for update of ur, u;

  if v_unit_id is null then
    raise exception 'Rezervimi aktiv nuk u gjet';
  end if;

  update public.unit_reservations
  set
    status = 'E anuluar',
    notes = coalesce(v_trimmed_notes, notes),
    updated_at = now()
  where id = p_reservation_id;

  update public.units
  set
    status = 'Në dispozicion',
    reservation_expires_at = null,
    updated_at = now()
  where id = v_unit_id
  returning to_jsonb(public.units.*) into v_new_unit;

  insert into public.unit_history (
    unit_id,
    change_reason,
    previous_data,
    new_data,
    changed_at
  ) values (
    v_unit_id,
    'Rezervimi u anulua',
    v_previous_unit,
    v_new_unit,
    now()
  );

  return p_reservation_id;
end;
$function$;
