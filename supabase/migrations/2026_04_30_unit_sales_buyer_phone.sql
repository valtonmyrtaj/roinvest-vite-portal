-- Add buyer phone to the canonical sale record and expose it through sale RPCs.

alter table public.unit_sales
  add column if not exists buyer_phone text;

comment on column public.unit_sales.buyer_phone is
  'Buyer phone captured when a unit sale is completed.';

update public.unit_sales us
set buyer_phone = nullif(trim(l.phone), '')
from public.crm_leads l
where us.crm_lead_id = l.id
  and nullif(trim(coalesce(us.buyer_phone, '')), '') is null
  and nullif(trim(coalesce(l.phone, '')), '') is not null;

drop function if exists public.complete_unit_sale(
  uuid,
  date,
  numeric,
  text,
  text,
  text,
  uuid,
  jsonb,
  uuid,
  uuid
);

create or replace function public.complete_unit_sale(
  p_unit_id uuid,
  p_sale_date date,
  p_final_price numeric,
  p_buyer_name text,
  p_payment_type text,
  p_buyer_phone text default null::text,
  p_notes text default null::text,
  p_crm_lead_id uuid default null::uuid,
  p_installments jsonb default '[]'::jsonb,
  p_showing_id uuid default null::uuid,
  p_reservation_id uuid default null::uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sale_id uuid;
  v_existing_sale_id uuid;
  v_installment jsonb;
  v_total numeric := 0;
  v_index int := 0;
  v_amount numeric;
  v_due_date date;
  v_notes text;
  v_effective_lead_id uuid;
  v_buyer_phone text;
begin
  if p_unit_id is null then
    raise exception 'unit_id është i detyrueshëm';
  end if;

  if p_sale_date is null then
    raise exception 'Data e shitjes është e detyrueshme';
  end if;

  if p_final_price is null or p_final_price <= 0 then
    raise exception 'Çmimi final duhet të jetë më i madh se 0';
  end if;

  if trim(coalesce(p_buyer_name, '')) = '' then
    raise exception 'Blerësi / klienti është i detyrueshëm';
  end if;

  if p_payment_type not in ('Pagesë e plotë', 'Me këste') then
    raise exception 'Lloji i pagesës është i pavlefshëm';
  end if;

  v_buyer_phone := nullif(trim(coalesce(p_buyer_phone, '')), '');

  select id
  into v_existing_sale_id
  from public.unit_sales
  where unit_id = p_unit_id
    and status = 'active'
  limit 1;

  if v_existing_sale_id is not null then
    raise exception 'Njësia ka tashmë një shitje aktive';
  end if;

  if p_crm_lead_id is not null then
    v_effective_lead_id := p_crm_lead_id;
  elsif p_showing_id is not null then
    select contact_id
    into v_effective_lead_id
    from public.crm_showings
    where id = p_showing_id;
  elsif p_reservation_id is not null then
    select contact_id
    into v_effective_lead_id
    from public.unit_reservations
    where id = p_reservation_id;
  else
    v_effective_lead_id := null;
  end if;

  if v_buyer_phone is null and v_effective_lead_id is not null then
    select nullif(trim(coalesce(phone, '')), '')
    into v_buyer_phone
    from public.crm_leads
    where id = v_effective_lead_id;
  end if;

  if v_buyer_phone is null and p_showing_id is not null then
    select nullif(trim(coalesce(manual_contact_phone, '')), '')
    into v_buyer_phone
    from public.crm_showings
    where id = p_showing_id;
  end if;

  if p_reservation_id is not null then
    perform 1
    from public.unit_reservations
    where id = p_reservation_id
      and unit_id = p_unit_id
      and status = 'Aktive';

    if not found then
      raise exception 'Rezervimi i dhënë nuk është aktiv ose nuk i përket njësisë';
    end if;
  end if;

  insert into public.unit_sales (
    unit_id,
    sale_date,
    final_price,
    buyer_name,
    buyer_phone,
    payment_type,
    crm_lead_id,
    notes,
    status,
    showing_id,
    reservation_id
  ) values (
    p_unit_id,
    p_sale_date,
    p_final_price,
    trim(p_buyer_name),
    v_buyer_phone,
    p_payment_type,
    v_effective_lead_id,
    nullif(trim(coalesce(p_notes, '')), ''),
    'active',
    p_showing_id,
    p_reservation_id
  )
  returning id into v_sale_id;

  with prev as (
    select to_jsonb(u.*) as snapshot
    from public.units u
    where u.id = p_unit_id
    for update
  ),
  updated as (
    update public.units
    set
      status = 'E shitur',
      sale_price = p_final_price,
      sale_date = p_sale_date,
      reservation_expires_at = null,
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
    'sale_completed',
    prev.snapshot,
    updated.snapshot,
    now()
  from prev, updated;

  if p_payment_type = 'Pagesë e plotë' then
    insert into public.unit_payments (
      sale_id,
      unit_id,
      installment_number,
      amount,
      due_date,
      paid_date,
      status,
      notes
    ) values (
      v_sale_id,
      p_unit_id,
      1,
      p_final_price,
      p_sale_date,
      p_sale_date,
      'E paguar',
      'Pagesë e plotë'
    );
  else
    if jsonb_typeof(p_installments) is distinct from 'array' then
      raise exception 'Installment payload duhet të jetë array JSON';
    end if;

    if jsonb_array_length(p_installments) = 0 then
      raise exception 'Për pagesë me këste kërkohet të paktën një këst';
    end if;

    for v_installment in
      select *
      from jsonb_array_elements(p_installments)
    loop
      v_index := v_index + 1;
      v_amount := coalesce((v_installment->>'amount')::numeric, 0);
      v_due_date := (v_installment->>'due_date')::date;
      v_notes := nullif(trim(coalesce(v_installment->>'notes', '')), '');

      if v_amount <= 0 then
        raise exception 'Shuma e këstit % duhet të jetë > 0', v_index;
      end if;

      if v_due_date is null then
        raise exception 'Data e skadimit mungon te kësti %', v_index;
      end if;

      v_total := v_total + v_amount;

      insert into public.unit_payments (
        sale_id,
        unit_id,
        installment_number,
        amount,
        due_date,
        paid_date,
        status,
        notes
      ) values (
        v_sale_id,
        p_unit_id,
        coalesce((v_installment->>'installment_number')::int, v_index),
        v_amount,
        v_due_date,
        null,
        'E papaguar',
        v_notes
      );
    end loop;

    if round(v_total::numeric, 2) <> round(p_final_price::numeric, 2) then
      raise exception 'Totali i kësteve duhet të jetë i barabartë me çmimin final';
    end if;
  end if;

  if v_effective_lead_id is not null then
    update public.crm_leads
    set
      status = 'Konvertuar',
      updated_at = now()
    where id = v_effective_lead_id;
  end if;

  if p_reservation_id is not null then
    update public.unit_reservations
    set status = 'E konvertuar'
    where id = p_reservation_id;
  end if;

  if p_showing_id is not null then
    update public.crm_showings
    set
      status = case
        when status = 'E planifikuar' then 'E kryer'
        else status
      end,
      outcome = 'Bleu',
      contact_id = coalesce(contact_id, v_effective_lead_id),
      unit_record_id = coalesce(unit_record_id, p_unit_id)
    where id = p_showing_id;
  end if;

  return v_sale_id;
end;
$function$;

drop function if exists public.list_sales_upcoming_payments(text);

create or replace function public.list_sales_upcoming_payments(
  p_owner_scope text default 'all'::text
)
returns table(
  payment_id uuid,
  payment_unit_id uuid,
  payment_sale_id uuid,
  payment_installment_number integer,
  payment_amount numeric,
  payment_paid_amount numeric,
  payment_remaining_amount numeric,
  payment_due_date date,
  payment_paid_date date,
  payment_status text,
  payment_notes text,
  payment_created_at timestamp with time zone,
  unit_id uuid,
  unit_code text,
  unit_block text,
  unit_type text,
  unit_level text,
  unit_size numeric,
  unit_price numeric,
  unit_status text,
  unit_owner_category text,
  unit_owner_name text,
  unit_created_at timestamp with time zone,
  unit_updated_at timestamp with time zone,
  sale_final_price numeric,
  sale_date date,
  sale_buyer_name text,
  sale_buyer_phone text,
  sale_payment_type text,
  sale_crm_lead_id uuid
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with normalized_scope as (
    select nullif(trim(coalesce(p_owner_scope, 'all')), '') as owner_scope
  ),
  receipt_totals as (
    select
      r.payment_id,
      coalesce(sum(r.amount), 0)::numeric as paid_amount
    from public.unit_payment_receipts r
    group by r.payment_id
  )
  select
    p.id as payment_id,
    p.unit_id::uuid as payment_unit_id,
    p.sale_id as payment_sale_id,
    p.installment_number as payment_installment_number,
    p.amount as payment_amount,
    coalesce(rt.paid_amount, 0)::numeric as payment_paid_amount,
    greatest(p.amount - coalesce(rt.paid_amount, 0), 0)::numeric as payment_remaining_amount,
    p.due_date as payment_due_date,
    p.paid_date as payment_paid_date,
    p.status as payment_status,
    p.notes as payment_notes,
    p.created_at as payment_created_at,
    u.id as unit_id,
    u.unit_id as unit_code,
    u.block as unit_block,
    u.type as unit_type,
    u.level as unit_level,
    u.size as unit_size,
    u.price as unit_price,
    u.status as unit_status,
    u.owner_category as unit_owner_category,
    u.owner_name as unit_owner_name,
    u.created_at as unit_created_at,
    u.updated_at as unit_updated_at,
    s.final_price as sale_final_price,
    s.sale_date as sale_date,
    s.buyer_name as sale_buyer_name,
    s.buyer_phone as sale_buyer_phone,
    s.payment_type as sale_payment_type,
    s.crm_lead_id as sale_crm_lead_id
  from public.unit_payments p
  join public.units u on u.id = p.unit_id::uuid
  left join public.unit_sales s
    on s.unit_id = u.id
    and s.status = 'active'
  left join receipt_totals rt
    on rt.payment_id = p.id
  cross join normalized_scope ns
  where greatest(p.amount - coalesce(rt.paid_amount, 0), 0) > 0
    and u.status = 'E shitur'
    and (
      ns.owner_scope is null
      or ns.owner_scope = 'all'
      or u.owner_category = ns.owner_scope
    )
  order by p.due_date asc, u.unit_id asc, p.installment_number asc;
$function$;
