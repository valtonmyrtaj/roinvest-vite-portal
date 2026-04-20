import { supabase } from "../supabase";
import type { Database } from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

// ─── Row types (raw RPC return shapes) ───────────────────────────────────────

export type ReportingMetricsRow =
  Database["public"]["Functions"]["reporting_get_sale_metrics"]["Returns"][number];
export type ReportingMonthlySeriesRow =
  Database["public"]["Functions"]["reporting_get_sale_monthly_series"]["Returns"][number];
export type ReportingTypologyBreakdownRow =
  Database["public"]["Functions"]["reporting_get_sale_typology_breakdown"]["Returns"][number];

// ─── Argument shapes ─────────────────────────────────────────────────────────

/**
 * The set of owner-scope values accepted by every reporting RPC. Kept
 * here (not in hooks/useUnits) because it is a database-facing concern:
 * these literals mirror server-side checks in the reporting functions.
 */
export type ReportingOwnerScope =
  | "Investitor"
  | "Pronarët e tokës"
  | "Kompani ndërtimore"
  | "all";

export interface SaleMetricsArgs {
  ownerScope: ReportingOwnerScope;
  year?: number | null;
  month?: number | null;
}

export interface SaleMonthlySeriesArgs {
  ownerScope: ReportingOwnerScope;
  year: number;
}

export interface SaleTypologyBreakdownArgs {
  ownerScope: ReportingOwnerScope;
  year: number;
  month?: number | null;
}

// ─── RPC wrappers ────────────────────────────────────────────────────────────

/** Fetch aggregated sale metrics for the given owner scope / period. */
export async function getSaleMetrics({
  ownerScope,
  year = null,
  month = null,
}: SaleMetricsArgs): Promise<ApiResult<ReportingMetricsRow[]>> {
  const { data, error } = await supabase.rpc("reporting_get_sale_metrics", {
    p_owner_scope: ownerScope,
    p_year: year ?? undefined,
    p_month: month ?? undefined,
  });

  if (error) return apiFail(error.message);
  return apiOk(data ?? []);
}

/** Fetch month-by-month series for a given owner scope + year. */
export async function getSaleMonthlySeries({
  ownerScope,
  year,
}: SaleMonthlySeriesArgs): Promise<ApiResult<ReportingMonthlySeriesRow[]>> {
  const { data, error } = await supabase.rpc("reporting_get_sale_monthly_series", {
    p_owner_scope: ownerScope,
    p_year: year,
  });

  if (error) return apiFail(error.message);
  return apiOk(data ?? []);
}

/** Fetch typology-level breakdown for a given owner scope / period. */
export async function getSaleTypologyBreakdown({
  ownerScope,
  year,
  month = null,
}: SaleTypologyBreakdownArgs): Promise<ApiResult<ReportingTypologyBreakdownRow[]>> {
  const { data, error } = await supabase.rpc("reporting_get_sale_typology_breakdown", {
    p_owner_scope: ownerScope,
    p_year: year,
    p_month: month ?? undefined,
  });

  if (error) return apiFail(error.message);
  return apiOk(data ?? []);
}
