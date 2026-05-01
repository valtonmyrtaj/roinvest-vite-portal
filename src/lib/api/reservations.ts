import { supabase } from "../supabase";
import type { Database, Tables } from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

export type UnitReservationRow = Tables<"unit_reservations">;

export interface ActiveReservationLink {
  reservation_id: string;
  unit_id: string;
  showing_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
}

export interface ActiveReservationDetail extends ActiveReservationLink {
  contact_id: string | null;
  reserved_at: string;
  expires_at: string | null;
  notes: string | null;
  status: string;
  updated_at: string;
}

export interface CreateUnitReservationInput {
  unitRecordId: string;
  contactId?: string | null;
  showingId?: string | null;
  reservedAt?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
}

export interface ExpireUnitReservationsInput {
  unitRecordIds?: string[];
  cutoff?: string | null;
}

export interface ExtendUnitReservationInput {
  reservationId: string;
  expiresAt: string;
  notes?: string | null;
}

export interface CancelUnitReservationInput {
  reservationId: string;
  notes?: string | null;
}

type CreateUnitReservationRpcArgs =
  Database["public"]["Functions"]["create_unit_reservation"]["Args"];
type CreateUnitReservationRpcReturn =
  Database["public"]["Functions"]["create_unit_reservation"]["Returns"];
type ExpireUnitReservationsRpcArgs =
  Database["public"]["Functions"]["expire_unit_reservations"]["Args"];
type ExpireUnitReservationsRpcReturn =
  Database["public"]["Functions"]["expire_unit_reservations"]["Returns"];
type ExtendUnitReservationRpcArgs =
  Database["public"]["Functions"]["extend_unit_reservation"]["Args"];
type ExtendUnitReservationRpcReturn =
  Database["public"]["Functions"]["extend_unit_reservation"]["Returns"];
type CancelUnitReservationRpcArgs =
  Database["public"]["Functions"]["cancel_unit_reservation"]["Args"];
type CancelUnitReservationRpcReturn =
  Database["public"]["Functions"]["cancel_unit_reservation"]["Returns"];

const ACTIVE_RESERVATION_STATUS = "Aktive";

type ReservationContactSnapshot = {
  contact_name: string | null;
  contact_phone: string | null;
};

type ShowingContactRow = Pick<
  Tables<"crm_showings">,
  "id" | "manual_contact_name" | "manual_contact_phone"
> & {
  crm_leads: { name: string | null; phone: string | null } | null;
};

async function appendShowingContactSnapshots<
  T extends { showing_id: string | null },
>(rows: T[]): Promise<ApiResult<Array<T & ReservationContactSnapshot>>> {
  const showingIds = [
    ...new Set(rows.map((row) => row.showing_id).filter((id): id is string => Boolean(id))),
  ];

  if (showingIds.length === 0) {
    return apiOk(
      rows.map((row) => ({
        ...row,
        contact_name: null,
        contact_phone: null,
      })),
    );
  }

  const { data, error } = await supabase
    .from("crm_showings")
    .select("id, manual_contact_name, manual_contact_phone, crm_leads!contact_id(name,phone)")
    .in("id", showingIds);

  if (error) return apiFail(error.message);

  const contactByShowingId = new Map<string, ReservationContactSnapshot>();

  ((data ?? []) as unknown as ShowingContactRow[]).forEach((row) => {
    contactByShowingId.set(row.id, {
      contact_name: row.manual_contact_name ?? row.crm_leads?.name ?? null,
      contact_phone: row.manual_contact_phone ?? row.crm_leads?.phone ?? null,
    });
  });

  return apiOk(
    rows.map((row) => {
      const contact = row.showing_id
        ? contactByShowingId.get(row.showing_id)
        : null;

      return {
        ...row,
        ...(contact ?? {
          contact_name: null,
          contact_phone: null,
        }),
      };
    }),
  );
}

export async function listActiveReservationLinks(): Promise<
  ApiResult<ActiveReservationLink[]>
> {
  const { data, error } = await supabase
    .from("unit_reservations")
    .select("id, unit_id, showing_id")
    .eq("status", ACTIVE_RESERVATION_STATUS);

  if (error) return apiFail(error.message);

  const mapped = (
    (data ?? []) as Array<Pick<UnitReservationRow, "id" | "unit_id" | "showing_id">>
  ).map((row) => ({
    reservation_id: row.id,
    unit_id: row.unit_id,
    showing_id: row.showing_id,
  }));

  return appendShowingContactSnapshots(mapped);
}

export async function listActiveReservationDetails(): Promise<
  ApiResult<ActiveReservationDetail[]>
> {
  const { data, error } = await supabase
    .from("unit_reservations")
    .select("id, unit_id, showing_id, contact_id, reserved_at, expires_at, notes, status, updated_at")
    .eq("status", ACTIVE_RESERVATION_STATUS);

  if (error) return apiFail(error.message);

  const mapped = (
    (data ?? []) as Array<
      Pick<
        UnitReservationRow,
        | "id"
        | "unit_id"
        | "showing_id"
        | "contact_id"
        | "reserved_at"
        | "expires_at"
        | "notes"
        | "status"
        | "updated_at"
      >
    >
  ).map((row) => ({
    reservation_id: row.id,
    unit_id: row.unit_id,
    showing_id: row.showing_id,
    contact_id: row.contact_id,
    reserved_at: row.reserved_at,
    expires_at: row.expires_at,
    notes: row.notes,
    status: row.status,
    updated_at: row.updated_at,
  }));

  return appendShowingContactSnapshots(mapped);
}

export async function listShowingReservationDetails(): Promise<
  ApiResult<ActiveReservationDetail[]>
> {
  const { data, error } = await supabase
    .from("unit_reservations")
    .select("id, unit_id, showing_id, contact_id, reserved_at, expires_at, notes, status, updated_at")
    .not("showing_id", "is", null)
    .order("updated_at", { ascending: false });

  if (error) return apiFail(error.message);

  const mapped = (
    (data ?? []) as Array<
      Pick<
        UnitReservationRow,
        | "id"
        | "unit_id"
        | "showing_id"
        | "contact_id"
        | "reserved_at"
        | "expires_at"
        | "notes"
        | "status"
        | "updated_at"
      >
    >
  ).map((row) => ({
    reservation_id: row.id,
    unit_id: row.unit_id,
    showing_id: row.showing_id,
    contact_id: row.contact_id,
    reserved_at: row.reserved_at,
    expires_at: row.expires_at,
    notes: row.notes,
    status: row.status,
    updated_at: row.updated_at,
  }));

  return appendShowingContactSnapshots(mapped);
}

export async function findActiveReservationLinkByUnit(
  unitRecordId: string,
): Promise<ApiResult<ActiveReservationLink | null>> {
  const { data, error } = await supabase
    .from("unit_reservations")
    .select("id, unit_id, showing_id")
    .eq("unit_id", unitRecordId)
    .eq("status", ACTIVE_RESERVATION_STATUS)
    .maybeSingle();

  if (error) return apiFail(error.message);
  if (!data) return apiOk(null);

  const contactResult = await appendShowingContactSnapshots([
    {
      reservation_id: data.id,
      unit_id: data.unit_id,
      showing_id: data.showing_id,
    },
  ]);

  if (contactResult.error) return apiFail(contactResult.error);

  return apiOk(contactResult.data?.[0] ?? null);
}

export async function findActiveReservationIdByShowing(
  showingId: string,
): Promise<ApiResult<string | null>> {
  const { data, error } = await supabase
    .from("unit_reservations")
    .select("id")
    .eq("showing_id", showingId)
    .eq("status", ACTIVE_RESERVATION_STATUS)
    .maybeSingle();

  if (error) return apiFail(error.message);
  return apiOk(data?.id ?? null);
}

export async function createUnitReservation(
  input: CreateUnitReservationInput,
): Promise<ApiResult<CreateUnitReservationRpcReturn>> {
  const rpcArgs: CreateUnitReservationRpcArgs = {
    p_unit_id: input.unitRecordId,
    p_contact_id: input.contactId ?? undefined,
    p_showing_id: input.showingId ?? undefined,
    p_reserved_at: input.reservedAt ?? undefined,
    p_expires_at: input.expiresAt ?? undefined,
    p_notes: input.notes ?? undefined,
  };

  const { data, error } = await supabase.rpc("create_unit_reservation", rpcArgs);

  if (error) return apiFail(error.message);
  return apiOk(data as CreateUnitReservationRpcReturn);
}

export async function expireUnitReservations(
  input: ExpireUnitReservationsInput = {},
): Promise<ApiResult<Tables<"units">[]>> {
  const rpcArgs: ExpireUnitReservationsRpcArgs = {
    p_unit_ids: input.unitRecordIds,
    p_cutoff: input.cutoff ?? undefined,
  };

  const { data, error } = await supabase.rpc("expire_unit_reservations", rpcArgs);

  if (error) return apiFail(error.message);
  return apiOk((data ?? []) as ExpireUnitReservationsRpcReturn);
}

export async function extendUnitReservation(
  input: ExtendUnitReservationInput,
): Promise<ApiResult<ExtendUnitReservationRpcReturn>> {
  const rpcArgs: ExtendUnitReservationRpcArgs = {
    p_reservation_id: input.reservationId,
    p_expires_at: input.expiresAt,
    p_notes: input.notes ?? undefined,
  };

  const { data, error } = await supabase.rpc("extend_unit_reservation", rpcArgs);

  if (error) return apiFail(error.message);
  return apiOk(data as ExtendUnitReservationRpcReturn);
}

export async function cancelUnitReservation(
  input: CancelUnitReservationInput,
): Promise<ApiResult<CancelUnitReservationRpcReturn>> {
  const rpcArgs: CancelUnitReservationRpcArgs = {
    p_reservation_id: input.reservationId,
    p_notes: input.notes ?? undefined,
  };

  const { data, error } = await supabase.rpc("cancel_unit_reservation", rpcArgs);

  if (error) return apiFail(error.message);
  return apiOk(data as CancelUnitReservationRpcReturn);
}
