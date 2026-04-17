-- Migration: complete_unit_sale patch
-- Date: 2026-04-16
-- Purpose:
-- 1. Preserve listing price (units.price)
-- 2. Write final price into units.sale_price
-- 3. Add unit_history audit on sale completion

CREATE OR REPLACE FUNCTION public.complete_unit_sale(
  p_unit_id uuid,
  p_sale_date date,
  p_final_price numeric,
  p_buyer_name text,
  p_payment_type text,
  p_notes text DEFAULT NULL::text,
  p_crm_lead_id uuid DEFAULT NULL::uuid,
  p_installments jsonb DEFAULT '[]'::jsonb,
  p_showing_id uuid DEFAULT NULL::uuid,
  p_reservation_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    p_payment_type,
    v_effective_lead_id,
    nullif(trim(coalesce(p_notes, '')), ''),
    'active',
    p_showing_id,
    p_reservation_id
  )
  returning id into v_sale_id;

  -- ✅ UPDATED PART: preserve listing price + write history
  WITH prev AS (
    SELECT to_jsonb(u.*) AS snapshot
    FROM public.units u
    WHERE u.id = p_unit_id
    FOR UPDATE
  ),
  updated AS (
    UPDATE public.units
    SET
      status = 'E shitur',
      sale_price = p_final_price,
      sale_date = p_sale_date,
      updated_at = now()
    WHERE id = p_unit_id
    RETURNING to_jsonb(public.units.*) AS snapshot
  )
  INSERT INTO public.unit_history (
    unit_id,
    change_reason,
    previous_data,
    new_data,
    changed_at
  )
  SELECT
    p_unit_id,
    'sale_completed',
    prev.snapshot,
    updated.snapshot,
    now()
  FROM prev, updated;

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