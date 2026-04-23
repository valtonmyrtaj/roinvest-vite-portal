import { supabase } from "../supabase";
import type { Database, Tables } from "../database.types";
import type { PaymentRow } from "./payments";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";
import { findActiveReservationLinkByUnit } from "./reservations";

// ─── Row type ────────────────────────────────────────────────────────────────

/** Raw `unit_sales` row as returned by the driver. */
export type UnitSaleRow = Tables<"unit_sales">;

export type SalesOwnerScope =
  | "Investitor"
  | "Pronarët e tokës"
  | "Kompani ndërtimore"
  | "all";

export type SalesUnitRow = Pick<
  Tables<"units">,
  | "id"
  | "unit_id"
  | "block"
  | "type"
  | "level"
  | "size"
  | "price"
  | "status"
  | "owner_category"
  | "owner_name"
  | "created_at"
  | "updated_at"
> & {
  final_price: number | null;
  sale_date: string | null;
  buyer_name: string | null;
  payment_type: string | null;
  crm_lead_id: string | null;
};

export interface UpcomingSalePaymentRow {
  payment: PaymentRow;
  unit: SalesUnitRow;
}

const SALES_UNIT_SELECT =
  "id,unit_id,block,type,level,size,price,status,owner_category,owner_name,created_at,updated_at";

type UpcomingSalePaymentRpcRow =
  Database["public"]["Functions"]["list_sales_upcoming_payments"]["Returns"][number];

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

export async function listSaleUnitsByIds(
  unitIds: string[],
): Promise<ApiResult<SalesUnitRow[]>> {
  const normalizedUnitIds = Array.from(new Set(unitIds.filter(Boolean)));

  if (normalizedUnitIds.length === 0) {
    return apiOk([]);
  }

  const [unitsResult, activeSalesResult] = await Promise.all([
    supabase
      .from("units")
      .select(SALES_UNIT_SELECT)
      .in("id", normalizedUnitIds),
    supabase
      .from("unit_sales")
      .select("unit_id,final_price,sale_date,buyer_name,payment_type,crm_lead_id")
      .eq("status", "active")
      .in("unit_id", normalizedUnitIds),
  ]);

  const error = unitsResult.error ?? activeSalesResult.error;

  if (error) {
    return apiFail(error.message);
  }

  const activeSaleByUnitId = new Map(
    (activeSalesResult.data ?? []).map((row) => [
      row.unit_id,
      {
        final_price: row.final_price,
        sale_date: row.sale_date,
        buyer_name: row.buyer_name,
        payment_type: row.payment_type,
        crm_lead_id: row.crm_lead_id,
      },
    ]),
  );

  const sortedUnits = [...(unitsResult.data ?? [])].sort((left, right) => {
    const leftIndex = normalizedUnitIds.indexOf(left.id);
    const rightIndex = normalizedUnitIds.indexOf(right.id);
    return leftIndex - rightIndex;
  });

  return apiOk(
    sortedUnits.map((row) => {
      const activeSale = activeSaleByUnitId.get(row.id);
      return {
        ...row,
        final_price: activeSale?.final_price ?? null,
        sale_date: activeSale?.sale_date ?? null,
        buyer_name: activeSale?.buyer_name ?? null,
        payment_type: activeSale?.payment_type ?? null,
        crm_lead_id: activeSale?.crm_lead_id ?? null,
      };
    }),
  );
}

export async function getSaleUnitById(
  unitId: string,
): Promise<ApiResult<SalesUnitRow | null>> {
  const result = await listSaleUnitsByIds([unitId]);

  if (result.error) {
    return apiFail(result.error);
  }

  return apiOk(result.data?.[0] ?? null);
}

export async function listUpcomingSalePayments(
  ownerScope: SalesOwnerScope,
): Promise<ApiResult<UpcomingSalePaymentRow[]>> {
  const { data, error } = await supabase.rpc("list_sales_upcoming_payments", {
    p_owner_scope: ownerScope,
  });

  if (error) {
    return apiFail(error.message);
  }

  return apiOk((data ?? []).map(mapUpcomingSalePaymentRpcRow));
}

function mapUpcomingSalePaymentRpcRow(
  row: UpcomingSalePaymentRpcRow,
): UpcomingSalePaymentRow {
  return {
    payment: {
      id: row.payment_id,
      unit_id: row.payment_unit_id,
      sale_id: row.payment_sale_id,
      installment_number: row.payment_installment_number,
      amount: row.payment_amount,
      due_date: row.payment_due_date,
      paid_date: row.payment_paid_date,
      status: row.payment_status as PaymentRow["status"],
      notes: row.payment_notes,
      created_at: row.payment_created_at,
    },
    unit: {
      id: row.unit_id,
      unit_id: row.unit_code,
      block: row.unit_block,
      type: row.unit_type,
      level: row.unit_level,
      size: row.unit_size,
      price: row.unit_price,
      status: row.unit_status,
      owner_category: row.unit_owner_category,
      owner_name: row.unit_owner_name,
      created_at: row.unit_created_at,
      updated_at: row.unit_updated_at,
      final_price: row.sale_final_price,
      sale_date: row.sale_date,
      buyer_name: row.sale_buyer_name,
      payment_type: row.sale_payment_type,
      crm_lead_id: row.sale_crm_lead_id,
    },
  };
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

export async function completeUnitSale(
  input: CompleteUnitSaleInput,
): Promise<ApiResult<CompleteUnitSaleRpcReturn>> {
  let reservationId: string | null = input.reservation_id ?? null;

  if (!reservationId && input.autoResolveReservation !== false) {
    const { data: activeReservation, error: resolveError } =
      await findActiveReservationLinkByUnit(input.unitRecordId);
    if (resolveError) return apiFail(resolveError);
    if (activeReservation && !input.showing_id) {
      return apiFail(DIRECT_SALE_ACTIVE_RESERVATION_ERROR);
    }
    reservationId = activeReservation?.reservation_id ?? null;
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
