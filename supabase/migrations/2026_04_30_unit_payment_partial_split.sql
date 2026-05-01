-- Migration: Split partial installment receipts into a new remaining installment
-- Date: 2026-04-30
-- Purpose:
-- 1. Keep payment registration atomic when a buyer pays less than a scheduled installment
-- 2. Convert the paid part into a completed installment obligation
-- 3. Insert the remaining balance as the next installment with a user-selected due date
-- 4. Shift later installment numbers safely around the unique (sale_id, installment_number) index

create or replace function public.register_payment_receipt_with_split(
  p_payment_id uuid,
  p_amount numeric,
  p_paid_date date,
  p_notes text default null,
  p_remainder_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payment public.unit_payments%rowtype;
  v_existing_receipts numeric;
  v_remaining_before numeric;
  v_remainder_amount numeric;
  v_remainder_payment_id uuid;
  v_offset integer := 10000;
begin
  if p_payment_id is null then
    raise exception 'Kësti nuk është zgjedhur.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Shuma e pagesës duhet të jetë më e madhe se 0.';
  end if;

  if p_paid_date is null then
    raise exception 'Data e pagesës është e detyrueshme.';
  end if;

  if p_paid_date > current_date then
    raise exception 'Data e pagesës nuk mund të jetë në të ardhmen.';
  end if;

  select *
  into v_payment
  from public.unit_payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Kësti nuk ekziston.';
  end if;

  select coalesce(sum(r.amount), 0)
  into v_existing_receipts
  from public.unit_payment_receipts r
  where r.payment_id = p_payment_id;

  v_remaining_before := greatest(v_payment.amount - v_existing_receipts, 0);

  if round(v_remaining_before::numeric, 2) <= 0 then
    raise exception 'Kësti është paguar tashmë.';
  end if;

  if round(p_amount::numeric, 2) > round(v_remaining_before::numeric, 2) then
    raise exception 'Pagesa e tejkalon shumën e mbetur të këstit.';
  end if;

  v_remainder_amount := round((v_remaining_before - p_amount)::numeric, 2);

  if v_remainder_amount > 0 then
    if p_remainder_due_date is null then
      raise exception 'Data e këstit të mbetur është e detyrueshme.';
    end if;

    if p_remainder_due_date < p_paid_date then
      raise exception 'Data e këstit të mbetur nuk mund të jetë para datës së pagesës.';
    end if;

    update public.unit_payments
    set
      amount = round((v_existing_receipts + p_amount)::numeric, 2),
      status = 'E papaguar',
      paid_date = null
    where id = v_payment.id;

    insert into public.unit_payment_receipts (
      payment_id,
      amount,
      paid_date,
      notes
    ) values (
      v_payment.id,
      p_amount,
      p_paid_date,
      p_notes
    );

    update public.unit_payments p
    set installment_number = p.installment_number + v_offset
    where p.id <> v_payment.id
      and p.installment_number > v_payment.installment_number
      and (
        (v_payment.sale_id is not null and p.sale_id = v_payment.sale_id)
        or (v_payment.sale_id is null and p.sale_id is null and p.unit_id = v_payment.unit_id)
      );

    update public.unit_payments p
    set installment_number = p.installment_number - (v_offset - 1)
    where p.installment_number > v_payment.installment_number + v_offset
      and (
        (v_payment.sale_id is not null and p.sale_id = v_payment.sale_id)
        or (v_payment.sale_id is null and p.sale_id is null and p.unit_id = v_payment.unit_id)
      );

    insert into public.unit_payments (
      unit_id,
      sale_id,
      installment_number,
      amount,
      due_date,
      paid_date,
      status,
      notes
    ) values (
      v_payment.unit_id,
      v_payment.sale_id,
      v_payment.installment_number + 1,
      v_remainder_amount,
      p_remainder_due_date,
      null,
      'E papaguar',
      'Mbetje automatike nga kësti #' || v_payment.installment_number::text
    )
    returning id into v_remainder_payment_id;

    return v_remainder_payment_id;
  end if;

  insert into public.unit_payment_receipts (
    payment_id,
    amount,
    paid_date,
    notes
  ) values (
    v_payment.id,
    p_amount,
    p_paid_date,
    p_notes
  );

  return null;
end;
$function$;

grant execute on function public.register_payment_receipt_with_split(uuid, numeric, date, text, date)
  to anon, authenticated, service_role;
