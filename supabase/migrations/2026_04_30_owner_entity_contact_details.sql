alter table public.owner_entities
  add column if not exists contact_person text,
  add column if not exists phone text,
  add column if not exists notes text;

comment on column public.owner_entities.contact_person is
  'Optional contact person for land owners and construction companies.';
comment on column public.owner_entities.phone is
  'Optional formatted phone number for the owner entity.';
comment on column public.owner_entities.notes is
  'Optional operational note for the owner entity contact.';
