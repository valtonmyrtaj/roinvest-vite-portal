import { supabase } from "../supabase";
import type { Tables } from "../database.types";
import { LEGACY_APARTMENT_LAYOUT_TYPES } from "../unitType";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

export type RegistryUnitRow = Pick<
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
  | "has_storage"
> & {
  final_price: number | null;
  sale_date: string | null;
  buyer_name: string | null;
  payment_type: string | null;
  crm_lead_id: string | null;
};

export interface UnitsRegistryFilters {
  block?: string;
  type?: string;
  level?: string;
  status?: string;
  category?: string;
  entity?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface UnitsRegistrySnapshot {
  rows: RegistryUnitRow[];
  filteredCount: number;
  scopeCount: number;
  page: number;
  pageSize: number;
}

type FilterableQuery<TQuery> = {
  eq(column: string, value: unknown): TQuery;
  neq(column: string, value: unknown): TQuery;
  in(column: string, values: readonly unknown[]): TQuery;
  ilike(column: string, pattern: string): TQuery;
  or(filters: string): TQuery;
};

const REGISTRY_SELECT =
  "id,unit_id,block,type,level,size,price,status,owner_category,owner_name,created_at,updated_at,has_storage";

function applyRegistryScopeFilters<TQuery extends FilterableQuery<TQuery>>(
  query: TQuery,
  filters: UnitsRegistryFilters,
): TQuery {
  let nextQuery = query;

  if (filters.category) {
    nextQuery = nextQuery.eq("owner_category", filters.category);
  }

  if (filters.entity) {
    nextQuery = nextQuery.eq("owner_name", filters.entity);
  }

  return nextQuery;
}

function applyRegistryTypeFilter<TQuery extends FilterableQuery<TQuery>>(
  query: TQuery,
  type: string,
): TQuery {
  if (type === "Banesë") {
    return query
      .in("type", ["Banesë", ...LEGACY_APARTMENT_LAYOUT_TYPES])
      .neq("level", "Penthouse");
  }

  if (type === "Penthouse") {
    return query.or("level.eq.Penthouse,type.eq.Penthouse");
  }

  return query.eq("type", type);
}

function applyRegistryFilters<TQuery extends FilterableQuery<TQuery>>(
  query: TQuery,
  filters: UnitsRegistryFilters,
): TQuery {
  let nextQuery = applyRegistryScopeFilters(query, filters);

  if (filters.block) {
    nextQuery = nextQuery.eq("block", filters.block);
  }

  if (filters.type) {
    nextQuery = applyRegistryTypeFilter(nextQuery, filters.type);
  }

  if (filters.level) {
    nextQuery = nextQuery.eq("level", filters.level);
  }

  if (filters.status) {
    nextQuery = nextQuery.eq("status", filters.status);
  }

  if (filters.search) {
    nextQuery = nextQuery.ilike("unit_id", `%${filters.search}%`);
  }

  return nextQuery;
}

export async function getUnitsRegistrySnapshot(
  filters: UnitsRegistryFilters,
): Promise<ApiResult<UnitsRegistrySnapshot>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 40));

  const filteredCountQuery = applyRegistryFilters(
    supabase.from("units").select("id", { count: "exact", head: true }),
    filters,
  );

  const scopeCountQuery = applyRegistryScopeFilters(
    supabase.from("units").select("id", { count: "exact", head: true }),
    filters,
  );

  const [filteredCountResult, scopeCountResult] = await Promise.all([
    filteredCountQuery,
    scopeCountQuery,
  ]);

  const error =
    filteredCountResult.error ?? scopeCountResult.error;

  if (error) {
    return apiFail(error.message);
  }

  const filteredCount = filteredCountResult.count ?? 0;
  const scopeCount = scopeCountResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const from = (effectivePage - 1) * pageSize;
  const to = from + pageSize - 1;

  const rowsResult = await applyRegistryFilters(
    supabase.from("units").select(REGISTRY_SELECT),
    filters,
  )
    .order("created_at", { ascending: true })
    .range(from, to);

  if (rowsResult.error) {
    return apiFail(rowsResult.error.message);
  }

  const rows = (rowsResult.data ?? []) as Array<
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
      | "created_at"
      | "updated_at"
      | "has_storage"
    >
  >;
  const rowIds = rows.map((row) => row.id);
  const saleTruthByUnitId = new Map<
    string,
    Pick<
      Tables<"unit_sales">,
      "final_price" | "sale_date" | "buyer_name" | "payment_type" | "crm_lead_id"
    >
  >();

  if (rowIds.length > 0) {
    const { data: saleRows, error: saleError } = await supabase
      .from("unit_sales")
      .select("unit_id,final_price,sale_date,buyer_name,payment_type,crm_lead_id")
      .eq("status", "active")
      .in("unit_id", rowIds);

    if (saleError) {
      return apiFail(saleError.message);
    }

    (saleRows ?? []).forEach((row) => {
      saleTruthByUnitId.set(row.unit_id, {
        final_price: row.final_price,
        sale_date: row.sale_date,
        buyer_name: row.buyer_name,
        payment_type: row.payment_type,
        crm_lead_id: row.crm_lead_id,
      });
    });
  }

  return apiOk({
    rows: rows.map((row) => {
      const saleTruth = saleTruthByUnitId.get(row.id);
      return {
        ...row,
        final_price: saleTruth?.final_price ?? null,
        sale_date: saleTruth?.sale_date ?? null,
        buyer_name: saleTruth?.buyer_name ?? null,
        payment_type: saleTruth?.payment_type ?? null,
        crm_lead_id: saleTruth?.crm_lead_id ?? null,
      };
    }),
    filteredCount,
    scopeCount,
    page: effectivePage,
    pageSize,
  });
}
