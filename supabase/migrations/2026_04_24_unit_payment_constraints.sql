-- Migration: Unit payment value constraints
-- Date: 2026-04-24
-- Purpose:
-- 1. Enforce positive payment amounts at the database boundary
-- 2. Enforce positive installment numbers at the database boundary
-- 3. Keep persisted paid/unpaid status aligned with paid_date

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.unit_payments'::regclass
      and conname = 'unit_payments_amount_positive_check'
  ) then
    alter table public.unit_payments
      add constraint unit_payments_amount_positive_check
      check (amount > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.unit_payments'::regclass
      and conname = 'unit_payments_installment_number_positive_check'
  ) then
    alter table public.unit_payments
      add constraint unit_payments_installment_number_positive_check
      check (installment_number > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.unit_payments'::regclass
      and conname = 'unit_payments_paid_status_date_check'
  ) then
    alter table public.unit_payments
      add constraint unit_payments_paid_status_date_check
      check (
        (status = 'E paguar' and paid_date is not null)
        or (status = 'E papaguar' and paid_date is null)
      );
  end if;
end $$;
