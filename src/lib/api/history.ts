import { supabase } from "../supabase";
import type { Tables } from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

// ─── Row types ───────────────────────────────────────────────────────────────

/** Raw unit_history row as stored server-side. */
export type UnitHistoryRow = Tables<"unit_history">;

/**
 * unit_history row enriched with the joined units.unit_id, in the narrow
 * column projection consumed by the notifications feed. Kept here (not in
 * a consumer) because the shape is dictated by the SELECT list below.
 */
export type NotificationHistoryRow = Tables<"unit_history"> & {
  units: { unit_id: string } | null;
};

// ─── Reads ───────────────────────────────────────────────────────────────────

/** Most-recent unit_history rows, full row, ordered by changed_at desc. */
export async function listRecentUnitHistory({
  limit,
}: {
  limit: number;
}): Promise<ApiResult<UnitHistoryRow[]>> {
  const { data, error } = await supabase
    .from("unit_history")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(limit);

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as UnitHistoryRow[]);
}

/**
 * Most-recent unit_history rows in a narrow projection for the dashboard
 * notifications feed. Includes the joined units.unit_id for display.
 */
export async function listRecentNotificationHistory({
  limit,
}: {
  limit: number;
}): Promise<ApiResult<NotificationHistoryRow[]>> {
  const { data, error } = await supabase
    .from("unit_history")
    .select("id, changed_at, change_reason, previous_data, new_data, units(unit_id)")
    .order("changed_at", { ascending: false })
    .limit(limit);

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as NotificationHistoryRow[]);
}
