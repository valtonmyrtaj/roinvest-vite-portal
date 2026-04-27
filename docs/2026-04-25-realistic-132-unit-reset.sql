-- ============================================================================
-- Roinvest Portal / UF Partners Portal
-- Realistic Investor Demo Reset
-- ============================================================================
--
-- Purpose:
-- - Replace the tiny demo portfolio with a realistic UF Partners Residence story.
-- - Use the architect floor-plan size bands visible in the project image.
-- - Seed enough sales, reservations, CRM activity, and marketing to make
--   investor-facing dashboards explainable from January through April 2026.
--
-- Portfolio model:
-- - 132 total units across Ndertesa A/B/C.
-- - 34 units for Pronarët e tokës (~26%).
-- - 20 units for Kompani ndërtimore.
-- - 78 units for Investitor / UF Partners.
--
-- Investor operating story:
-- - 25 investor units sold from January to April 2026.
--   Jan: 4, Feb: 6, Mar: 8, Apr: 7.
-- - 7 active April reservations on investor apartments.
-- - CRM leads/showings/daily activity from January to April.
-- - Marketing plan around EUR 10k, mostly Facebook campaigns, plus billboard,
--   fletushka, and radio offline spend.
--
-- Scope:
-- - Destructive reset of demo operational data.
-- - Clears: unit history, payments, sales, reservations, CRM showings, CRM leads,
--   CRM daily log, units, digital marketing, offline marketing.
-- - Does NOT touch approved users, auth, or dashboard_snapshots.
--
-- IMPORTANT:
-- - Review before running.
-- - Take a Supabase backup before running against any real environment.
-- - This is intentionally a docs runbook, not an auto-applied migration.
--
-- To run intentionally, uncomment this acknowledgement line:
-- SET LOCAL roinvest.reset_ack = 'reset-realistic-investor-demo';
-- ============================================================================

BEGIN;

SET LOCAL search_path TO public;
SET LOCAL lock_timeout TO '10s';
SET LOCAL statement_timeout TO '5min';
SET LOCAL idle_in_transaction_session_timeout TO '5min';

DO $guard$
BEGIN
  IF nullif(current_setting('roinvest.reset_ack', true), '') IS DISTINCT FROM 'reset-realistic-investor-demo' THEN
    RAISE EXCEPTION
      'Reset blocked. Uncomment SET LOCAL roinvest.reset_ack = ''reset-realistic-investor-demo'' after taking a backup.';
  END IF;
END;
$guard$;

-- Unit-linked and demo operating data first. This is intentionally explicit:
-- no auth tables, approved users, or dashboard snapshots are touched.
DELETE FROM public.unit_payments;
DELETE FROM public.unit_sales;
DELETE FROM public.unit_reservations;
DELETE FROM public.unit_history;
DELETE FROM public.crm_showings;
DELETE FROM public.crm_leads;
DELETE FROM public.crm_daily_log;
DELETE FROM public.marketing_data;
DELETE FROM public.marketing_offline;
DELETE FROM public.units;

-- ============================================================================
-- Units
-- ============================================================================
--
-- Each building gets 44 units:
-- - 6 typical floors x 7 apartments = 42
-- - Penthouse floor x 2 units = 2
--
-- A/B size bands from architect image:
-- 55.3, 63.0, 85.1, 87.6, 91.1, 92.6, 109.4 m2
--
-- C size bands from architect image:
-- 56.2, 64.4, 78.6, 87.3, 89.2, 92.0, 117.2 m2
--
WITH level_plan AS (
  SELECT *
  FROM (
    VALUES
      (1, 'Kati 1'::text, 7),
      (2, 'Kati 2'::text, 7),
      (3, 'Kati 3'::text, 7),
      (4, 'Kati 4'::text, 7),
      (5, 'Kati 5'::text, 7),
      (6, 'Kati 6'::text, 7),
      (7, 'Penthouse'::text, 2)
  ) AS levels(level_no, level_label, slots)
),
raw_units AS (
  SELECT
    row_number() OVER (ORDER BY block_no, level_no, slot_no) AS ordinal,
    block_no,
    level_no,
    level_label,
    slot_no
  FROM generate_series(1, 3) AS blocks(block_no)
  CROSS JOIN level_plan
  CROSS JOIN LATERAL generate_series(1, level_plan.slots) AS slots(slot_no)
),
sized_units AS (
  SELECT
    ordinal,
    block_no,
    CASE block_no
      WHEN 1 THEN 'Blloku A'
      WHEN 2 THEN 'Blloku B'
      ELSE 'Blloku C'
    END AS block,
    CASE block_no
      WHEN 1 THEN 'BA'
      WHEN 2 THEN 'BB'
      ELSE 'BC'
    END AS block_code,
    level_no,
    level_label AS level,
    slot_no,
    CASE
      WHEN level_label = 'Penthouse' AND slot_no = 1 THEN 138.0::numeric
      WHEN level_label = 'Penthouse' THEN 152.0::numeric
      WHEN block_no IN (1, 2) AND slot_no = 1 THEN 55.3::numeric
      WHEN block_no IN (1, 2) AND slot_no = 2 THEN 63.0::numeric
      WHEN block_no IN (1, 2) AND slot_no = 3 THEN 85.1::numeric
      WHEN block_no IN (1, 2) AND slot_no = 4 THEN 87.6::numeric
      WHEN block_no IN (1, 2) AND slot_no = 5 THEN 91.1::numeric
      WHEN block_no IN (1, 2) AND slot_no = 6 THEN 92.6::numeric
      WHEN block_no IN (1, 2) AND slot_no = 7 THEN 109.4::numeric
      WHEN slot_no = 1 THEN 56.2::numeric
      WHEN slot_no = 2 THEN 64.4::numeric
      WHEN slot_no = 3 THEN 78.6::numeric
      WHEN slot_no = 4 THEN 87.3::numeric
      WHEN slot_no = 5 THEN 89.2::numeric
      WHEN slot_no = 6 THEN 92.0::numeric
      ELSE 117.2::numeric
    END AS size
  FROM raw_units
),
shaped_units AS (
  SELECT
    *,
    CASE
      WHEN ordinal % 4 = 0 OR ordinal = 2 THEN 'Pronarët e tokës'
      WHEN ordinal % 5 = 0 THEN 'Kompani ndërtimore'
      ELSE 'Investitor'
    END AS owner_category,
    CASE WHEN level = 'Penthouse' THEN 'Penthouse' ELSE 'Banesë' END AS type,
    CASE
      WHEN level = 'Penthouse' THEN 3
      WHEN size < 70 THEN 1
      WHEN size < 100 THEN 2
      ELSE 3
    END AS bedrooms,
    CASE
      WHEN level = 'Penthouse' OR size >= 85 THEN 2
      ELSE 1
    END AS bathrooms,
    CASE
      WHEN level = 'Penthouse' OR size >= 105 THEN 2
      ELSE 1
    END AS toilets,
    CASE ((ordinal - 1) % 8)
      WHEN 0 THEN 'Lindje'
      WHEN 1 THEN 'Jug-Lindje'
      WHEN 2 THEN 'Jug'
      WHEN 3 THEN 'Jug-Perëndim'
      WHEN 4 THEN 'Perëndim'
      WHEN 5 THEN 'Veri-Perëndim'
      WHEN 6 THEN 'Veri'
      ELSE 'Veri-Lindje'
    END AS orientation
  FROM sized_units
),
final_units AS (
  SELECT
    *,
    CASE owner_category
      WHEN 'Investitor' THEN 'UF Partners'
      WHEN 'Pronarët e tokës' THEN
        (ARRAY['Familja Selmani', 'Familja Krasniqi', 'Familja Berisha', 'Familja Gashi'])[((ordinal - 1) % 4) + 1]
      ELSE
        (ARRAY['Ndertimi Company', 'Molerat Company', 'Rryma Company'])[((ordinal - 1) % 3) + 1]
    END AS owner_name,
    CASE
      WHEN type = 'Penthouse' THEN round((size * 1650) / 1000) * 1000
      WHEN size >= 100 THEN round((size * 1480) / 1000) * 1000
      ELSE round((size * 1420) / 1000) * 1000
    END AS price
  FROM shaped_units
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
  created_at,
  updated_at
)
SELECT
  block_code || '-' || lpad(level_no::text, 2, '0') || '-' || lpad(slot_no::text, 2, '0'),
  block,
  type,
  level,
  size,
  price,
  'Në dispozicion',
  owner_category,
  owner_name,
  NULL::timestamptz,
  NULL::date,
  NULL::numeric,
  NULL::text,
  NULL::uuid,
  CASE
    WHEN type = 'Penthouse' THEN 'Penthouse me tarracë dhe pamje panoramike'
    ELSE NULL::text
  END,
  bedrooms,
  bathrooms,
  toilets,
  orientation,
  CASE WHEN type = 'Penthouse' THEN 'PH' ELSE bedrooms::text || '+1' END,
  CASE WHEN type = 'Penthouse' THEN NULL ELSE round((4.5 + slot_no * 0.7)::numeric, 1) END,
  CASE WHEN type = 'Penthouse' THEN (28 + slot_no * 10)::numeric ELSE NULL END,
  '2026-01-01 09:00:00+00'::timestamptz + ((ordinal - 1) * interval '3 minutes'),
  '2026-01-01 09:00:00+00'::timestamptz + ((ordinal - 1) * interval '3 minutes')
FROM final_units
ORDER BY ordinal;

-- ============================================================================
-- CRM Leads
-- ============================================================================

WITH lead_seed AS (
  SELECT
    gs AS ordinal,
    CASE
      WHEN gs <= 25 THEN 'buyer'
      WHEN gs <= 32 THEN 'reservation'
      ELSE 'prospect'
    END AS lead_kind,
    (ARRAY[
      'Arben Gashi', 'Drita Krasniqi', 'Leart Berisha', 'Mira Selmani',
      'Dion Hoxha', 'Elira Morina', 'Besart Shala', 'Nora Jashari',
      'Flamur Rexhepi', 'Anisa Hoti', 'Valmir Kelmendi', 'Rina Mustafa',
      'Blerim Osmani', 'Era Bajrami', 'Fisnik Deda', 'Vesa Thaçi',
      'Alban Haliti', 'Fjolla Gërvalla', 'Gent Luma', 'Arta Beqiri',
      'Ilir Zeneli', 'Sara Kurti', 'Bujar Miftari', 'Teuta Sopa',
      'Luan Ahmeti', 'Blend Spahiu', 'Diellza Zeka', 'Rron Nika',
      'Arlind Bytyqi', 'Liridona Salihu', 'Eron Kastrati', 'Yllka Hyseni',
      'Dren Çitaku', 'Jeta Kabashi', 'Faton Mehmeti', 'Alma Zogaj',
      'Korab Islami', 'Donika Llapi', 'Jeton Morina', 'Flaka Dreshaj',
      'Arian Bajraktari', 'Rrezarta Gashi', 'Valon Hajrizi', 'Kaltrina Berisha',
      'Ardit Sylejmani', 'Fiona Kica', 'Granit Rexha', 'Bora Berisha'
    ])[gs] AS name
  FROM generate_series(1, 48) AS gs
)
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
  name,
  '+383 44 ' || lpad((110000 + ordinal * 137)::text, 6, '0'),
  'lead-' || lpad(ordinal::text, 2, '0') || '@example.com',
  CASE
    WHEN ordinal % 5 = 0 THEN 'Rekomandim'
    WHEN ordinal % 4 = 0 THEN 'Instagram'
    WHEN ordinal % 3 = 0 THEN 'TikTok'
    WHEN ordinal % 2 = 0 THEN 'Billboard'
    ELSE 'Facebook'
  END,
  CASE lead_kind
    WHEN 'buyer' THEN 'Konvertuar'
    WHEN 'reservation' THEN 'Rezervim aktiv'
    ELSE 'I ri'
  END,
  CASE lead_kind
    WHEN 'buyer' THEN 'Klient i konvertuar në shitje gjatë fazës së parë të projektit'
    WHEN 'reservation' THEN 'Interes i fortë, rezervim aktiv në Prill'
    ELSE 'Lead aktiv për ndjekje nga ekipi i shitjes'
  END,
  '2026-01-05 10:00:00+00'::timestamptz + ((ordinal - 1) * interval '38 hours'),
  '2026-01-05 10:00:00+00'::timestamptz + ((ordinal - 1) * interval '38 hours')
FROM lead_seed
ORDER BY ordinal;

-- ============================================================================
-- Sales
-- ============================================================================
--
-- Uses complete_unit_sale so unit_sales, unit_payments, unit_history, and
-- units.status are kept in the same shape as the app's production flow.

DO $seed_sales$
DECLARE
  r record;
  v_sale_date date;
  v_final_price numeric;
  v_payment_type text;
  v_installments jsonb;
BEGIN
  FOR r IN
    WITH investor_units AS (
      SELECT
        id,
        unit_id,
        price,
        row_number() OVER (ORDER BY created_at, unit_id) AS sale_no
      FROM public.units
      WHERE owner_category = 'Investitor'
      ORDER BY created_at, unit_id
      LIMIT 25
    ),
    buyer_leads AS (
      SELECT
        id,
        name,
        row_number() OVER (ORDER BY created_at, name) AS sale_no
      FROM public.crm_leads
      WHERE status = 'Konvertuar'
      ORDER BY created_at, name
      LIMIT 25
    )
    SELECT
      iu.id AS unit_record_id,
      iu.unit_id,
      iu.price,
      iu.sale_no,
      bl.id AS lead_id,
      bl.name AS buyer_name
    FROM investor_units iu
    JOIN buyer_leads bl
      ON bl.sale_no = iu.sale_no
    ORDER BY iu.sale_no
  LOOP
    v_sale_date := CASE
      WHEN r.sale_no <= 4 THEN make_date(2026, 1, (8 + (r.sale_no * 4))::int)
      WHEN r.sale_no <= 10 THEN make_date(2026, 2, (2 + ((r.sale_no - 4) * 4))::int)
      WHEN r.sale_no <= 18 THEN make_date(2026, 3, (1 + ((r.sale_no - 10) * 3))::int)
      ELSE make_date(2026, 4, (2 + ((r.sale_no - 18) * 3))::int)
    END;

    v_final_price := round((r.price * CASE
      WHEN r.sale_no % 6 = 0 THEN 0.985
      WHEN r.sale_no % 4 = 0 THEN 0.970
      ELSE 0.995
    END) / 1000) * 1000;

    v_payment_type := CASE WHEN r.sale_no % 3 = 0 THEN 'Pagesë e plotë' ELSE 'Me këste' END;

    IF v_payment_type = 'Pagesë e plotë' THEN
      v_installments := '[]'::jsonb;
    ELSE
      v_installments := jsonb_build_array(
        jsonb_build_object(
          'installment_number', 1,
          'amount', round(v_final_price * 0.35, 2),
          'due_date', v_sale_date::text,
          'notes', 'Paradhënie'
        ),
        jsonb_build_object(
          'installment_number', 2,
          'amount', round(v_final_price * 0.35, 2),
          'due_date', (v_sale_date + interval '60 days')::date::text,
          'notes', 'Kësti i dytë'
        ),
        jsonb_build_object(
          'installment_number', 3,
          'amount', v_final_price - round(v_final_price * 0.35, 2) - round(v_final_price * 0.35, 2),
          'due_date', (v_sale_date + interval '150 days')::date::text,
          'notes', 'Kësti final'
        )
      );
    END IF;

    PERFORM public.complete_unit_sale(
      p_unit_id => r.unit_record_id,
      p_sale_date => v_sale_date,
      p_final_price => v_final_price,
      p_buyer_name => r.buyer_name,
      p_payment_type => v_payment_type,
      p_notes => 'Shitje demo për prezantim investitorësh',
      p_crm_lead_id => r.lead_id,
      p_installments => v_installments
    );
  END LOOP;
END;
$seed_sales$;

-- Mark first installments as collected for sold installment plans, so Sales and
-- Executive Reports have realistic collected/pending balances.
UPDATE public.unit_payments p
SET
  status = 'E paguar',
  paid_date = s.sale_date
FROM public.unit_sales s
WHERE p.sale_id = s.id
  AND p.installment_number = 1
  AND p.status = 'E papaguar';

-- ============================================================================
-- April Reservations
-- ============================================================================

DO $seed_reservations$
DECLARE
  r record;
  v_showing_id uuid;
  v_reservation_id uuid;
BEGIN
  FOR r IN
    WITH available_investor_units AS (
      SELECT
        id,
        unit_id,
        row_number() OVER (ORDER BY created_at, unit_id) AS reservation_no
      FROM public.units
      WHERE owner_category = 'Investitor'
        AND status = 'Në dispozicion'
        AND type = 'Banesë'
      ORDER BY created_at, unit_id
      LIMIT 7
    ),
    reservation_leads AS (
      SELECT
        id,
        name,
        row_number() OVER (ORDER BY created_at, name) AS reservation_no
      FROM public.crm_leads
      WHERE status = 'Rezervim aktiv'
      ORDER BY created_at, name
      LIMIT 7
    )
    SELECT
      au.id AS unit_record_id,
      au.unit_id,
      au.reservation_no,
      rl.id AS lead_id,
      rl.name AS lead_name
    FROM available_investor_units au
    JOIN reservation_leads rl
      ON rl.reservation_no = au.reservation_no
    ORDER BY au.reservation_no
  LOOP
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
    VALUES (
      r.lead_id,
      r.unit_id,
      r.unit_record_id,
      make_date(2026, 4, (3 + (r.reservation_no * 2))::int),
      '17:30'::time,
      'E kryer',
      'Rezervoi',
      'Vizitë me interes të lartë për banesë investitori',
      make_timestamptz(2026, 4, (3 + (r.reservation_no * 2))::int, 10, 0, 0, 'UTC')
    )
    RETURNING id INTO v_showing_id;

    v_reservation_id := public.create_unit_reservation(
      p_unit_id => r.unit_record_id,
      p_contact_id => r.lead_id,
      p_showing_id => v_showing_id,
      p_reserved_at => (make_date(2026, 4, (3 + (r.reservation_no * 2))::int)::timestamp + time '10:00')::timestamptz,
      p_expires_at => (make_date(2026, 5, (3 + (r.reservation_no * 2))::int)::timestamp + time '23:59')::timestamptz,
      p_notes => 'Rezervim aktiv demo për prezantim investitorësh'
    );
  END LOOP;
END;
$seed_reservations$;

-- Additional CRM showings for non-reserved prospects.
WITH prospect_leads AS (
  SELECT
    id,
    name,
    row_number() OVER (ORDER BY created_at, name) AS prospect_no
  FROM public.crm_leads
  WHERE status = 'I ri'
  ORDER BY created_at, name
  LIMIT 16
),
available_units AS (
  SELECT
    id,
    unit_id,
    row_number() OVER (ORDER BY created_at, unit_id) AS prospect_no
  FROM public.units
  WHERE owner_category = 'Investitor'
    AND status = 'Në dispozicion'
    AND type = 'Banesë'
  ORDER BY created_at, unit_id
  LIMIT 16
)
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
  pl.id,
  au.unit_id,
  au.id,
  make_date(2026, (((pl.prospect_no - 1) / 4)::int + 1)::int, (6 + ((pl.prospect_no - 1) % 4) * 5)::int),
  (CASE WHEN pl.prospect_no % 2 = 0 THEN '16:00' ELSE '18:00' END)::time,
  'E kryer',
  'Pa rezultat',
  'Vizitë demo për ritmin CRM Janar-Prill',
  make_timestamptz(2026, (((pl.prospect_no - 1) / 4)::int + 1)::int, (6 + ((pl.prospect_no - 1) % 4) * 5)::int, 11, 0, 0, 'UTC')
FROM prospect_leads pl
JOIN available_units au
  ON au.prospect_no = pl.prospect_no;

-- ============================================================================
-- CRM Daily Log
-- ============================================================================

INSERT INTO public.crm_daily_log (
  date,
  calls,
  contacts,
  showings,
  sales,
  comments,
  created_at
)
SELECT *
FROM (
  VALUES
    ('2026-01-08'::date, 18, 7, 2, 1, 'Fillim i fushatës dhe follow-up nga Facebook'),
    ('2026-01-15'::date, 24, 9, 3, 1, 'Interes për 2+1 në Bllokun A'),
    ('2026-01-24'::date, 31, 11, 4, 2, 'Dy shitje pas vizitave të fundjavës'),
    ('2026-02-06'::date, 26, 10, 3, 1, 'Rritje e interesit nga billboardi'),
    ('2026-02-14'::date, 34, 13, 5, 2, 'Vizita familjare për njësi 2+1'),
    ('2026-02-25'::date, 29, 12, 4, 3, 'Konvertime nga lista e pritjes'),
    ('2026-03-05'::date, 37, 15, 5, 2, 'Muaj i fortë nga fushata digjitale'),
    ('2026-03-13'::date, 42, 18, 6, 2, 'Lead-e të ngrohta nga TikTok/Facebook'),
    ('2026-03-21'::date, 39, 16, 5, 2, 'Shitje të mbyllura pas negociimit'),
    ('2026-03-29'::date, 45, 19, 7, 2, 'Fundjavë me vizita të larta'),
    ('2026-04-04'::date, 33, 14, 4, 1, 'Fokus në rezervime për banesa familjare'),
    ('2026-04-11'::date, 36, 17, 5, 2, 'Rezervime aktive pas vizitave'),
    ('2026-04-18'::date, 40, 18, 6, 2, 'Shtatë rezervime aktive në pipeline'),
    ('2026-04-24'::date, 28, 12, 3, 2, 'Përgatitje raporti për investitorë')
) AS t(date, calls, contacts, showings, sales, comments)
CROSS JOIN LATERAL (
  SELECT (t.date::timestamp + time '09:00')::timestamptz AS created_at
) c;

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
  (2026, 1, 1100, 38000, 18000, 32, 12, 8, '2026-01-31 18:00:00+00', '2026-01-31 18:00:00+00'),
  (2026, 2, 1500, 52000, 26000, 44, 16, 12, '2026-02-28 18:00:00+00', '2026-02-28 18:00:00+00'),
  (2026, 3, 1900, 74000, 34000, 61, 21, 18, '2026-03-31 18:00:00+00', '2026-03-31 18:00:00+00'),
  (2026, 4, 1200, 46000, 22000, 38, 14, 10, '2026-04-25 18:00:00+00', '2026-04-25 18:00:00+00');

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
  ('Billboard', 'Billboard kryesor pranë hyrjes së qytetit', 2200, 'Vjetore', 2026, 1, '2026-01-05', '2026-01-05 09:00:00+00'),
  ('Fletushka', 'Fletushka për lagjet përreth projektit', 350, 'Mujore', 2026, 1, '2026-01-12', '2026-01-12 09:00:00+00'),
  ('Fletushka', 'Fletushka me planimetri dhe çmime orientuese', 450, 'Mujore', 2026, 2, '2026-02-10', '2026-02-10 09:00:00+00'),
  ('Radio', 'Spot radio lokal për fundjavë vizitash', 250, 'Mujore', 2026, 3, '2026-03-07', '2026-03-07 09:00:00+00'),
  ('Fletushka', 'Materiale të printuara për eventin e hapur', 450, 'Mujore', 2026, 3, '2026-03-16', '2026-03-16 09:00:00+00'),
  ('Radio', 'Rikujtim radio për ofertat e muajit Prill', 250, 'Mujore', 2026, 4, '2026-04-08', '2026-04-08 09:00:00+00'),
  ('Fletushka', 'Fletushka për familje të reja dhe diasporë', 350, 'Mujore', 2026, 4, '2026-04-18', '2026-04-18 09:00:00+00');

-- ============================================================================
-- Assertions
-- ============================================================================

DO $assertions$
BEGIN
  IF (SELECT count(*) FROM public.units) <> 132 THEN
    RAISE EXCEPTION 'Expected 132 units after reset.';
  END IF;

  IF (SELECT count(DISTINCT unit_id) FROM public.units) <> 132 THEN
    RAISE EXCEPTION 'Expected 132 unique unit codes after reset.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Investitor') <> 78 THEN
    RAISE EXCEPTION 'Expected 78 Investitor units.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Pronarët e tokës') <> 34 THEN
    RAISE EXCEPTION 'Expected 34 land-owner units.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Kompani ndërtimore') <> 20 THEN
    RAISE EXCEPTION 'Expected 20 construction-company units.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Investitor' AND status = 'E shitur') <> 25 THEN
    RAISE EXCEPTION 'Expected 25 sold investor units.';
  END IF;

  IF (SELECT count(*) FROM public.units WHERE owner_category = 'Investitor' AND status = 'E rezervuar') <> 7 THEN
    RAISE EXCEPTION 'Expected 7 reserved investor units.';
  END IF;

  IF (SELECT count(*) FROM public.unit_sales WHERE status = 'active') <> 25 THEN
    RAISE EXCEPTION 'Expected 25 active unit_sales.';
  END IF;

  IF (SELECT count(*) FROM public.unit_reservations WHERE status = 'Aktive') <> 7 THEN
    RAISE EXCEPTION 'Expected 7 active reservations.';
  END IF;

  IF (SELECT count(*) FROM public.marketing_data WHERE year = 2026 AND month BETWEEN 1 AND 4) <> 4 THEN
    RAISE EXCEPTION 'Expected 4 digital marketing rows.';
  END IF;

  IF (SELECT coalesce(sum(spend_facebook), 0) FROM public.marketing_data WHERE year = 2026 AND month BETWEEN 1 AND 4) <> 5700 THEN
    RAISE EXCEPTION 'Expected EUR 5,700 digital spend Jan-Apr.';
  END IF;

  IF (SELECT coalesce(sum(amount), 0) FROM public.marketing_offline WHERE year = 2026) <> 4300 THEN
    RAISE EXCEPTION 'Expected EUR 4,300 offline spend.';
  END IF;
END;
$assertions$;

COMMIT;

-- Quick verification after running:
-- SELECT owner_category, status, count(*) FROM public.units GROUP BY owner_category, status ORDER BY owner_category, status;
-- SELECT date_part('month', sale_date)::int AS month, count(*) FROM public.unit_sales GROUP BY 1 ORDER BY 1;
-- SELECT status, count(*) FROM public.unit_reservations GROUP BY status ORDER BY status;
-- SELECT sum(spend_facebook) AS digital_spend FROM public.marketing_data WHERE year = 2026 AND month BETWEEN 1 AND 4;
-- SELECT sum(amount) AS offline_spend FROM public.marketing_offline WHERE year = 2026;
