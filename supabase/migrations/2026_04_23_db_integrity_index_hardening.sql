-- Migration: DB integrity + index hardening
-- Date: 2026-04-23
-- Purpose:
-- 1. Enforce the singular-active-record guarantees the app already assumes
-- 2. Add targeted indexes for reservation expiry, history reads, and payment lookups
-- 3. Improve concurrency safety without broad schema churn

-- Units: the human-facing unit code must stay unique.
CREATE UNIQUE INDEX IF NOT EXISTS units_unit_id_unique_idx
  ON public.units (unit_id);

-- Reservations: the app assumes one active reservation per unit and per showing.
CREATE UNIQUE INDEX IF NOT EXISTS unit_reservations_one_active_per_unit_idx
  ON public.unit_reservations (unit_id)
  WHERE status = 'Aktive';

CREATE UNIQUE INDEX IF NOT EXISTS unit_reservations_one_active_per_showing_idx
  ON public.unit_reservations (showing_id)
  WHERE status = 'Aktive'
    AND showing_id IS NOT NULL;

-- Reservation expiry automation scans active reservations by expiry timestamp.
CREATE INDEX IF NOT EXISTS unit_reservations_active_expires_at_idx
  ON public.unit_reservations (expires_at)
  WHERE status = 'Aktive'
    AND expires_at IS NOT NULL;

-- CRM reservation context reads show-linked reservations ordered by newest updates.
CREATE INDEX IF NOT EXISTS unit_reservations_showing_updated_at_desc_idx
  ON public.unit_reservations (updated_at DESC)
  WHERE showing_id IS NOT NULL;

-- Sales: the app overlays a single active sale per unit and may attach it to a reservation/showing.
CREATE UNIQUE INDEX IF NOT EXISTS unit_sales_one_active_per_unit_idx
  ON public.unit_sales (unit_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS unit_sales_one_active_per_reservation_idx
  ON public.unit_sales (reservation_id)
  WHERE status = 'active'
    AND reservation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unit_sales_one_active_per_showing_idx
  ON public.unit_sales (showing_id)
  WHERE status = 'active'
    AND showing_id IS NOT NULL;

-- Payments: every installment number should be unique within its sale, and
-- reads hit unit/order and due-date patterns directly.
CREATE UNIQUE INDEX IF NOT EXISTS unit_payments_sale_installment_unique_idx
  ON public.unit_payments (sale_id, installment_number)
  WHERE sale_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS unit_payments_unit_installment_idx
  ON public.unit_payments (unit_id, installment_number);

CREATE INDEX IF NOT EXISTS unit_payments_due_date_idx
  ON public.unit_payments (due_date);

-- History: unit detail and dashboard notification surfaces read by unit and by recency.
CREATE INDEX IF NOT EXISTS unit_history_unit_changed_at_desc_idx
  ON public.unit_history (unit_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS unit_history_changed_at_desc_idx
  ON public.unit_history (changed_at DESC);
