import { supabase } from "../supabase";
import type { Tables, TablesInsert, TablesUpdate } from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

// ─── Row types ───────────────────────────────────────────────────────────────
//
// Raw DB rows. Literal-union string columns (lead status, showing status /
// outcome) are NOT narrowed here — the hook owns that product surface via its
// own exported literal unions. Keeping the api at wire-format level means no
// future consumer is forced to adopt the hook's domain types.

export type CRMLeadRow = Tables<"crm_leads">;
export type ShowingRow = Tables<"crm_showings">;
export type DailyLogRow = Tables<"crm_daily_log">;

/**
 * Showing row with the embedded crm_leads name join. Shape is dictated by the
 * `*, crm_leads!contact_id(name)` SELECT projection used by all showing reads,
 * so consumers can flatten the nested lead name without a second round-trip.
 */
export type ShowingRowWithLead = ShowingRow & {
  crm_leads: { name: string } | null;
};

// ─── Payload aliases ─────────────────────────────────────────────────────────

export type CreateLeadPayload = TablesInsert<"crm_leads">;
export type UpdateLeadPatch = TablesUpdate<"crm_leads">;

export type CreateShowingPayload = TablesInsert<"crm_showings">;
export type UpdateShowingPatch = TablesUpdate<"crm_showings">;

export type CreateDailyLogPayload = TablesInsert<"crm_daily_log">;
export type UpdateDailyLogPatch = TablesUpdate<"crm_daily_log">;

// ─── Leads ───────────────────────────────────────────────────────────────────

/** List every lead, ordered by creation time descending. */
export async function listLeads(): Promise<ApiResult<CRMLeadRow[]>> {
  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as CRMLeadRow[]);
}

/** Insert a lead and return the persisted row. */
export async function createLead(
  payload: CreateLeadPayload,
): Promise<ApiResult<CRMLeadRow>> {
  const { data, error } = await supabase
    .from("crm_leads")
    .insert([payload])
    .select()
    .single();

  if (error) return apiFail(error.message);
  return apiOk(data as CRMLeadRow);
}

/** Update a lead by id and return the persisted row. */
export async function updateLead(
  id: string,
  patch: UpdateLeadPatch,
): Promise<ApiResult<CRMLeadRow>> {
  const { data, error } = await supabase
    .from("crm_leads")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return apiFail(error.message);
  return apiOk(data as CRMLeadRow);
}

/** Delete a lead by id. */
export async function deleteLead(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("crm_leads").delete().eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

// ─── Showings ────────────────────────────────────────────────────────────────
//
// Every showing read includes the `crm_leads!contact_id(name)` join. Writes
// return the same projection so the caller's row-normalizer sees a consistent
// shape across list / create / update.

const SHOWING_WITH_LEAD_SELECT = "*, crm_leads!contact_id(name)";

/** List every showing, ordered by DB `date` ascending. */
export async function listShowings(): Promise<
  ApiResult<ShowingRowWithLead[]>
> {
  const { data, error } = await supabase
    .from("crm_showings")
    .select(SHOWING_WITH_LEAD_SELECT)
    .order("date", { ascending: true });

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as unknown as ShowingRowWithLead[]);
}

/**
 * Insert a showing and return the persisted row with the lead name join.
 * The payload is DB-shaped (`contact_id`, `date`, `time`, `unit_record_id`,
 * `status`, `outcome`, `notes`) — the caller owns any view-layer translation.
 */
export async function createShowing(
  payload: CreateShowingPayload,
): Promise<ApiResult<ShowingRowWithLead>> {
  const { data, error } = await supabase
    .from("crm_showings")
    .insert(payload)
    .select(SHOWING_WITH_LEAD_SELECT)
    .single();

  if (error) return apiFail(error.message);
  return apiOk(data as unknown as ShowingRowWithLead);
}

/**
 * Update a showing by id and return the persisted row with the lead name join.
 */
export async function updateShowing(
  id: string,
  patch: UpdateShowingPatch,
): Promise<ApiResult<ShowingRowWithLead>> {
  const { data, error } = await supabase
    .from("crm_showings")
    .update(patch)
    .eq("id", id)
    .select(SHOWING_WITH_LEAD_SELECT)
    .single();

  if (error) return apiFail(error.message);
  return apiOk(data as unknown as ShowingRowWithLead);
}

/** Delete a showing by id. */
export async function deleteShowing(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("crm_showings")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Daily Log ───────────────────────────────────────────────────────────────

/** List every daily-log entry, ordered by DB `date` descending. */
export async function listDailyLog(): Promise<ApiResult<DailyLogRow[]>> {
  const { data, error } = await supabase
    .from("crm_daily_log")
    .select("*")
    .order("date", { ascending: false });

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as DailyLogRow[]);
}

/** Insert a daily-log entry and return the persisted row. */
export async function createDailyLogEntry(
  payload: CreateDailyLogPayload,
): Promise<ApiResult<DailyLogRow>> {
  const { data, error } = await supabase
    .from("crm_daily_log")
    .insert([payload])
    .select()
    .single();

  if (error) return apiFail(error.message);
  return apiOk(data as DailyLogRow);
}

/** Update a daily-log entry by id and return the persisted row. */
export async function updateDailyLogEntry(
  id: string,
  patch: UpdateDailyLogPatch,
): Promise<ApiResult<DailyLogRow>> {
  const { data, error } = await supabase
    .from("crm_daily_log")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return apiFail(error.message);
  return apiOk(data as DailyLogRow);
}

/** Delete a daily-log entry by id. */
export async function deleteDailyLogEntry(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("crm_daily_log")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}
