import { supabase } from "../supabase";
import type { Database, Tables } from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

// ─── Row type ────────────────────────────────────────────────────────────────

/** Raw `unit_sales` row as returned by the driver. */
export type UnitSaleRow = Tables<"unit_sales">;
type UnitReservationRow = Tables<"unit_reservations">;

export interface ActiveReservationLink {
  reservation_id: string;
  unit_id: string;
  showing_id: string | null;
}

// ─── Reads ───────────────────────────────────────────────────────────────────

/**
 * List every currently-active sale across the portfolio. Used by the
 * units view to layer sale-truth (final_price, buyer, payment_type,
 * crm_lead_id) on top of the units list. Empty result is not an error.
 *
 * "Active" status filtering happens server-side so consumers never
 * need to know the literal value of the status column.
 */
export async function listActiveSales(): Promise<ApiResult<UnitSaleRow[]>> {
  const { data, error } = await supabase
    .from("unit_sales")
    .select("*")
    .eq("status", "active");

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as UnitSaleRow[]);
}

/**
 * List the minimal active-reservation linkage the frontend may safely consume
 * for preflight decisions and to avoid mutating the `units` reservation mirror
 * while an authoritative reservation row is still active.
 */
export async function listActiveReservationLinks(): Promise<
  ApiResult<ActiveReservationLink[]>
> {
  const { data, error } = await supabase
    .from("unit_reservations")
    .select("id, unit_id, showing_id")
    .eq("status", "Aktive");

  if (error) return apiFail(error.message);
  return apiOk(
    ((data ?? []) as Array<Pick<UnitReservationRow, "id" | "unit_id" | "showing_id">>).map(
      (row) => ({
        reservation_id: row.id,
        unit_id: row.unit_id,
        showing_id: row.showing_id,
      }),
    ),
  );
}

// ─── Domain types (RPC-facing) ───────────────────────────────────────────────

export type SalePaymentType = "Pagesë e plotë" | "Me këste";

export interface SaleInstallmentInput {
  installment_number?: number;
  due_date: string;
  amount: number;
  notes?: string | null;
}

export interface CompleteUnitSaleInput {
  unitRecordId: string;
  sale_date: string;
  final_price: number;
  buyer_name: string;
  payment_type: SalePaymentType;
  notes?: string | null;
  crm_lead_id?: string | null;
  showing_id?: string | null;
  reservation_id?: string | null;
  installments?: SaleInstallmentInput[];
  autoResolveReservation?: boolean;
}

export const DIRECT_SALE_ACTIVE_RESERVATION_ERROR =
  "Njësia ka rezervim aktiv. Shitja direkte nuk lejohet pa rezervimin përkatës. Për ta kompletuar, përdorni shfaqjen e lidhur ose lidhni rezervimin përkatës.";

type CompleteUnitSaleRpcArgs = Database["public"]["Functions"]["complete_unit_sale"]["Args"];
type CompleteUnitSaleRpcReturn = Database["public"]["Functions"]["complete_unit_sale"]["Returns"];

async function resolveActiveReservationId(
  unitRecordId: string,
): Promise<ApiResult<string | null>> {
  const { data, error } = await supabase
    .from("unit_reservations")
    .select("id")
    .eq("unit_id", unitRecordId)
    .eq("status", "Aktive")
    .maybeSingle();

  if (error) return apiFail(error.message);
  return apiOk(data?.id ?? null);
}

/**
 * Look up the id of the active reservation linked to a given showing. Used
 * by the showing → sale completion flow to thread the reservation through
 * the `complete_unit_sale` RPC so the reservation gets closed atomically.
 *
 * Returns `null` when no active reservation is linked — that is NOT an
 * error, because a showing that never produced a reservation still
 * legitimately completes as a sale.
 *
 * Reservations are currently owned by this module because the codebase
 * has no dedicated `api/reservations.ts` yet; grouping this lookup beside
 * `resolveActiveReservationId` and `completeUnitSale` keeps all reservation
 * reads in one place pending that future split.
 */
export async function findActiveReservationIdByShowing(
  showingId: string,
): Promise<ApiResult<string | null>> {
  const { data, error } = await supabase
    .from("unit_reservations")
    .select("id")
    .eq("showing_id", showingId)
    .eq("status", "Aktive")
    .maybeSingle();

  if (error) return apiFail(error.message);
  return apiOk(data?.id ?? null);
}

export async function completeUnitSale(
  input: CompleteUnitSaleInput,
): Promise<ApiResult<CompleteUnitSaleRpcReturn>> {
  let reservationId: string | null = input.reservation_id ?? null;

  if (!reservationId && input.autoResolveReservation !== false) {
    const { data: resolvedId, error: resolveError } =
      await resolveActiveReservationId(input.unitRecordId);
    if (resolveError) return apiFail(resolveError);
    if (resolvedId && !input.showing_id) {
      return apiFail(DIRECT_SALE_ACTIVE_RESERVATION_ERROR);
    }
    reservationId = resolvedId ?? null;
  }

  const rpcArgs: CompleteUnitSaleRpcArgs = {
    p_unit_id: input.unitRecordId,
    p_sale_date: input.sale_date,
    p_final_price: input.final_price,
    p_buyer_name: input.buyer_name,
    p_payment_type: input.payment_type,
    p_notes: input.notes ?? undefined,
    p_crm_lead_id: input.crm_lead_id ?? undefined,
    p_installments:
      input.payment_type === "Me këste"
        ? (input.installments ?? []).map((installment, index) => ({
            installment_number: installment.installment_number ?? index + 1,
            due_date: installment.due_date,
            amount: installment.amount,
            notes: installment.notes ?? null,
          }))
        : [],
    p_showing_id: input.showing_id ?? undefined,
    p_reservation_id: reservationId ?? undefined,
  };

  const { data, error } = await supabase.rpc("complete_unit_sale", rpcArgs);

  if (error) return apiFail(error.message);
  return apiOk(data as CompleteUnitSaleRpcReturn);
}
