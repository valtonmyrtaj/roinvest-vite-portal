alter table public.units
  add column if not exists has_storage boolean not null default false;
