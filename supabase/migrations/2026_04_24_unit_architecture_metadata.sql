-- Migration: unit architecture metadata
-- Date: 2026-04-24
-- Purpose:
-- 1. Add optional architectural facts to units without changing existing flows.
-- 2. Keep values nullable so current inventory remains valid.
-- 3. Preserve a flat shape for fast registry/detail reads; floorplan assets can be split later.

alter table public.units
  add column if not exists orientation text null,
  add column if not exists floorplan_code text null,
  add column if not exists balcony_area numeric null,
  add column if not exists terrace_area numeric null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.units'::regclass
      and conname = 'units_orientation_check'
  ) then
    alter table public.units
      add constraint units_orientation_check
      check (
        orientation is null
        or orientation in (
          'Veri',
          'Veri-Lindje',
          'Lindje',
          'Jug-Lindje',
          'Jug',
          'Jug-Perëndim',
          'Perëndim',
          'Veri-Perëndim'
        )
      );
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.units'::regclass
      and conname = 'units_balcony_area_non_negative_check'
  ) then
    alter table public.units
      drop constraint units_balcony_area_non_negative_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.units'::regclass
      and conname = 'units_balcony_area_positive_check'
  ) then
    alter table public.units
      add constraint units_balcony_area_positive_check
      check (balcony_area is null or balcony_area > 0);
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.units'::regclass
      and conname = 'units_terrace_area_non_negative_check'
  ) then
    alter table public.units
      drop constraint units_terrace_area_non_negative_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.units'::regclass
      and conname = 'units_terrace_area_positive_check'
  ) then
    alter table public.units
      add constraint units_terrace_area_positive_check
      check (terrace_area is null or terrace_area > 0);
  end if;
end $$;

comment on column public.units.orientation is 'Optional unit orientation, e.g. Veri-Perëndim.';
comment on column public.units.floorplan_code is 'Optional internal floorplan/reference code. File assets should use a future related table.';
comment on column public.units.balcony_area is 'Optional balcony area in square meters.';
comment on column public.units.terrace_area is 'Optional terrace area in square meters.';
