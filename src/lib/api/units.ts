import { supabase } from "../supabase";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

// ─── Row types ───────────────────────────────────────────────────────────────
//
// This module deals in raw DB rows. It does NOT narrow string columns (status,
// block, type, level, owner_category) to their literal unions — that narrowing
// is a consumer-facing domain declaration and stays in the hook alongside the
// `Unit` view type. Keeping the api at the "wire format" level means future
// consumers are not forced to adopt the hook's literal-union surface.

export type UnitRow = Tables<"units">;
export type UnitHistoryRow = Tables<"unit_history">;

// ─── Write payload types ─────────────────────────────────────────────────────

/** Insert payload for the `units` table — raw DB-shaped object. */
export type CreateUnitPayload = TablesInsert<"units">;

/** Update patch for the `units` table — raw DB-shaped partial. */
export type UpdateUnitPayload = TablesUpdate<"units">;

/** Insert payload for a single `unit_history` row. */
export type InsertUnitHistoryPayload = TablesInsert<"unit_history">;

// ─── Reads ───────────────────────────────────────────────────────────────────

/**
 * List every unit, ordered by creation time ascending. The canonical
 * ordering for the portfolio view. Empty result is not an error.
 */
export async function listUnits(): Promise<ApiResult<UnitRow[]>> {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as UnitRow[]);
}

/**
 * Resolve a unit's server-side record id (`units.id`) from the human-facing
 * unit code stored in `units.unit_id`. Returns `null` when no row matches —
 * that is NOT an error, because callers distinguish "missing unit" from
 * "DB failure" and surface different Albanian strings for each.
 *
 * Uses `.maybeSingle()` so zero rows resolves to `data = null` instead of
 * throwing.
 */
export async function findUnitRecordIdByCode(
  unitCode: string,
): Promise<ApiResult<string | null>> {
  const { data, error } = await supabase
    .from("units")
    .select("id")
    .eq("unit_id", unitCode)
    .maybeSingle();

  if (error) return apiFail(error.message);
  return apiOk(data?.id ?? null);
}

/**
 * List every `unit_history` row for a single unit, newest first. Used
 * by the unit-detail view to render the audit trail.
 */
export async function listUnitHistory(
  unitId: string,
): Promise<ApiResult<UnitHistoryRow[]>> {
  const { data, error } = await supabase
    .from("unit_history")
    .select("*")
    .eq("unit_id", unitId)
    .order("changed_at", { ascending: false });

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as UnitHistoryRow[]);
}

// ─── Writes ──────────────────────────────────────────────────────────────────

/**
 * Insert a unit row and return the persisted row. The caller needs
 * the returned row to reconcile local state (server-assigned id,
 * created_at, any DB-side defaults).
 */
export async function createUnit(
  payload: CreateUnitPayload,
): Promise<ApiResult<UnitRow>> {
  const { data, error } = await supabase
    .from("units")
    .insert([payload])
    .select()
    .single();

  if (error) return apiFail(error.message);
  return apiOk(data as UnitRow);
}

/**
 * Update a unit row by id and return the persisted row. The caller
 * reconciles local state from the returned row. Writing to
 * `unit_history` is the caller's responsibility — this function does
 * NOT implicitly audit, because history-row construction requires the
 * previous snapshot, which only the consumer holds.
 */
export async function updateUnit(
  id: string,
  patch: UpdateUnitPayload,
): Promise<ApiResult<UnitRow>> {
  const { data, error } = await supabase
    .from("units")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return apiFail(error.message);
  return apiOk(data as UnitRow);
}

/**
 * Delete a unit row by id. Return shape mirrors the hook's existing
 * contract: `{ error: null }` on success, `{ error: string }` on
 * failure. No payload on success.
 */
export async function deleteUnit(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("units")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Bulk rename every unit whose (owner_category, owner_name) pair
 * matches the given tuple. Returns the persisted rows so the caller
 * can build per-row history entries and reconcile its local list.
 *
 * `updatedAt` is supplied by the caller so timing decisions (and
 * batching across multiple writes) stay consumer-side.
 */
export async function bulkRenameOwner(params: {
  category: string;
  currentName: string;
  nextName: string;
  updatedAt: string;
}): Promise<ApiResult<UnitRow[]>> {
  const { data, error } = await supabase
    .from("units")
    .update({
      owner_name: params.nextName,
      updated_at: params.updatedAt,
    })
    .eq("owner_category", params.category)
    .eq("owner_name", params.currentName)
    .select();

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as UnitRow[]);
}

/**
 * Bulk-expire reservations on the given unit ids: flip status back to
 * "Në dispozicion" and clear `reservation_expires_at`. One UPDATE, no
 * loop. The caller decides which ids qualify — the set of expired
 * reservations is a product decision (date comparison) that depends on
 * current time and therefore stays consumer-side.
 *
 * Returns the persisted rows so callers can reconcile local state
 * without paying for a second full-table read when the write succeeds.
 * No-op when `unitIds` is empty.
 */
export async function expireReservations(
  unitIds: string[],
): Promise<ApiResult<UnitRow[]>> {
  if (unitIds.length === 0) return apiOk([]);

  const { data, error } = await supabase
    .from("units")
    .update({ status: "Në dispozicion", reservation_expires_at: null })
    .in("id", unitIds)
    .select();

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as UnitRow[]);
}

// ─── History writes ──────────────────────────────────────────────────────────

/**
 * Insert one or many `unit_history` rows. A single primitive that
 * covers both the single-update case and the bulk-rename case — the
 * caller always passes an array. No-op when the array is empty.
 *
 * History writes are intentionally error-returning, not throwing:
 * callers may choose to treat a failed audit write as non-blocking
 * (the primary write has already succeeded) and that decision belongs
 * to the consumer, not the api.
 */
export async function insertUnitHistoryRows(
  rows: InsertUnitHistoryPayload[],
): Promise<{ error: string | null }> {
  if (rows.length === 0) return { error: null };

  const { error } = await supabase.from("unit_history").insert(rows);

  if (error) return { error: error.message };
  return { error: null };
}
