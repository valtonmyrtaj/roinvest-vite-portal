alter table public.crm_showings
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text;

create index if not exists crm_showings_archived_at_idx
  on public.crm_showings (archived_at)
  where archived_at is not null;

comment on column public.crm_showings.archived_at is
  'Timestamp used to hide a showing from the active CRM workflow without deleting its audit links.';

comment on column public.crm_showings.archive_reason is
  'Optional operator note explaining why a showing was archived.';
