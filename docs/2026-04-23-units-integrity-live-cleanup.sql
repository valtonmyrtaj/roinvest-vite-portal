-- Live Units Integrity Cleanup Pack
-- Date: 2026-04-23
-- Scope:
-- 1. Clear stale reservation mirrors on sold units BA-02 and BB-08
-- 2. Repair the future `updated_at` timestamp on BC-07
-- 3. Provide an explicit operator decision path for BA-07
--
-- IMPORTANT
-- - Apply the forward migration
--   `supabase/migrations/2026_04_23_complete_unit_sale_clear_reservation_mirror.sql`
--   first, so the bug does not keep reproducing.
-- - This pack is for live production cleanup. It is intentionally NOT a normal
--   forward migration because it targets specific rows discovered in the
--   authenticated integrity audit on 2026-04-23.
-- - BA-07 is intentionally not auto-fixed here without an operator decision.

-- ---------------------------------------------------------------------------
-- Section 0: Preflight
-- ---------------------------------------------------------------------------

select
  u.id,
  u.unit_id,
  u.status,
  u.reservation_expires_at,
  u.sale_date,
  u.sale_price,
  u.buyer_name,
  u.updated_at
from public.units u
where u.unit_id in ('BA-02', 'BA-07', 'BB-08', 'BC-07')
order by u.unit_id;

select
  u.unit_id,
  ur.id as reservation_id,
  ur.status,
  ur.expires_at,
  ur.reserved_at,
  ur.contact_id,
  ur.showing_id,
  ur.updated_at
from public.unit_reservations ur
join public.units u
  on u.id = ur.unit_id
where u.unit_id in ('BA-02', 'BA-07', 'BB-08', 'BC-07')
order by u.unit_id, ur.created_at;

select
  u.unit_id,
  us.id as sale_id,
  us.status,
  us.final_price,
  us.sale_date,
  us.buyer_name,
  us.payment_type,
  us.crm_lead_id,
  us.reservation_id
from public.unit_sales us
join public.units u
  on u.id = us.unit_id
where u.unit_id in ('BA-02', 'BB-08')
order by u.unit_id, us.created_at;

-- ---------------------------------------------------------------------------
-- Section 1: High-confidence repairs
-- ---------------------------------------------------------------------------
-- These are safe to run without further business decisions:
-- - BA-02 and BB-08 are sold, have active sale truth, and still carry stale
--   reservation mirrors.
-- - BC-07 has an active reservation row, but its `units.updated_at` is in the
--   future. We repair that using the authoritative reservation row timestamp.

begin;

with sold_targets as (
  select
    u.id as unit_record_id,
    to_jsonb(u.*) as previous_snapshot
  from public.units u
  where u.unit_id in ('BA-02', 'BB-08')
    and u.status = 'E shitur'
    and u.reservation_expires_at is not null
    and exists (
      select 1
      from public.unit_sales us
      where us.unit_id = u.id
        and us.status = 'active'
    )
),
updated_sold as (
  update public.units u
  set
    reservation_expires_at = null,
    updated_at = now()
  from sold_targets t
  where u.id = t.unit_record_id
  returning
    u.id as unit_record_id,
    t.previous_snapshot,
    to_jsonb(u.*) as new_snapshot
),
insert_sold_history as (
  insert into public.unit_history (
    unit_id,
    change_reason,
    previous_data,
    new_data,
    changed_at
  )
  select
    unit_record_id,
    'Riparim integriteti rezervimi',
    previous_snapshot,
    new_snapshot,
    now()
  from updated_sold
  returning unit_id
),
bc07_target as (
  select
    u.id as unit_record_id,
    to_jsonb(u.*) as previous_snapshot,
    coalesce(ur.updated_at, ur.reserved_at, now()) as repaired_updated_at
  from public.units u
  join public.unit_reservations ur
    on ur.unit_id = u.id
   and ur.status = 'Aktive'
  where u.unit_id = 'BC-07'
    and u.updated_at > now()
  limit 1
),
updated_bc07 as (
  update public.units u
  set updated_at = t.repaired_updated_at
  from bc07_target t
  where u.id = t.unit_record_id
  returning
    u.id as unit_record_id,
    t.previous_snapshot,
    to_jsonb(u.*) as new_snapshot
),
insert_bc07_history as (
  insert into public.unit_history (
    unit_id,
    change_reason,
    previous_data,
    new_data,
    changed_at
  )
  select
    unit_record_id,
    'Riparim integriteti timestampi',
    previous_snapshot,
    new_snapshot,
    now()
  from updated_bc07
  returning unit_id
)
select
  (select count(*) from updated_sold) as sold_mirror_repairs,
  (select count(*) from updated_bc07) as bc07_timestamp_repairs;

commit;

-- ---------------------------------------------------------------------------
-- Section 2: BA-07 operator decision
-- ---------------------------------------------------------------------------
-- BA-07 currently has:
-- - units.status = 'E rezervuar'
-- - units.reservation_expires_at set
-- - NO active row in unit_reservations
--
-- That means the mirror was written without authoritative reservation truth.
--
-- Choose exactly ONE path:
--   A. If the reservation is real and you have the correct `contact_id`
--      (and optionally `showing_id`), create the missing unit_reservations row.
--   B. If no authoritative reservation exists, revert BA-07 back to
--      'Në dispozicion' and clear the mirror.
--
-- Recommended default when business truth is unknown: Path B.

-- ---------------------------------------------------------------------------
-- Path A: Create the missing authoritative reservation row for BA-07
-- ---------------------------------------------------------------------------
-- Replace the placeholder values before running.
--
-- begin;
--
-- with target as (
--   select
--     u.id as unit_record_id,
--     to_jsonb(u.*) as previous_snapshot,
--     u.reservation_expires_at::timestamptz as expires_at_ts
--   from public.units u
--   where u.unit_id = 'BA-07'
--     and u.status = 'E rezervuar'
--     and u.reservation_expires_at is not null
--     and not exists (
--       select 1
--       from public.unit_reservations ur
--       where ur.unit_id = u.id
--         and ur.status = 'Aktive'
--     )
-- ),
-- inserted_reservation as (
--   insert into public.unit_reservations (
--     unit_id,
--     status,
--     expires_at,
--     reserved_at,
--     contact_id,
--     showing_id,
--     created_at,
--     updated_at
--   )
--   select
--     unit_record_id,
--     'Aktive',
--     expires_at_ts,
--     now(),
--     'REPLACE_WITH_CONTACT_ID'::uuid,
--     nullif('REPLACE_WITH_SHOWING_ID_OR_EMPTY', '')::uuid,
--     now(),
--     now()
--   from target
--   returning unit_id
-- ),
-- touch_unit as (
--   update public.units u
--   set updated_at = now()
--   from target t
--   where u.id = t.unit_record_id
--   returning
--     u.id as unit_record_id,
--     t.previous_snapshot,
--     to_jsonb(u.*) as new_snapshot
-- )
-- insert into public.unit_history (
--   unit_id,
--   change_reason,
--   previous_data,
--   new_data,
--   changed_at
-- )
-- select
--   unit_record_id,
--   'Riparim integriteti rezervimi',
--   previous_snapshot,
--   new_snapshot,
--   now()
-- from touch_unit;
--
-- commit;

-- ---------------------------------------------------------------------------
-- Path B: Revert BA-07 to available
-- ---------------------------------------------------------------------------
-- Run this if BA-07 does NOT have a real authoritative reservation behind it.

-- begin;
--
-- with target as (
--   select
--     u.id as unit_record_id,
--     to_jsonb(u.*) as previous_snapshot
--   from public.units u
--   where u.unit_id = 'BA-07'
--     and u.status = 'E rezervuar'
--     and u.reservation_expires_at is not null
--     and not exists (
--       select 1
--       from public.unit_reservations ur
--       where ur.unit_id = u.id
--         and ur.status = 'Aktive'
--     )
-- ),
-- updated as (
--   update public.units u
--   set
--     status = 'Në dispozicion',
--     reservation_expires_at = null,
--     updated_at = now()
--   from target t
--   where u.id = t.unit_record_id
--   returning
--     u.id as unit_record_id,
--     t.previous_snapshot,
--     to_jsonb(u.*) as new_snapshot
-- )
-- insert into public.unit_history (
--   unit_id,
--   change_reason,
--   previous_data,
--   new_data,
--   changed_at
-- )
-- select
--   unit_record_id,
--   'Riparim integriteti rezervimi',
--   previous_snapshot,
--   new_snapshot,
--   now()
-- from updated;
--
-- commit;

-- ---------------------------------------------------------------------------
-- Section 3: Postflight verification
-- ---------------------------------------------------------------------------

select
  u.unit_id,
  u.status,
  u.reservation_expires_at,
  u.updated_at
from public.units u
where u.unit_id in ('BA-02', 'BA-07', 'BB-08', 'BC-07')
order by u.unit_id;

select
  u.unit_id,
  ur.id as reservation_id,
  ur.status,
  ur.expires_at,
  ur.contact_id,
  ur.showing_id
from public.unit_reservations ur
join public.units u
  on u.id = ur.unit_id
where u.unit_id in ('BA-07', 'BC-07')
order by u.unit_id, ur.created_at;

select
  u.unit_id,
  h.change_reason,
  h.changed_at
from public.unit_history h
join public.units u
  on u.id = h.unit_id
where u.unit_id in ('BA-02', 'BA-07', 'BB-08', 'BC-07')
order by h.changed_at desc;
