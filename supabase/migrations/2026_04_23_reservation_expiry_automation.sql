-- Migration: reservation expiry automation
-- Date: 2026-04-23
-- Purpose:
-- 1. Add a dedicated server-side runner for expiring reservations
-- 2. Schedule the runner through Supabase Cron every 5 minutes
-- 3. Keep reservation expiry authoritative even when no operator has the app open

CREATE OR REPLACE FUNCTION public.run_reservation_expiry_job(
  p_cutoff timestamp with time zone DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_expired_count integer := 0;
begin
  select count(*)::integer
  into v_expired_count
  from public.expire_unit_reservations(
    p_unit_ids => null,
    p_cutoff => coalesce(p_cutoff, now())
  );

  return coalesce(v_expired_count, 0);
end;
$function$;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_namespace
    WHERE nspname = 'cron'
  ) THEN
    PERFORM cron.schedule(
      'reservation-expiry-every-5-minutes',
      '*/5 * * * *',
      'select public.run_reservation_expiry_job();'
    );
  ELSE
    RAISE NOTICE
      'Supabase Cron is not enabled. Enable Cron in the project and rerun this SQL to schedule reservation-expiry-every-5-minutes.';
  END IF;
END;
$block$;
