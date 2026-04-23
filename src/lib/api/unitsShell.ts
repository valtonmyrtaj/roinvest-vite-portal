import { supabase } from "../supabase";
import type { Tables } from "../database.types";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

export interface UnitsShellFilters {
  stockCategory?: string;
  stockEntity?: string;
}

export interface ActiveReservationShellRow
  extends Pick<
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
    | "reservation_expires_at"
    | "created_at"
    | "updated_at"
  > {
  active_reservation_id: string | null;
  active_reservation_showing_id: string | null;
}

export interface UnitsShellSnapshot {
  totalUnits: number;
  availableUnitsCount: number;
  activeReservationsCount: number;
  ownerOptionsByCategory: {
    Investitor: string[];
    "Pronarët e tokës": string[];
    "Kompani ndërtimore": string[];
  };
  ownershipCounts: {
    Investitor: number;
    "Pronarët e tokës": number;
    "Kompani ndërtimore": number;
  };
  stockCounts: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
  };
  activeReservations: ActiveReservationShellRow[];
}

type UnitsOwnerCategory = "Investitor" | "Pronarët e tokës" | "Kompani ndërtimore";

type OwnerOptionsByCategory = Record<UnitsOwnerCategory, string[]>;

const OWNER_CATEGORIES = [
  "Investitor",
  "Pronarët e tokës",
  "Kompani ndërtimore",
] as const satisfies readonly UnitsOwnerCategory[];

function createEmptyOwnerOptions(): OwnerOptionsByCategory {
  return {
    Investitor: [],
    "Pronarët e tokës": [],
    "Kompani ndërtimore": [],
  };
}

function sortOwnerNames(names: string[]): string[] {
  return [...names].sort((a, b) =>
    a.localeCompare(b, "sq", { sensitivity: "base" }),
  );
}

function rowsToOwnerOptions(
  rows: Array<{ category: string | null; name: string | null }>,
): OwnerOptionsByCategory {
  const ownerOptions = createEmptyOwnerOptions();

  rows.forEach((row) => {
    const category = row.category as UnitsOwnerCategory | null;
    const name = typeof row.name === "string" ? row.name.trim() : "";

    if (!category || !OWNER_CATEGORIES.includes(category) || !name) {
      return;
    }

    ownerOptions[category].push(name);
  });

  return {
    Investitor: sortOwnerNames(ownerOptions.Investitor),
    "Pronarët e tokës": sortOwnerNames(ownerOptions["Pronarët e tokës"]),
    "Kompani ndërtimore": sortOwnerNames(ownerOptions["Kompani ndërtimore"]),
  };
}

const ACTIVE_RESERVATION_UNITS_SELECT =
  "id,unit_id,block,type,level,size,price,status,owner_category,owner_name,reservation_expires_at,created_at,updated_at";

export async function getUnitsShellSnapshot(
  filters: UnitsShellFilters,
): Promise<ApiResult<UnitsShellSnapshot>> {
  const [
    summaryResult,
    activeReservationUnitsResult,
    activeReservationTruthResult,
    ownerOptionsResult,
  ] = await Promise.all([
    supabase.rpc("get_units_shell_summary", {
      p_stock_category: filters.stockCategory || undefined,
      p_stock_entity: filters.stockEntity || undefined,
    }),
    supabase
      .from("units")
      .select(ACTIVE_RESERVATION_UNITS_SELECT)
      .eq("status", "E rezervuar")
      .not("reservation_expires_at", "is", null)
      .order("reservation_expires_at", { ascending: true }),
    supabase
      .from("unit_reservations")
      .select("id,unit_id,showing_id,expires_at")
      .eq("status", "Aktive"),
    supabase.rpc("list_unit_owner_options"),
  ]);

  const error =
    summaryResult.error ??
    activeReservationUnitsResult.error ??
    activeReservationTruthResult.error ??
    ownerOptionsResult.error;

  if (error) {
    return apiFail(error.message);
  }

  const reservationTruthByUnitId = new Map(
    (activeReservationTruthResult.data ?? []).map((row) => [
      row.unit_id,
      {
        reservationId: row.id,
        showingId: row.showing_id,
        expiresAt: row.expires_at,
      },
    ]),
  );

  const activeReservations = ((activeReservationUnitsResult.data ?? []) as Array<
    Pick<
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
      | "reservation_expires_at"
      | "created_at"
      | "updated_at"
    >
  >)
    .map((row) => {
      const truth = reservationTruthByUnitId.get(row.id);
      return {
        ...row,
        reservation_expires_at: row.reservation_expires_at ?? truth?.expiresAt ?? null,
        active_reservation_id: truth?.reservationId ?? null,
        active_reservation_showing_id: truth?.showingId ?? null,
      };
    })
    .filter((row) => Boolean(row.reservation_expires_at));

  const summaryRow = summaryResult.data?.[0] ?? null;
  const ownerOptionsByCategory = rowsToOwnerOptions(
    (ownerOptionsResult.data ?? []) as Array<{ category: string | null; name: string | null }>,
  );

  return apiOk({
    totalUnits: summaryRow?.total_units ?? 0,
    availableUnitsCount: summaryRow?.available_units_count ?? 0,
    activeReservationsCount: activeReservations.length,
    ownerOptionsByCategory,
    ownershipCounts: {
      Investitor: summaryRow?.investitor_units_count ?? 0,
      "Pronarët e tokës": summaryRow?.land_owners_units_count ?? 0,
      "Kompani ndërtimore": summaryRow?.construction_companies_units_count ?? 0,
    },
    stockCounts: {
      total: summaryRow?.scope_total_count ?? 0,
      available: summaryRow?.scope_available_count ?? 0,
      reserved: summaryRow?.scope_reserved_count ?? 0,
      sold: summaryRow?.scope_sold_count ?? 0,
    },
    activeReservations,
  });
}
