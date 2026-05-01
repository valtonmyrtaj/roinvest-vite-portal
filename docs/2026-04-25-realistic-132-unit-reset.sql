-- ============================================================================
-- Roinvest / UF Partners Portal
-- Realistic 132-Unit Demo Data Reset
-- ============================================================================
--
-- Purpose:
-- - Remove the previous unrealistic dummy data.
-- - Seed one coherent synthetic operating dataset through 30 April 2026.
-- - Keep CRM activity investor-side only.
--
-- Portfolio model:
-- - 132 total units, split evenly across three blocks.
-- - Blloku A: BA-01 through BA-44.
-- - Blloku B: BB-01 through BB-44.
-- - Blloku C: BC-01 through BC-44.
-- - Ownership:
--   - Investitor: 68 units
--   - Pronarët e tokës: 34 units
--   - Kompani ndërtimore: 30 units
--
-- Business rules encoded:
-- - Garazhë and Lokal are assigned only to Investitor or Pronarët e tokës.
-- - Reservations are only for Investitor units.
-- - Pronarët e tokës has 2 sold units (~5%).
-- - Kompani ndërtimore has 3 sold units (10%).
-- - Jan-Apr 2026 sales: 29 total, at least 5 per month.
-- - Payment mix: 26 full-payment sales, 3 installment-plan sales.
-- - Demo installment plans never exceed six months from sale date.
-- - Reservations exist in every month Jan-Apr, minimum 3 per month.
-- - Active reservations are April-only and expire within two weeks.
-- - Marketing includes only Facebook, Billboard, and Radio.
-- - Facebook spend is EUR 500 per month.
-- - Billboard appears in 2 months, Radio appears in 2 months.
-- - CRM daily log has one row per day from 2026-01-01 to 2026-04-30.
--
-- Scope:
-- - Destructive reset of demo operational data.
-- - Clears:
--   unit_payment_receipts, unit_payments, unit_sales, unit_reservations,
--   unit_history, crm_showings, crm_leads, crm_daily_log, marketing_data,
--   marketing_offline, owner_entities, units.
-- - Does NOT touch approved users, auth, or dashboard_snapshots.
--
-- To run intentionally with psql:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v reset_ack=reset-realistic-investor-demo \
--     -f docs/2026-04-25-realistic-132-unit-reset.sql
-- ============================================================================

BEGIN;

\if :{?reset_ack}
SET LOCAL roinvest.reset_ack = :'reset_ack';
\endif

SET LOCAL search_path TO public;
SET LOCAL lock_timeout TO '10s';
SET LOCAL statement_timeout TO '5min';
SET LOCAL idle_in_transaction_session_timeout TO '5min';

DO $guard$
BEGIN
  IF nullif(current_setting('roinvest.reset_ack', true), '') IS DISTINCT FROM 'reset-realistic-investor-demo' THEN
    RAISE EXCEPTION
      'Reset blocked. Pass -v reset_ack=reset-realistic-investor-demo after taking a backup.';
  END IF;
END;
$guard$;

-- Unit-linked and demo operating data first. This is intentionally explicit:
-- no auth tables, approved users, or dashboard snapshots are touched.
DELETE FROM public.unit_payment_receipts;
DELETE FROM public.unit_payments;
DELETE FROM public.unit_sales;
DELETE FROM public.unit_reservations;
DELETE FROM public.unit_history;
DELETE FROM public.crm_showings;
DELETE FROM public.crm_leads;
DELETE FROM public.crm_daily_log;
DELETE FROM public.marketing_data;
DELETE FROM public.marketing_offline;
DELETE FROM public.owner_entities;
DELETE FROM public.units;

-- ============================================================================
-- Owner entities
-- ============================================================================

INSERT INTO public.owner_entities (
  category,
  name,
  contact_person,
  phone,
  notes,
  created_at,
  updated_at
)
VALUES
  ('Investitor', 'UF Partners', 'Valton Myrtaj', '+383 44 210 115', 'Entitet investitor për projektin', '2026-01-01 08:00:00+00', '2026-01-01 08:00:00+00'),
  ('Pronarët e tokës', 'Familja Gashi', 'Arsim Gashi', '+383 49 310 442', 'Pjesëmarrje nga marrëveshja e tokës', '2026-01-01 08:05:00+00', '2026-01-01 08:05:00+00'),
  ('Pronarët e tokës', 'Familja Krasniqi', 'Besa Krasniqi', '+383 44 618 227', 'Pjesëmarrje nga marrëveshja e tokës', '2026-01-01 08:10:00+00', '2026-01-01 08:10:00+00'),
  ('Pronarët e tokës', 'Familja Berisha', 'Naim Berisha', '+383 45 705 931', 'Pjesëmarrje nga marrëveshja e tokës', '2026-01-01 08:15:00+00', '2026-01-01 08:15:00+00'),
  ('Pronarët e tokës', 'Familja Selmani', 'Mimoza Selmani', '+383 48 224 618', 'Pjesëmarrje nga marrëveshja e tokës', '2026-01-01 08:20:00+00', '2026-01-01 08:20:00+00'),
  ('Kompani ndërtimore', 'Arbëria Ndërtim', 'Ilir Hoxha', '+383 44 905 144', 'Njësi nga kompensimi ndërtimor', '2026-01-01 08:25:00+00', '2026-01-01 08:25:00+00'),
  ('Kompani ndërtimore', 'Dardania Construction', 'Mentor Shala', '+383 49 744 318', 'Njësi nga kompensimi ndërtimor', '2026-01-01 08:30:00+00', '2026-01-01 08:30:00+00'),
  ('Kompani ndërtimore', 'Euro-Bau Group', 'Luan Rexhepi', '+383 45 417 802', 'Njësi nga kompensimi ndërtimor', '2026-01-01 08:35:00+00', '2026-01-01 08:35:00+00');

-- ============================================================================
-- Units
-- ============================================================================

WITH block_seed AS (
  SELECT *
  FROM (
    VALUES
      (1, 'BA'::text, 'Blloku A'::text),
      (2, 'BB'::text, 'Blloku B'::text),
      (3, 'BC'::text, 'Blloku C'::text)
  ) AS blocks(block_no, block_code, block_label)
),
raw_units AS (
  SELECT
    b.block_no,
    b.block_code,
    b.block_label,
    gs.seq,
    b.block_code || '-' || lpad(gs.seq::text, 2, '0') AS unit_code
  FROM block_seed b
  CROSS JOIN generate_series(1, 44) AS gs(seq)
),
typed_units AS (
  SELECT
    *,
    CASE
      WHEN seq <= 30 THEN 'Banesë'
      WHEN seq <= 34 THEN 'Lokal'
      WHEN seq <= 42 THEN 'Garazhë'
      ELSE 'Penthouse'
    END AS unit_type,
    CASE
      WHEN seq <= 30 THEN 'Kati ' || (((seq - 1) / 5) + 1)::int::text
      WHEN seq <= 34 THEN 'Përdhesë'
      WHEN seq <= 42 THEN 'Nëntokë'
      ELSE 'Penthouse'
    END AS unit_level,
    CASE
      WHEN seq <= 30 THEN ((seq - 1) / 5) + 1
      ELSE NULL::int
    END AS floor_no,
    CASE
      WHEN seq <= 30 THEN ((seq - 1) % 5) + 1
      WHEN seq <= 34 THEN seq - 30
      WHEN seq <= 42 THEN seq - 34
      ELSE seq - 42
    END AS slot_no
  FROM raw_units
),
sized_units AS (
  SELECT
    *,
    CASE
      WHEN unit_type = 'Banesë' AND block_code IN ('BA', 'BB') THEN
        (ARRAY[58.4, 67.2, 82.8, 91.6, 104.3])[slot_no]::numeric + (floor_no - 1) * 0.4
      WHEN unit_type = 'Banesë' THEN
        (ARRAY[56.8, 64.9, 79.4, 88.7, 112.5])[slot_no]::numeric + (floor_no - 1) * 0.4
      WHEN unit_type = 'Lokal' THEN
        (ARRAY[54.0, 68.5, 82.0, 96.0])[slot_no]::numeric + (block_no - 1) * 1.5
      WHEN unit_type = 'Garazhë' THEN
        (ARRAY[13.0, 13.5, 14.0, 14.5, 15.0, 16.0, 17.0, 18.0])[slot_no]::numeric
      WHEN slot_no = 1 THEN 136.5::numeric + (block_no - 1) * 2.5
      ELSE 154.2::numeric + (block_no - 1) * 2.5
    END AS unit_size
  FROM typed_units
),
owned_units AS (
  SELECT
    *,
    CASE
      WHEN unit_type = 'Banesë' AND seq = ANY(ARRAY[3, 6, 9, 12, 15, 18, 21, 24, 27, 30]) THEN 'Kompani ndërtimore'
      WHEN block_code = 'BA' AND unit_type = 'Banesë' AND seq = ANY(ARRAY[2, 7, 13, 19, 25, 29]) THEN 'Pronarët e tokës'
      WHEN block_code IN ('BB', 'BC') AND unit_type = 'Banesë' AND seq = ANY(ARRAY[2, 4, 7, 13, 19, 25, 29]) THEN 'Pronarët e tokës'
      WHEN block_code = 'BA' AND unit_type = 'Lokal' AND seq = ANY(ARRAY[31, 33]) THEN 'Pronarët e tokës'
      WHEN block_code = 'BB' AND unit_type = 'Lokal' AND seq = 32 THEN 'Pronarët e tokës'
      WHEN block_code = 'BC' AND unit_type = 'Lokal' AND seq = 34 THEN 'Pronarët e tokës'
      WHEN block_code = 'BA' AND unit_type = 'Garazhë' AND seq = ANY(ARRAY[35, 38, 41]) THEN 'Pronarët e tokës'
      WHEN block_code = 'BB' AND unit_type = 'Garazhë' AND seq = ANY(ARRAY[36, 39, 42]) THEN 'Pronarët e tokës'
      WHEN block_code = 'BC' AND unit_type = 'Garazhë' AND seq = ANY(ARRAY[35, 40]) THEN 'Pronarët e tokës'
      WHEN block_code = 'BA' AND unit_type = 'Penthouse' AND seq = 43 THEN 'Pronarët e tokës'
      WHEN block_code = 'BB' AND unit_type = 'Penthouse' AND seq = 44 THEN 'Pronarët e tokës'
      ELSE 'Investitor'
    END AS owner_category
  FROM sized_units
),
final_units AS (
  SELECT
    *,
    CASE owner_category
      WHEN 'Investitor' THEN 'UF Partners'
      WHEN 'Pronarët e tokës' THEN
        (ARRAY['Familja Gashi', 'Familja Krasniqi', 'Familja Berisha', 'Familja Selmani'])[((seq + block_no - 2) % 4) + 1]
      ELSE
        (ARRAY['Arbëria Ndërtim', 'Dardania Construction', 'Euro-Bau Group'])[((seq + block_no - 2) % 3) + 1]
    END AS owner_name,
    CASE
      WHEN unit_type = 'Garazhë' THEN 10500 + (block_no - 1) * 500 + (slot_no - 1) * 350
      WHEN unit_type = 'Lokal' THEN round((unit_size * 1850) / 500) * 500
      WHEN unit_type = 'Penthouse' THEN round((unit_size * 1650) / 1000) * 1000
      WHEN unit_size >= 100 THEN round((unit_size * 1480) / 1000) * 1000
      WHEN unit_size >= 80 THEN round((unit_size * 1420) / 1000) * 1000
      ELSE round((unit_size * 1360) / 1000) * 1000
    END AS listing_price,
    CASE ((seq + block_no - 2) % 8)
      WHEN 0 THEN 'Lindje'
      WHEN 1 THEN 'Jug-Lindje'
      WHEN 2 THEN 'Jug'
      WHEN 3 THEN 'Jug-Perëndim'
      WHEN 4 THEN 'Perëndim'
      WHEN 5 THEN 'Veri-Perëndim'
      WHEN 6 THEN 'Veri'
      ELSE 'Veri-Lindje'
    END AS orientation
  FROM owned_units
)
INSERT INTO public.units (
  unit_id,
  block,
  type,
  level,
  size,
  price,
  status,
  owner_category,
  owner_name,
  reservation_expires_at,
  sale_date,
  sale_price,
  buyer_name,
  buyer_lead_id,
  notes,
  bedrooms,
  bathrooms,
  toilets,
  orientation,
  floorplan_code,
  balcony_area,
  terrace_area,
  has_storage,
  created_at,
  updated_at
)
SELECT
  unit_code,
  block_label,
  unit_type,
  unit_level,
  round(unit_size, 1),
  listing_price,
  'Në dispozicion',
  owner_category,
  owner_name,
  NULL::timestamptz,
  NULL::date,
  NULL::numeric,
  NULL::text,
  NULL::uuid,
  CASE
    WHEN unit_type = 'Lokal' THEN 'Lokal në përdhesë me qasje direkte'
    WHEN unit_type = 'Garazhë' THEN 'Garazhë e dedikuar'
    WHEN unit_type = 'Penthouse' THEN 'Penthouse me tarracë private'
    ELSE NULL::text
  END,
  CASE
    WHEN unit_type = 'Banesë' AND unit_size < 70 THEN 1
    WHEN unit_type = 'Banesë' AND unit_size < 100 THEN 2
    WHEN unit_type = 'Banesë' THEN 3
    WHEN unit_type = 'Penthouse' THEN 3
    ELSE NULL::int
  END,
  CASE
    WHEN unit_type IN ('Banesë', 'Penthouse', 'Lokal') AND unit_size >= 80 THEN 2
    WHEN unit_type IN ('Banesë', 'Penthouse', 'Lokal') THEN 1
    ELSE NULL::int
  END,
  CASE
    WHEN unit_type IN ('Banesë', 'Penthouse') AND unit_size >= 100 THEN 2
    WHEN unit_type IN ('Banesë', 'Penthouse', 'Lokal') THEN 1
    ELSE NULL::int
  END,
  CASE WHEN unit_type = 'Garazhë' THEN NULL ELSE orientation END,
  CASE
    WHEN unit_type = 'Garazhë' THEN 'G-' || lpad(slot_no::text, 2, '0')
    WHEN unit_type = 'Lokal' THEN 'L-' || lpad(slot_no::text, 2, '0')
    WHEN unit_type = 'Penthouse' THEN 'PH-' || slot_no::text
    WHEN unit_size < 70 THEN '1+1'
    WHEN unit_size < 100 THEN '2+1'
    ELSE '3+1'
  END,
  CASE
    WHEN unit_type = 'Banesë' THEN round((5.5 + slot_no * 0.8)::numeric, 1)
    ELSE NULL::numeric
  END,
  CASE
    WHEN unit_type = 'Penthouse' THEN CASE WHEN slot_no = 1 THEN 31.0 ELSE 42.0 END
    WHEN unit_type = 'Lokal' THEN round((8.0 + slot_no * 1.5)::numeric, 1)
    ELSE NULL::numeric
  END,
  CASE
    WHEN unit_type = 'Banesë' AND unit_size >= 80 THEN true
    WHEN unit_type = 'Penthouse' THEN true
    ELSE false
  END,
  '2026-01-01 09:00:00+00'::timestamptz + (((block_no - 1) * 44 + seq - 1) * interval '2 minutes'),
  '2026-01-01 09:00:00+00'::timestamptz + (((block_no - 1) * 44 + seq - 1) * interval '2 minutes')
FROM final_units
ORDER BY block_no, seq;

-- ============================================================================
-- Sale plan
-- ============================================================================

CREATE TEMP TABLE tmp_sale_plan (
  unit_code text PRIMARY KEY,
  sale_date date NOT NULL,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  source text NOT NULL,
  payment_type text NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_sale_plan (
  unit_code,
  sale_date,
  buyer_name,
  buyer_phone,
  source,
  payment_type
)
VALUES
  ('BA-01', '2026-01-08', 'Arben Gashi', '+383 44 120 381', 'Facebook', 'Pagesë e plotë'),
  ('BA-32', '2026-01-12', 'Drita Krasniqi', '+383 49 238 114', 'Facebook', 'Pagesë e plotë'),
  ('BA-36', '2026-01-18', 'Leart Berisha', '+383 45 302 771', 'Rekomandim', 'Pagesë e plotë'),
  ('BB-03', '2026-01-23', 'Kujtim Morina', '+383 44 511 208', 'Tjetër', 'Pagesë e plotë'),
  ('BA-02', '2026-01-27', 'Shqipe Selmani', '+383 49 402 119', 'Tjetër', 'Pagesë e plotë'),
  ('BB-01', '2026-01-30', 'Besart Shala', '+383 45 730 642', 'Facebook', 'Pagesë e plotë'),
  ('BA-04', '2026-02-04', 'Nora Jashari', '+383 44 305 914', 'Facebook', 'Pagesë e plotë'),
  ('BA-44', '2026-02-09', 'Valmir Kelmendi', '+383 49 612 407', 'Rekomandim', 'Me këste'),
  ('BB-31', '2026-02-13', 'Rina Mustafa', '+383 45 224 873', 'Facebook', 'Pagesë e plotë'),
  ('BB-35', '2026-02-18', 'Blerim Osmani', '+383 44 814 330', 'Facebook', 'Pagesë e plotë'),
  ('BC-06', '2026-02-22', 'Fisnik Deda', '+383 49 518 904', 'Tjetër', 'Pagesë e plotë'),
  ('BB-02', '2026-02-25', 'Vesa Thaçi', '+383 45 610 752', 'Tjetër', 'Pagesë e plotë'),
  ('BC-01', '2026-02-28', 'Alban Haliti', '+383 44 271 866', 'Facebook', 'Pagesë e plotë'),
  ('BA-05', '2026-03-04', 'Fjolla Gërvalla', '+383 49 720 115', 'Facebook', 'Pagesë e plotë'),
  ('BB-05', '2026-03-08', 'Gent Luma', '+383 45 681 240', 'Rekomandim', 'Pagesë e plotë'),
  ('BC-32', '2026-03-12', 'Arta Beqiri', '+383 44 409 772', 'Facebook', 'Me këste'),
  ('BC-36', '2026-03-16', 'Ilir Zeneli', '+383 49 331 685', 'Facebook', 'Pagesë e plotë'),
  ('BC-43', '2026-03-20', 'Sara Kurti', '+383 45 928 144', 'Rekomandim', 'Pagesë e plotë'),
  ('BA-09', '2026-03-23', 'Bujar Miftari', '+383 44 617 902', 'Tjetër', 'Pagesë e plotë'),
  ('BC-08', '2026-03-26', 'Teuta Sopa', '+383 49 803 541', 'Facebook', 'Pagesë e plotë'),
  ('BB-37', '2026-03-30', 'Luan Ahmeti', '+383 45 517 399', 'Facebook', 'Pagesë e plotë'),
  ('BA-08', '2026-04-03', 'Blend Spahiu', '+383 44 288 710', 'Facebook', 'Pagesë e plotë'),
  ('BA-34', '2026-04-07', 'Diellza Zeka', '+383 49 662 187', 'Facebook', 'Pagesë e plotë'),
  ('BB-43', '2026-04-11', 'Rron Nika', '+383 45 747 206', 'Rekomandim', 'Pagesë e plotë'),
  ('BC-44', '2026-04-15', 'Arlind Bytyqi', '+383 44 903 654', 'Facebook', 'Pagesë e plotë'),
  ('BC-41', '2026-04-18', 'Liridona Salihu', '+383 49 416 270', 'Facebook', 'Pagesë e plotë'),
  ('BB-10', '2026-04-22', 'Eron Kastrati', '+383 45 232 918', 'Facebook', 'Pagesë e plotë'),
  ('BC-05', '2026-04-26', 'Yllka Hyseni', '+383 44 776 501', 'Rekomandim', 'Pagesë e plotë'),
  ('BA-10', '2026-04-29', 'Dren Çitaku', '+383 49 540 336', 'Facebook', 'Me këste');

-- CRM leads are investor-side only. Non-investor sold units are marked sold
-- without CRM linkage.
INSERT INTO public.crm_leads (
  name,
  phone,
  email,
  source,
  status,
  notes,
  created_at,
  updated_at
)
SELECT
  sp.buyer_name,
  sp.buyer_phone,
  NULL::text,
  sp.source,
  'I interesuar',
  'Lead sintetik nga aktiviteti i shitjes së investitorit',
  (sp.sale_date::timestamp - interval '5 days' + time '10:00')::timestamptz,
  (sp.sale_date::timestamp - interval '5 days' + time '10:00')::timestamptz
FROM tmp_sale_plan sp
JOIN public.units u
  ON u.unit_id = sp.unit_code
WHERE u.owner_category = 'Investitor'
ORDER BY sp.sale_date, sp.unit_code;

INSERT INTO public.crm_showings (
  contact_id,
  unit_id,
  unit_record_id,
  date,
  time,
  status,
  outcome,
  notes,
  created_at
)
SELECT
  l.id,
  u.unit_id,
  u.id,
  greatest(sp.sale_date - 2, '2026-01-01'::date),
  make_time(15 + ((row_number() OVER (ORDER BY sp.sale_date, sp.unit_code))::int % 4), CASE WHEN row_number() OVER (ORDER BY sp.sale_date, sp.unit_code) % 2 = 0 THEN 30 ELSE 0 END, 0),
  'E kryer',
  'Pa rezultat',
  'Vizitë para mbylljes së shitjes',
  (greatest(sp.sale_date - 2, '2026-01-01'::date)::timestamp + time '09:30')::timestamptz
FROM tmp_sale_plan sp
JOIN public.units u
  ON u.unit_id = sp.unit_code
JOIN public.crm_leads l
  ON l.name = sp.buyer_name
 AND l.phone = sp.buyer_phone
WHERE u.owner_category = 'Investitor'
ORDER BY sp.sale_date, sp.unit_code;

DO $seed_sales$
DECLARE
  r record;
  v_final_price numeric;
  v_installments jsonb;
BEGIN
  FOR r IN
    SELECT
      sp.*,
      u.id AS unit_record_id,
      u.price,
      u.owner_category,
      l.id AS lead_id,
      sh.id AS showing_id
    FROM tmp_sale_plan sp
    JOIN public.units u
      ON u.unit_id = sp.unit_code
    LEFT JOIN public.crm_leads l
      ON l.name = sp.buyer_name
     AND l.phone = sp.buyer_phone
    LEFT JOIN public.crm_showings sh
      ON sh.unit_record_id = u.id
     AND sh.contact_id = l.id
    ORDER BY sp.sale_date, sp.unit_code
  LOOP
    v_final_price := round((
      r.price *
      CASE
        WHEN r.payment_type = 'Me këste' THEN 0.995
        WHEN extract(day from r.sale_date)::int % 5 = 0 THEN 0.985
        WHEN extract(day from r.sale_date)::int % 3 = 0 THEN 0.990
        ELSE 1.000
      END
    ) / 100) * 100;

    IF r.payment_type = 'Me këste' THEN
      v_installments := jsonb_build_array(
        jsonb_build_object(
          'installment_number', 1,
          'amount', round(v_final_price * 0.30, 2),
          'due_date', r.sale_date::text,
          'notes', 'Paradhënie'
        ),
        jsonb_build_object(
          'installment_number', 2,
          'amount', round(v_final_price * 0.25, 2),
          'due_date', (r.sale_date + interval '60 days')::date::text,
          'notes', 'Kësti i dytë'
        ),
        jsonb_build_object(
          'installment_number', 3,
          'amount', round(v_final_price * 0.25, 2),
          'due_date', (r.sale_date + interval '120 days')::date::text,
          'notes', 'Kësti i tretë'
        ),
        jsonb_build_object(
          'installment_number', 4,
          'amount', v_final_price - round(v_final_price * 0.30, 2) - round(v_final_price * 0.25, 2) - round(v_final_price * 0.25, 2),
          'due_date', (r.sale_date + interval '180 days')::date::text,
          'notes', 'Kësti final'
        )
      );
    ELSE
      v_installments := '[]'::jsonb;
    END IF;

    PERFORM public.complete_unit_sale(
      p_unit_id => r.unit_record_id,
      p_sale_date => r.sale_date,
      p_final_price => v_final_price,
      p_buyer_name => r.buyer_name,
      p_payment_type => r.payment_type,
      p_notes => CASE
        WHEN r.owner_category = 'Investitor' THEN 'Shitje e investitorit'
        ELSE 'Shitje e shënuar për pronësi jo-investitor'
      END,
      p_crm_lead_id => r.lead_id,
      p_installments => v_installments,
      p_showing_id => r.showing_id,
      p_reservation_id => NULL::uuid
    );
  END LOOP;
END;
$seed_sales$;

-- First installment is collected for installment-plan sales; the remaining
-- obligations stay open and never exceed six months from sale date.
UPDATE public.unit_payments p
SET
  status = 'E paguar',
  paid_date = s.sale_date
FROM public.unit_sales s
WHERE p.sale_id = s.id
  AND s.payment_type = 'Me këste'
  AND p.installment_number = 1;

-- ============================================================================
-- Reservations
-- ============================================================================

CREATE TEMP TABLE tmp_reservation_plan (
  unit_code text PRIMARY KEY,
  lead_name text NOT NULL,
  lead_phone text NOT NULL,
  source text NOT NULL,
  reserved_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  reservation_status text NOT NULL,
  notes text NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_reservation_plan (
  unit_code,
  lead_name,
  lead_phone,
  source,
  reserved_at,
  expires_at,
  reservation_status,
  notes
)
VALUES
  ('BA-11', 'Elira Morina', '+383 44 137 802', 'Facebook', '2026-01-09 10:00:00+00', '2026-01-23 10:00:00+00', 'E anuluar', 'Rezervim janari i liruar pas dy javësh'),
  ('BB-08', 'Flamur Rexhepi', '+383 49 344 119', 'Facebook', '2026-01-16 11:30:00+00', '2026-01-30 11:30:00+00', 'E anuluar', 'Rezervim janari pa konvertim'),
  ('BC-10', 'Anisa Hoti', '+383 45 731 406', 'Rekomandim', '2026-01-22 12:00:00+00', '2026-02-05 12:00:00+00', 'E anuluar', 'Rezervim janari i mbyllur pa shitje'),
  ('BA-14', 'Mira Selmani', '+383 44 502 817', 'Facebook', '2026-02-06 10:30:00+00', '2026-02-20 10:30:00+00', 'E anuluar', 'Rezervim shkurti pas vizitës'),
  ('BB-33', 'Valon Hajrizi', '+383 49 650 228', 'Tjetër', '2026-02-13 15:00:00+00', '2026-02-27 15:00:00+00', 'E anuluar', 'Interes për lokal, nuk u finalizua'),
  ('BC-17', 'Kaltrina Berisha', '+383 45 219 705', 'Facebook', '2026-02-21 13:00:00+00', '2026-03-07 13:00:00+00', 'E anuluar', 'Rezervim shkurti i liruar'),
  ('BA-39', 'Ardit Sylejmani', '+383 44 804 376', 'Facebook', '2026-03-05 09:45:00+00', '2026-03-19 09:45:00+00', 'E anuluar', 'Rezervim garazhe për klient ekzistues'),
  ('BB-20', 'Fiona Kica', '+383 49 288 461', 'Rekomandim', '2026-03-14 14:15:00+00', '2026-03-28 14:15:00+00', 'E anuluar', 'Rezervim marsi pas negociimit'),
  ('BC-31', 'Granit Rexha', '+383 45 420 993', 'Facebook', '2026-03-23 11:00:00+00', '2026-04-06 11:00:00+00', 'E anuluar', 'Interes për lokal, ndjekje e hapur'),
  ('BA-16', 'Bora Berisha', '+383 44 617 044', 'Facebook', '2026-04-19 10:00:00+00', '2026-05-03 10:00:00+00', 'Aktive', 'Rezervim aktiv brenda afatit dyjavor'),
  ('BB-11', 'Jeton Morina', '+383 49 909 318', 'Facebook', '2026-04-22 10:30:00+00', '2026-05-06 10:30:00+00', 'Aktive', 'Rezervim aktiv nga vizita e Prillit'),
  ('BC-14', 'Flaka Dreshaj', '+383 45 688 152', 'Rekomandim', '2026-04-24 11:00:00+00', '2026-05-08 11:00:00+00', 'Aktive', 'Rezervim aktiv me ndjekje nga shitja');

INSERT INTO public.crm_leads (
  name,
  phone,
  email,
  source,
  status,
  notes,
  created_at,
  updated_at
)
SELECT
  rp.lead_name,
  rp.lead_phone,
  NULL::text,
  rp.source,
  CASE WHEN rp.reservation_status = 'Aktive' THEN 'Në negociata' ELSE 'Kontaktuar' END,
  'Lead sintetik nga rrjedha e rezervimeve të investitorit',
  rp.reserved_at - interval '3 days',
  rp.reserved_at
FROM tmp_reservation_plan rp
ORDER BY rp.reserved_at;

INSERT INTO public.crm_showings (
  contact_id,
  unit_id,
  unit_record_id,
  date,
  time,
  status,
  outcome,
  notes,
  created_at
)
SELECT
  l.id,
  u.unit_id,
  u.id,
  rp.reserved_at::date,
  rp.reserved_at::time,
  'E kryer',
  'Rezervoi',
  'Vizitë që prodhoi rezervim',
  rp.reserved_at - interval '2 hours'
FROM tmp_reservation_plan rp
JOIN public.units u
  ON u.unit_id = rp.unit_code
JOIN public.crm_leads l
  ON l.name = rp.lead_name
 AND l.phone = rp.lead_phone
ORDER BY rp.reserved_at;

INSERT INTO public.unit_reservations (
  unit_id,
  contact_id,
  showing_id,
  status,
  reserved_at,
  expires_at,
  notes,
  created_at,
  updated_at
)
SELECT
  u.id,
  l.id,
  sh.id,
  rp.reservation_status,
  rp.reserved_at,
  rp.expires_at,
  rp.notes,
  rp.reserved_at,
  rp.expires_at
FROM tmp_reservation_plan rp
JOIN public.units u
  ON u.unit_id = rp.unit_code
JOIN public.crm_leads l
  ON l.name = rp.lead_name
 AND l.phone = rp.lead_phone
JOIN public.crm_showings sh
  ON sh.unit_record_id = u.id
 AND sh.contact_id = l.id
WHERE rp.reservation_status <> 'Aktive'
ORDER BY rp.reserved_at;

DO $seed_active_reservations$
DECLARE
  r record;
  v_reservation_id uuid;
BEGIN
  FOR r IN
    SELECT
      rp.*,
      u.id AS unit_record_id,
      l.id AS lead_id,
      sh.id AS showing_id
    FROM tmp_reservation_plan rp
    JOIN public.units u
      ON u.unit_id = rp.unit_code
    JOIN public.crm_leads l
      ON l.name = rp.lead_name
     AND l.phone = rp.lead_phone
    JOIN public.crm_showings sh
      ON sh.unit_record_id = u.id
     AND sh.contact_id = l.id
    WHERE rp.reservation_status = 'Aktive'
    ORDER BY rp.reserved_at
  LOOP
    v_reservation_id := public.create_unit_reservation(
      p_unit_id => r.unit_record_id,
      p_contact_id => r.lead_id,
      p_showing_id => r.showing_id,
      p_reserved_at => r.reserved_at,
      p_expires_at => r.expires_at,
      p_notes => r.notes
    );

    UPDATE public.unit_reservations
    SET
      created_at = r.reserved_at,
      updated_at = r.reserved_at
    WHERE id = v_reservation_id;

    UPDATE public.units
    SET
      reservation_expires_at = r.expires_at,
      updated_at = r.reserved_at
    WHERE id = r.unit_record_id;
  END LOOP;
END;
$seed_active_reservations$;

-- ============================================================================
-- Marketing
-- ============================================================================

INSERT INTO public.marketing_data (
  year,
  month,
  spend_facebook,
  views_facebook,
  views_tiktok,
  leads_facebook,
  leads_instagram,
  leads_tiktok,
  created_at,
  updated_at
)
VALUES
  (2026, 1, 500, 21800, 0, 31, 0, 0, '2026-01-31 18:00:00+00', '2026-01-31 18:00:00+00'),
  (2026, 2, 500, 23600, 0, 35, 0, 0, '2026-02-28 18:00:00+00', '2026-02-28 18:00:00+00'),
  (2026, 3, 500, 26900, 0, 39, 0, 0, '2026-03-31 18:00:00+00', '2026-03-31 18:00:00+00'),
  (2026, 4, 500, 24700, 0, 34, 0, 0, '2026-04-30 18:00:00+00', '2026-04-30 18:00:00+00');

INSERT INTO public.marketing_offline (
  channel,
  description,
  amount,
  period_type,
  year,
  month,
  date,
  created_at
)
VALUES
  ('Billboard', 'Billboard lokal për projektin', 700, 'Mujore', 2026, 1, '2026-01-06', '2026-01-06 09:00:00+00'),
  ('Billboard', 'Billboard lokal për projektin', 700, 'Mujore', 2026, 2, '2026-02-05', '2026-02-05 09:00:00+00'),
  ('Radio', 'Spot radio lokal për fundjavë vizitash', 250, 'Mujore', 2026, 3, '2026-03-09', '2026-03-09 09:00:00+00'),
  ('Radio', 'Spot radio lokal për ndjekje të Prillit', 250, 'Mujore', 2026, 4, '2026-04-07', '2026-04-07 09:00:00+00');

-- ============================================================================
-- CRM Daily Log
-- ============================================================================

WITH days AS (
  SELECT gs::date AS day
  FROM generate_series('2026-01-01'::date, '2026-04-30'::date, interval '1 day') AS gs
),
sales_counts AS (
  SELECT
    s.sale_date AS day,
    count(*)::int AS sales_count
  FROM public.unit_sales s
  JOIN public.units u
    ON u.id = s.unit_id
  WHERE u.owner_category = 'Investitor'
  GROUP BY s.sale_date
),
showing_counts AS (
  SELECT
    sh.date AS day,
    count(*)::int AS showing_count
  FROM public.crm_showings sh
  JOIN public.units u
    ON u.id = sh.unit_record_id
  WHERE u.owner_category = 'Investitor'
  GROUP BY sh.date
),
reservation_counts AS (
  SELECT
    ur.reserved_at::date AS day,
    count(*)::int AS reservation_count
  FROM public.unit_reservations ur
  JOIN public.units u
    ON u.id = ur.unit_id
  WHERE u.owner_category = 'Investitor'
  GROUP BY ur.reserved_at::date
),
daily AS (
  SELECT
    d.day,
    coalesce(sc.sales_count, 0) AS sales_count,
    coalesce(shc.showing_count, 0) AS showing_count,
    coalesce(rc.reservation_count, 0) AS reservation_count,
    extract(doy from d.day)::int AS doy,
    extract(dow from d.day)::int AS dow,
    extract(month from d.day)::int AS month_no
  FROM days d
  LEFT JOIN sales_counts sc
    ON sc.day = d.day
  LEFT JOIN showing_counts shc
    ON shc.day = d.day
  LEFT JOIN reservation_counts rc
    ON rc.day = d.day
)
INSERT INTO public.crm_daily_log (
  date,
  calls,
  contacts,
  showings,
  sales,
  comments,
  created_at
)
SELECT
  day,
  18 + (month_no * 2) + ((doy * 7) % 13) + (sales_count * 6) + (reservation_count * 4) + (showing_count * 3),
  7 + ((doy * 5) % 8) + (sales_count * 2) + (reservation_count * 2) + showing_count,
  showing_count,
  sales_count,
  CASE
    WHEN sales_count > 0 AND reservation_count > 0 THEN 'Shitje dhe rezervim nga pipeline i investitorit'
    WHEN sales_count > 0 THEN 'Mbyllje shitjeje dhe ndjekje pas pagesës'
    WHEN reservation_count > 0 THEN 'Rezervim i ri dhe verifikim afati dyjavor'
    WHEN showing_count > 0 THEN 'Vizita me klientë aktivë dhe follow-up'
    WHEN dow IN (0, 6) THEN 'Ndjekje fundjave për lead-e nga Facebook'
    WHEN doy % 5 = 0 THEN 'Thirrje rikujtuese dhe përditësim i listës së interesit'
    WHEN doy % 3 = 0 THEN 'Kualifikim lead-esh dhe koordinim vizitash'
    ELSE 'Aktivitet ditor CRM për projektin'
  END,
  (day::timestamp + time '18:30')::timestamptz
FROM daily
ORDER BY day;

-- ============================================================================
-- Assertions
-- ============================================================================

DO $assertions$
DECLARE
  v_bad_month int;
BEGIN
  IF (SELECT count(*) FROM public.units) <> 132 THEN
    RAISE EXCEPTION 'Expected 132 units after reset.';
  END IF;

  IF (SELECT count(DISTINCT unit_id) FROM public.units) <> 132 THEN
    RAISE EXCEPTION 'Expected 132 unique unit codes after reset.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE unit_id !~ '^(BA|BB|BC)-[0-9]{2}$') <> 0 THEN
    RAISE EXCEPTION 'Expected unit IDs in BA-01 / BB-01 / BC-01 format.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT block, count(*) AS cnt
      FROM public.units
      GROUP BY block
    ) b
    WHERE b.cnt <> 44
  ) THEN
    RAISE EXCEPTION 'Expected exactly 44 units per block.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Investitor') <> 68 THEN
    RAISE EXCEPTION 'Expected 68 Investitor units.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Pronarët e tokës') <> 34 THEN
    RAISE EXCEPTION 'Expected 34 land-owner units.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Kompani ndërtimore') <> 30 THEN
    RAISE EXCEPTION 'Expected 30 construction-company units.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Kompani ndërtimore' AND type IN ('Garazhë', 'Lokal')) <> 0 THEN
    RAISE EXCEPTION 'Construction-company units must not include Garazhë or Lokal.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Pronarët e tokës' AND status = 'E shitur') <> 2 THEN
    RAISE EXCEPTION 'Expected 2 sold land-owner units.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Kompani ndërtimore' AND status = 'E shitur') <> 3 THEN
    RAISE EXCEPTION 'Expected 3 sold construction-company units.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Investitor' AND status = 'E shitur') <> 24 THEN
    RAISE EXCEPTION 'Expected 24 sold investor units.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Investitor' AND status = 'E rezervuar') <> 3 THEN
    RAISE EXCEPTION 'Expected 3 active investor reservations.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category <> 'Investitor' AND status = 'E rezervuar') <> 0 THEN
    RAISE EXCEPTION 'Only investor units can be actively reserved.';
  END IF;

  IF (SELECT count(*) FROM public.unit_sales WHERE status = 'active') <> 29 THEN
    RAISE EXCEPTION 'Expected 29 active sales.';
  END IF;

  IF (SELECT count(*) FROM public.unit_sales WHERE status = 'active' AND payment_type = 'Pagesë e plotë') <> 26 THEN
    RAISE EXCEPTION 'Expected 26 full-payment sales.';
  END IF;

  IF (SELECT count(*) FROM public.unit_sales WHERE status = 'active' AND payment_type = 'Me këste') <> 3 THEN
    RAISE EXCEPTION 'Expected 3 installment-plan sales.';
  END IF;

  SELECT m.month_no
  INTO v_bad_month
  FROM generate_series(1, 4) AS m(month_no)
  LEFT JOIN (
    SELECT date_part('month', sale_date)::int AS month_no, count(*) AS sale_count
    FROM public.unit_sales
    WHERE sale_date BETWEEN '2026-01-01' AND '2026-04-30'
      AND status = 'active'
    GROUP BY 1
  ) s
    ON s.month_no = m.month_no
  WHERE coalesce(s.sale_count, 0) < 5
  LIMIT 1;

  IF v_bad_month IS NOT NULL THEN
    RAISE EXCEPTION 'Expected at least 5 sales in month %.', v_bad_month;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.unit_payments p
    JOIN public.unit_sales s
      ON s.id = p.sale_id
    WHERE s.payment_type = 'Me këste'
      AND p.due_date > (s.sale_date + interval '6 months')::date
  ) THEN
    RAISE EXCEPTION 'Installment plans must not exceed six months.';
  END IF;

  IF (
    SELECT count(DISTINCT CASE
      WHEN u.level = 'Penthouse' THEN 'Penthouse'
      WHEN u.type = 'Lokal' THEN 'Lokal'
      WHEN u.type = 'Garazhë' THEN 'Garazhë'
      ELSE 'Banesë'
    END)
    FROM public.unit_sales s
    JOIN public.units u
      ON u.id = s.unit_id
    WHERE s.status = 'active'
  ) <> 4 THEN
    RAISE EXCEPTION 'Sales must include Banesë, Garazhë, Lokal, and Penthouse.';
  END IF;

  IF (SELECT count(*) FROM public.unit_reservations WHERE status = 'Aktive') <> 3 THEN
    RAISE EXCEPTION 'Expected 3 active reservations.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.unit_reservations ur
    JOIN public.units u
      ON u.id = ur.unit_id
    WHERE u.owner_category <> 'Investitor'
  ) THEN
    RAISE EXCEPTION 'Reservations must be investor-side only.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.unit_reservations
    WHERE expires_at IS NOT NULL
      AND expires_at - reserved_at > interval '14 days'
  ) THEN
    RAISE EXCEPTION 'Reservations must not exceed two weeks.';
  END IF;

  SELECT m.month_no
  INTO v_bad_month
  FROM generate_series(1, 4) AS m(month_no)
  LEFT JOIN (
    SELECT date_part('month', reserved_at)::int AS month_no, count(*) AS reservation_count
    FROM public.unit_reservations
    WHERE reserved_at::date BETWEEN '2026-01-01' AND '2026-04-30'
    GROUP BY 1
  ) r
    ON r.month_no = m.month_no
  WHERE coalesce(r.reservation_count, 0) < 3
  LIMIT 1;

  IF v_bad_month IS NOT NULL THEN
    RAISE EXCEPTION 'Expected at least 3 reservations in month %.', v_bad_month;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.crm_showings sh
    JOIN public.units u
      ON u.id = sh.unit_record_id
    WHERE u.owner_category <> 'Investitor'
  ) THEN
    RAISE EXCEPTION 'CRM showings must be investor-side only.';
  END IF;

  IF (SELECT count(*) FROM public.crm_leads WHERE email IS NOT NULL) <> 0 THEN
    RAISE EXCEPTION 'Synthetic CRM leads must not include email addresses.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.crm_daily_log
    WHERE date BETWEEN '2026-01-01' AND '2026-04-30'
  ) <> 120 THEN
    RAISE EXCEPTION 'Expected one CRM daily-log row for every day Jan-Apr 2026.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.marketing_data
    WHERE year = 2026
      AND month BETWEEN 1 AND 4
      AND spend_facebook = 500
      AND views_tiktok = 0
      AND leads_instagram = 0
      AND leads_tiktok = 0
  ) <> 4 THEN
    RAISE EXCEPTION 'Expected four Facebook-only digital marketing rows at EUR 500/month.';
  END IF;

  IF (SELECT count(*) FROM public.marketing_offline WHERE channel NOT IN ('Billboard', 'Radio')) <> 0 THEN
    RAISE EXCEPTION 'Offline marketing can only include Billboard and Radio.';
  END IF;

  IF (
    SELECT count(DISTINCT month)
    FROM public.marketing_offline
    WHERE channel = 'Billboard'
      AND year = 2026
  ) <> 2 THEN
    RAISE EXCEPTION 'Expected Billboard in exactly 2 months.';
  END IF;

  IF (
    SELECT count(DISTINCT month)
    FROM public.marketing_offline
    WHERE channel = 'Radio'
      AND year = 2026
  ) <> 2 THEN
    RAISE EXCEPTION 'Expected Radio in exactly 2 months.';
  END IF;
END;
$assertions$;

COMMIT;

-- Quick verification after running:
-- SELECT block, count(*) FROM public.units GROUP BY block ORDER BY block;
-- SELECT owner_category, status, count(*) FROM public.units GROUP BY owner_category, status ORDER BY owner_category, status;
-- SELECT date_part('month', sale_date)::int AS month, payment_type, count(*) FROM public.unit_sales GROUP BY 1, 2 ORDER BY 1, 2;
-- SELECT date_part('month', reserved_at)::int AS month, status, count(*) FROM public.unit_reservations GROUP BY 1, 2 ORDER BY 1, 2;
-- SELECT year, month, spend_facebook, views_facebook, leads_facebook FROM public.marketing_data ORDER BY year, month;
-- SELECT channel, month, amount FROM public.marketing_offline ORDER BY date;
-- SELECT min(date), max(date), count(*) FROM public.crm_daily_log;
