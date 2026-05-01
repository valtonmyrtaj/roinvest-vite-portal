import { supabase } from "../supabase";
import type { Tables } from "../database.types";
import {
  getCanonicalUnitType,
  type CanonicalUnitType,
} from "../unitType";
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
    | "has_storage"
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
  ownerEntityCountsByCategory: OwnerEntityCountsByCategory;
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
  stockTypeCounts: StockTypeCounts;
  activeReservations: ActiveReservationShellRow[];
}

type UnitsOwnerCategory = "Investitor" | "Pronarët e tokës" | "Kompani ndërtimore";

type OwnerOptionsByCategory = Record<UnitsOwnerCategory, string[]>;
type CanonicalOwnerNamesByCategory = Record<UnitsOwnerCategory, Record<string, string>>;
export type OwnerEntityCountsByCategory = Record<UnitsOwnerCategory, Record<string, number>>;
export type StockTypeCounts = Record<CanonicalUnitType, number>;

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

function createEmptyOwnerEntityCounts(): OwnerEntityCountsByCategory {
  return {
    Investitor: {},
    "Pronarët e tokës": {},
    "Kompani ndërtimore": {},
  };
}

function createEmptyCanonicalOwnerNames(): CanonicalOwnerNamesByCategory {
  return {
    Investitor: {},
    "Pronarët e tokës": {},
    "Kompani ndërtimore": {},
  };
}

function createEmptyStockTypeCounts(): StockTypeCounts {
  return {
    Banesë: 0,
    Lokal: 0,
    Garazhë: 0,
    Penthouse: 0,
  };
}

function normalizeOwnerName(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function ownerNameKey(value: string): string {
  return normalizeOwnerName(value).toLocaleLowerCase("sq");
}

function rowsToStockTypeCounts(
  rows: Array<{ type: string | null; level: string | null }>,
): StockTypeCounts {
  const counts = createEmptyStockTypeCounts();

  rows.forEach((row) => {
    const canonicalType = getCanonicalUnitType(row.type, row.level);
    if (canonicalType) counts[canonicalType] += 1;
  });

  return counts;
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

function rowsToOwnerEntityCounts(
  optionRows: Array<{ category: string | null; name: string | null }>,
  unitRows: Array<{ owner_category: string | null; owner_name: string | null }>,
): OwnerEntityCountsByCategory {
  const counts = createEmptyOwnerEntityCounts();
  const canonicalNames = createEmptyCanonicalOwnerNames();

  optionRows.forEach((row) => {
    const category = row.category as UnitsOwnerCategory | null;
    const name = normalizeOwnerName(row.name);

    if (!category || !OWNER_CATEGORIES.includes(category) || !name) {
      return;
    }

    counts[category][name] = 0;
    canonicalNames[category][ownerNameKey(name)] = name;
  });

  unitRows.forEach((row) => {
    const category = row.owner_category as UnitsOwnerCategory | null;
    const name = normalizeOwnerName(row.owner_name);

    if (!category || !OWNER_CATEGORIES.includes(category) || !name) {
      return;
    }

    const key = ownerNameKey(name);
    const canonicalName = canonicalNames[category][key] ?? name;

    if (counts[category][canonicalName] === undefined) {
      counts[category][canonicalName] = 0;
      canonicalNames[category][key] = canonicalName;
    }

    counts[category][canonicalName] += 1;
  });

  return counts;
}

const ACTIVE_RESERVATION_UNITS_SELECT =
  "id,unit_id,block,type,level,size,price,status,owner_category,owner_name,reservation_expires_at,created_at,updated_at,has_storage";

type ActiveReservationTruthRow = {
  id: string;
  unit_id: string;
  showing_id: string | null;
  expires_at: string | null;
};

type ActiveReservationUnitRow = Pick<
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
  | "has_storage"
>;

function applyStockScope<TQuery extends { eq: (column: string, value: string) => TQuery }>(
  query: TQuery,
  filters: UnitsShellFilters,
): TQuery {
  let nextQuery = query;

  if (filters.stockCategory) {
    nextQuery = nextQuery.eq("owner_category", filters.stockCategory);
  }

  if (filters.stockEntity) {
    nextQuery = nextQuery.eq("owner_name", filters.stockEntity);
  }

  return nextQuery;
}

export async function getUnitsShellSnapshot(
  filters: UnitsShellFilters,
): Promise<ApiResult<UnitsShellSnapshot>> {
  const [
    summaryResult,
    activeReservationTruthResult,
    ownerOptionsResult,
    stockTypeRowsResult,
    ownerCountRowsResult,
  ] = await Promise.all([
    supabase.rpc("get_units_shell_summary", {
      p_stock_category: filters.stockCategory || undefined,
      p_stock_entity: filters.stockEntity || undefined,
    }),
    supabase
      .from("unit_reservations")
      .select("id,unit_id,showing_id,expires_at")
      .eq("status", "Aktive"),
    supabase.rpc("list_unit_owner_options"),
    applyStockScope(
      supabase
        .from("units")
        .select("type,level")
        .range(0, 4999),
      filters,
    ),
    supabase
      .from("units")
      .select("owner_category,owner_name")
      .range(0, 4999),
  ]);

  const error =
    summaryResult.error ??
    activeReservationTruthResult.error ??
    ownerOptionsResult.error ??
    stockTypeRowsResult.error ??
    ownerCountRowsResult.error;

  if (error) {
    return apiFail(error.message);
  }

  const activeReservationTruthRows =
    (activeReservationTruthResult.data ?? []) as ActiveReservationTruthRow[];
  const activeReservationUnitIds = [
    ...new Set(activeReservationTruthRows.map((row) => row.unit_id)),
  ];
  const reservationTruthByUnitId = new Map(
    activeReservationTruthRows.map((row) => [
      row.unit_id,
      {
        reservationId: row.id,
        showingId: row.showing_id,
        expiresAt: row.expires_at,
      },
    ]),
  );
  let activeReservationUnitRows: ActiveReservationUnitRow[] = [];

  if (activeReservationUnitIds.length > 0) {
    const activeReservationUnitsResult = await supabase
      .from("units")
      .select(ACTIVE_RESERVATION_UNITS_SELECT)
      .in("id", activeReservationUnitIds);

    if (activeReservationUnitsResult.error) {
      return apiFail(activeReservationUnitsResult.error.message);
    }

    activeReservationUnitRows =
      (activeReservationUnitsResult.data ?? []) as ActiveReservationUnitRow[];
  }

  const activeReservations = activeReservationUnitRows
    .map((row) => {
      const truth = reservationTruthByUnitId.get(row.id);
      return {
        ...row,
        status: row.status === "E shitur" ? row.status : "E rezervuar",
        reservation_expires_at: row.reservation_expires_at ?? truth?.expiresAt ?? null,
        active_reservation_id: truth?.reservationId ?? null,
        active_reservation_showing_id: truth?.showingId ?? null,
      };
    })
    .filter(
      (row) => row.status === "E rezervuar" && Boolean(row.reservation_expires_at),
    )
    .sort(
      (a, b) =>
        new Date(a.reservation_expires_at!).getTime() -
        new Date(b.reservation_expires_at!).getTime(),
    );

  const summaryRow = summaryResult.data?.[0] ?? null;
  const ownerOptionRows =
    (ownerOptionsResult.data ?? []) as Array<{ category: string | null; name: string | null }>;
  const ownerOptionsByCategory = rowsToOwnerOptions(
    ownerOptionRows,
  );
  const ownerEntityCountsByCategory = rowsToOwnerEntityCounts(
    ownerOptionRows,
    (ownerCountRowsResult.data ?? []) as Array<{
      owner_category: string | null;
      owner_name: string | null;
    }>,
  );
  const stockTypeCounts = rowsToStockTypeCounts(
    (stockTypeRowsResult.data ?? []) as Array<{ type: string | null; level: string | null }>,
  );

  return apiOk({
    totalUnits: summaryRow?.total_units ?? 0,
    availableUnitsCount: summaryRow?.available_units_count ?? 0,
    activeReservationsCount: activeReservations.length,
    ownerOptionsByCategory,
    ownerEntityCountsByCategory,
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
    stockTypeCounts,
    activeReservations,
  });
}
