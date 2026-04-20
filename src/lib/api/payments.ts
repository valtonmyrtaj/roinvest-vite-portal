import { supabase } from "../supabase";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

// ─── Domain literal types ────────────────────────────────────────────────────

/**
 * The two canonical values the DB persists for `unit_payments.status`.
 * UI-derived statuses (e.g. the "E vonuar" overdue state) are layered
 * on top by the consumer based on the current date and are NOT known
 * to this module. Keeping that derivation out of the api is deliberate:
 * the api must return the same row regardless of when it is called.
 */
export type PaymentDbStatus = "E papaguar" | "E paguar";

// ─── Row type ────────────────────────────────────────────────────────────────

/**
 * Projection returned by every read in this module. Structurally
 * equivalent to `Tables<"unit_payments">` with `status` narrowed to the
 * two values the DB actually persists, so consumers never have to cast.
 * Narrowing here is a declaration about the DB contract, not an
 * interpretation of its content.
 */
export type PaymentRow = Omit<Tables<"unit_payments">, "status"> & {
  status: PaymentDbStatus;
};

// ─── Write payload types ─────────────────────────────────────────────────────

/**
 * Insert payload — the raw DB-shaped object the driver accepts. The
 * api does NOT invent any field; the caller is responsible for
 * constructing the full payload (including initial status).
 */
export type CreatePaymentPayload = TablesInsert<"unit_payments">;

/** Update patch — same contract. Partial by construction. */
export type UpdatePaymentPatch = TablesUpdate<"unit_payments">;

// ─── Reads ───────────────────────────────────────────────────────────────────

/**
 * List every payment for a single unit, ordered by installment number
 * ascending. Empty result is not an error.
 */
export async function listPayments(
  unitId: string,
): Promise<ApiResult<PaymentRow[]>> {
  const { data, error } = await supabase
    .from("unit_payments")
    .select("*")
    .eq("unit_id", unitId)
    .order("installment_number", { ascending: true });

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as PaymentRow[]);
}

/**
 * List every payment across every unit, ordered by due date ascending.
 * Used by the portfolio-wide payments view.
 */
export async function listAllPayments(): Promise<ApiResult<PaymentRow[]>> {
  const { data, error } = await supabase
    .from("unit_payments")
    .select("*")
    .order("due_date", { ascending: true });

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as PaymentRow[]);
}

/**
 * Find the id of the single currently-active sale for a unit, if any.
 * Returns `null` in `data` when no active sale exists — that is NOT an
 * error, it is a legitimate domain state. The caller decides whether a
 * missing active sale should block the operation.
 *
 * This belongs to the payments module (not to a sales module) because
 * its only current purpose is to resolve the `sale_id` foreign key
 * when creating a payment without one passed in.
 */
export async function findActiveSaleIdForUnit(
  unitId: string,
): Promise<ApiResult<string | null>> {
  const { data, error } = await supabase
    .from("unit_sales")
    .select("id")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  if (error) return apiFail(error.message);
  return apiOk(data?.id ?? null);
}

// ─── Writes ──────────────────────────────────────────────────────────────────

/**
 * Insert a payment row and return the persisted row. The caller needs
 * the returned row to reconcile its local state (server-assigned id,
 * created_at, any DB-side defaults).
 */
export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<ApiResult<PaymentRow>> {
  const { data, error } = await supabase
    .from("unit_payments")
    .insert([payload])
    .select("*")
    .single();

  if (error) return apiFail(error.message);
  return apiOk(data as PaymentRow);
}

/**
 * Update a payment row by id and return the persisted row. The caller
 * needs the returned row to reconcile its local state because the
 * patch may not contain every field the UI displays.
 */
export async function updatePayment(
  id: string,
  patch: UpdatePaymentPatch,
): Promise<ApiResult<PaymentRow>> {
  const { data, error } = await supabase
    .from("unit_payments")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return apiFail(error.message);
  return apiOk(data as PaymentRow);
}

/**
 * Delete a payment row. Return shape mirrors the hook's existing
 * public contract: `{ error: null }` on success, `{ error: string }`
 * on failure. No payload is returned on success — the caller removes
 * the row from local state by id.
 */
export async function deletePayment(
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("unit_payments")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}
