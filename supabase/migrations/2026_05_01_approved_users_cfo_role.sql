-- Migration: approved users CFO role
-- Date: 2026-05-01
-- Purpose: Allow approved portal users to hold the read-only CFO access role.

alter table public.approved_users
drop constraint if exists approved_users_role_check;

alter table public.approved_users
add constraint approved_users_role_check
check (role = any (array[
  'sales_director'::text,
  'investor'::text,
  'cfo'::text
]));
