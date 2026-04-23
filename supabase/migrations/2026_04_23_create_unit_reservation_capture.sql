-- Migration: capture live create_unit_reservation definition
-- Date: 2026-04-23
-- Purpose:
-- 1. Bring the authoritative live `create_unit_reservation(...)` RPC into tracked SQL
-- 2. Preserve the exact production behavior without guessing additional deltas
-- 3. Establish repo-side migration authority for future reservation workflow changes

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
  where id = p_unit_id;

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

  update public.units
  set
    status = 'E rezervuar',
    updated_at = now()
  where id = p_unit_id;

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
