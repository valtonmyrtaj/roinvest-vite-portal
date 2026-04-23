-- Migration: reservation authority hardening
-- Date: 2026-04-23
-- Purpose:
-- 1. Make reservation creation update the units mirror and unit_history atomically
-- 2. Lock the unit row during reservation creation to reduce concurrent double-reserve races
-- 3. Add a canonical server-side expiry path for expired active reservations

CREATE OR REPLACE FUNCTION public.create_unit_reservation(
  p_unit_id uuid,
  p_contact_id uuid DEFAULT NULL::uuid,
  p_showing_id uuid DEFAULT NULL::uuid,
  p_reserved_at timestamp with time zone DEFAULT now(),
  p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_reservation_id uuid;
  v_effective_contact_id uuid;
  v_unit_status text;
begin
  if p_unit_id is null then
    raise exception 'unit_id është i detyrueshëm';
  end if;

  select status
  into v_unit_status
  from public.units
  where id = p_unit_id
  for update;

  if v_unit_status is null then
    raise exception 'Njësia nuk ekziston';
  end if;

  if v_unit_status = 'E shitur' then
    raise exception 'Njësia është tashmë e shitur';
  end if;

  if exists (
    select 1
    from public.unit_reservations
    where unit_id = p_unit_id
      and status = 'Aktive'
  ) then
    raise exception 'Njësia ka tashmë një rezervim aktiv';
  end if;

  if p_contact_id is not null then
    v_effective_contact_id := p_contact_id;
  elsif p_showing_id is not null then
    select contact_id
    into v_effective_contact_id
    from public.crm_showings
    where id = p_showing_id;
  else
    v_effective_contact_id := null;
  end if;

  insert into public.unit_reservations (
    unit_id,
    contact_id,
    showing_id,
    status,
    reserved_at,
    expires_at,
    notes
  ) values (
    p_unit_id,
    v_effective_contact_id,
    p_showing_id,
    'Aktive',
    coalesce(p_reserved_at, now()),
    p_expires_at,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_reservation_id;

  with prev as (
    select to_jsonb(u.*) as snapshot
    from public.units u
    where u.id = p_unit_id
  ),
  updated as (
    update public.units
    set
      status = 'E rezervuar',
      reservation_expires_at = p_expires_at,
      updated_at = now()
    where id = p_unit_id
    returning to_jsonb(public.units.*) as snapshot
  )
  insert into public.unit_history (
    unit_id,
    change_reason,
    previous_data,
    new_data,
    changed_at
  )
  select
    p_unit_id,
    'E rezervuar',
    prev.snapshot,
    updated.snapshot,
    now()
  from prev, updated;

  if p_showing_id is not null then
    update public.crm_showings
    set
      status = case
        when status = 'E planifikuar' then 'E kryer'
        else status
      end,
      outcome = 'Rezervoi',
      contact_id = coalesce(contact_id, v_effective_contact_id),
      unit_record_id = coalesce(unit_record_id, p_unit_id)
    where id = p_showing_id;
  end if;

  return v_reservation_id;
end;
$function$;

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
      'Në dispozicion',
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
