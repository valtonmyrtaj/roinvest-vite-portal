alter table public.crm_showings
  add column if not exists manual_contact_name text,
  add column if not exists manual_contact_phone text;

comment on column public.crm_showings.manual_contact_name is
  'Manual client name stored on a showing when the showing is not linked to a saved CRM contact.';

comment on column public.crm_showings.manual_contact_phone is
  'Manual client phone stored on a showing when the showing is not linked to a saved CRM contact.';
