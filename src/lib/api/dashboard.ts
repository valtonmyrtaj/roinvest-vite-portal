import { supabase } from "../supabase";
import type { Tables, TablesInsert } from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

export type DashboardSnapshotRow = Tables<"dashboard_snapshots">;
export type DashboardSnapshotPayload = Pick<
  TablesInsert<"dashboard_snapshots">,
  "period" | "data" | "updated_at"
>;

/** Fetch a single snapshot row for a given reporting period. */
export async function getDashboardSnapshot(
  period: string,
): Promise<ApiResult<DashboardSnapshotRow | null>> {
  const { data, error } = await supabase
    .from("dashboard_snapshots")
    .select("*")
    .eq("period", period)
    .maybeSingle();

  if (error) return apiFail(error.message);
  return apiOk((data ?? null) as DashboardSnapshotRow | null);
}

/** Upsert a snapshot row for a given reporting period. */
export async function saveDashboardSnapshot(
  payload: DashboardSnapshotPayload,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("dashboard_snapshots")
    .upsert(payload, { onConflict: "period" });

  if (error) return apiFail(error.message);
  return apiOk(null);
}
