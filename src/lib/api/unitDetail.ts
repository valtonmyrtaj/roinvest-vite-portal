import { supabase } from "../supabase";
import type { Tables } from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

export interface UnitDetailSnapshot {
  unit: Tables<"units">;
  activeSale: Pick<
    Tables<"unit_sales">,
    "final_price" | "sale_date" | "buyer_name" | "buyer_phone" | "payment_type" | "crm_lead_id"
  > | null;
  activeReservation: {
    reservation_id: string;
    showing_id: string | null;
    contact_id: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    reserved_at: string | null;
    expires_at: string | null;
    notes: string | null;
  } | null;
}

export async function getUnitDetailSnapshot(
  unitId: string,
): Promise<ApiResult<UnitDetailSnapshot>> {
  const [unitResult, saleResult, reservationResult] = await Promise.all([
    supabase.from("units").select("*").eq("id", unitId).maybeSingle(),
    supabase
      .from("unit_sales")
      .select("final_price,sale_date,buyer_name,buyer_phone,payment_type,crm_lead_id")
      .eq("unit_id", unitId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("unit_reservations")
      .select("id,showing_id,contact_id,reserved_at,expires_at,notes")
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

  let reservationContact: ReservationContactSnapshot = {
    contact_name: null,
    contact_phone: null,
  };

  if (reservationResult.data?.showing_id) {
    const contactResult = await loadShowingContactSnapshot(
      reservationResult.data.showing_id,
    );
    if (!contactResult.error) {
      reservationContact = contactResult.data ?? reservationContact;
    }
  } else if (reservationResult.data?.contact_id) {
    const contactResult = await loadLeadContactSnapshot(
      reservationResult.data.contact_id,
    );
    if (!contactResult.error) {
      reservationContact = contactResult.data ?? reservationContact;
    }
  }

  return apiOk({
    unit: unitResult.data,
    activeSale: saleResult.data
      ? {
          final_price: saleResult.data.final_price,
          sale_date: saleResult.data.sale_date,
          buyer_name: saleResult.data.buyer_name,
          buyer_phone: saleResult.data.buyer_phone,
          payment_type: saleResult.data.payment_type,
          crm_lead_id: saleResult.data.crm_lead_id,
        }
      : null,
    activeReservation: reservationResult.data
      ? {
          reservation_id: reservationResult.data.id,
          showing_id: reservationResult.data.showing_id,
          contact_id: reservationResult.data.contact_id,
          contact_name: reservationContact.contact_name,
          contact_phone: reservationContact.contact_phone,
          reserved_at: reservationResult.data.reserved_at,
          expires_at: reservationResult.data.expires_at,
          notes: reservationResult.data.notes,
        }
      : null,
  });
}

type ReservationContactSnapshot = {
  contact_name: string | null;
  contact_phone: string | null;
};

type ShowingContactRow = Pick<
  Tables<"crm_showings">,
  "manual_contact_name" | "manual_contact_phone"
> & {
  crm_leads: { name: string | null; phone: string | null } | null;
};

async function loadShowingContactSnapshot(
  showingId: string,
): Promise<ApiResult<ReservationContactSnapshot>> {
  const { data, error } = await supabase
    .from("crm_showings")
    .select("manual_contact_name, manual_contact_phone, crm_leads!contact_id(name,phone)")
    .eq("id", showingId)
    .maybeSingle();

  if (error) return apiFail(error.message);

  const row = data as unknown as ShowingContactRow | null;
  return apiOk({
    contact_name: row?.manual_contact_name ?? row?.crm_leads?.name ?? null,
    contact_phone: row?.manual_contact_phone ?? row?.crm_leads?.phone ?? null,
  });
}

async function loadLeadContactSnapshot(
  contactId: string,
): Promise<ApiResult<ReservationContactSnapshot>> {
  const { data, error } = await supabase
    .from("crm_leads")
    .select("name,phone")
    .eq("id", contactId)
    .maybeSingle();

  if (error) return apiFail(error.message);

  return apiOk({
    contact_name: data?.name ?? null,
    contact_phone: data?.phone ?? null,
  });
}
