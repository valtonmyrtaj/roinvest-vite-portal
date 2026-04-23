-- Preflight: DB integrity + index hardening
-- Date: 2026-04-23
-- Purpose:
-- 1. Detect duplicate states that would block the unique indexes
-- 2. Make the live migration apply predictable and reviewable

-- 1. Unit code must be unique.
select
  unit_id,
  count(*) as duplicate_count
from public.units
group by unit_id
having count(*) > 1
order by duplicate_count desc, unit_id asc;

-- 2. At most one active reservation per unit.
select
  unit_id,
  count(*) as active_reservation_count
from public.unit_reservations
where status = 'Aktive'
group by unit_id
having count(*) > 1
order by active_reservation_count desc, unit_id asc;

-- 3. At most one active reservation per showing.
select
  showing_id,
  count(*) as active_reservation_count
from public.unit_reservations
where status = 'Aktive'
  and showing_id is not null
group by showing_id
having count(*) > 1
order by active_reservation_count desc, showing_id asc;

-- 4. At most one active sale per unit.
select
  unit_id,
  count(*) as active_sale_count
from public.unit_sales
where status = 'active'
group by unit_id
having count(*) > 1
order by active_sale_count desc, unit_id asc;

-- 5. At most one active sale per reservation.
select
  reservation_id,
  count(*) as active_sale_count
from public.unit_sales
where status = 'active'
  and reservation_id is not null
group by reservation_id
having count(*) > 1
order by active_sale_count desc, reservation_id asc;

-- 6. At most one active sale per showing.
select
  showing_id,
  count(*) as active_sale_count
from public.unit_sales
where status = 'active'
  and showing_id is not null
group by showing_id
having count(*) > 1
order by active_sale_count desc, showing_id asc;

-- 7. Installment numbers must be unique within a sale.
select
  sale_id,
  installment_number,
  count(*) as duplicate_count
from public.unit_payments
where sale_id is not null
group by sale_id, installment_number
having count(*) > 1
order by duplicate_count desc, sale_id asc, installment_number asc;
