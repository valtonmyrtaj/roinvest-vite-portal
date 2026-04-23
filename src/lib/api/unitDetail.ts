import { supabase } from "../supabase";
import type { Tables } from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

export interface UnitDetailSnapshot {
  unit: Tables<"units">;
  activeSale: Pick<
    Tables<"unit_sales">,
    "final_price" | "sale_date" | "buyer_name" | "payment_type" | "crm_lead_id"
  > | null;
  activeReservation: {
    reservation_id: string;
    showing_id: string | null;
    expires_at: string | null;
  } | null;
}

export async function getUnitDetailSnapshot(
  unitId: string,
): Promise<ApiResult<UnitDetailSnapshot>> {
  const [unitResult, saleResult, reservationResult] = await Promise.all([
    supabase.from("units").select("*").eq("id", unitId).maybeSingle(),
    supabase
      .from("unit_sales")
      .select("final_price,sale_date,buyer_name,payment_type,crm_lead_id")
      .eq("unit_id", unitId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("unit_reservations")
      .select("id,showing_id,expires_at")
      .eq("unit_id", unitId)
      .eq("status", "Aktive")
      .maybeSingle(),
  ]);

  const error = unitResult.error ?? saleResult.error ?? reservationResult.error;

  if (error) {
    return apiFail(error.message);
  }

  if (!unitResult.data) {
    return apiFail("Njësia nuk u gjet.");
  }

  return apiOk({
    unit: unitResult.data,
    activeSale: saleResult.data
      ? {
          final_price: saleResult.data.final_price,
          sale_date: saleResult.data.sale_date,
          buyer_name: saleResult.data.buyer_name,
          payment_type: saleResult.data.payment_type,
          crm_lead_id: saleResult.data.crm_lead_id,
        }
      : null,
    activeReservation: reservationResult.data
      ? {
          reservation_id: reservationResult.data.id,
          showing_id: reservationResult.data.showing_id,
          expires_at: reservationResult.data.expires_at,
        }
      : null,
  });
}
