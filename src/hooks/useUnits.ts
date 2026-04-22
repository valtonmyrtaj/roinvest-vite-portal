import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { sales as salesApi, units as unitsApi } from "../lib/api";
import type { UnitTypeValue } from "../lib/unitType";
import type {
  CreateUnitPayload,
  InsertUnitHistoryPayload,
  UnitHistoryRow,
  UnitRow,
  UpdateUnitPayload,
} from "../lib/api/units";
import type { UnitSaleRow } from "../lib/api/sales";
import type { Json } from "../lib/database.types";

export type UnitStatus = "Në dispozicion" | "E rezervuar" | "E shitur";
export type UnitType = UnitTypeValue;
export type Block = "Blloku A" | "Blloku B" | "Blloku C";
export type Level =
  | "Garazhë"
  | "Përdhesa"
  | "Kati 1"
  | "Kati 2"
  | "Kati 3"
  | "Kati 4"
  | "Kati 5"
  | "Kati 6"
  | "Penthouse";
export type OwnerCategory =
  | "Investitor"
  | "Pronarët e tokës"
  | "Kompani ndërtimore";

export interface Unit {
  // ── units table (always present) ──────────────────────────────────────────
  id: string;
  unit_id: string;
  block: Block;
  type: UnitType;
  level: Level;
  size: number;
  /** Listing / asking price. Never the contracted sale price. */
  price: number;
  status: UnitStatus;
  owner_category: OwnerCategory;
  owner_name: string;
  reservation_expires_at?: string | null;
  has_active_reservation?: boolean;
  active_reservation_id?: string | null;
  active_reservation_showing_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  toilets?: number | null;

  // ── sale truth overlay (populated from unit_sales when an active sale exists) ──
  /**
   * Contracted sale price from unit_sales.final_price.
   * null when no active sale record exists; use `getUnitContractValue` which
   * falls back to `price` in that case.
   */
  final_price?: number | null;
  /**
   * Sale date from unit_sales. Falls back to units.sale_date for legacy units
   * that pre-date the unit_sales canonical table.
   */
  sale_date?: string | null;
  /**
   * Buyer name from unit_sales. Falls back to units.buyer_name for legacy units.
   */
  buyer_name?: string | null;
  /** Payment type from unit_sales only (units table has no payment_type column). */
  payment_type?: string | null;
  /** CRM lead linked to this sale, from unit_sales.crm_lead_id. */
  crm_lead_id?: string | null;
}

export interface UnitHistory {
  id: string;
  unit_id: string;
  changed_at: string;
  change_reason: string;
  previous_data: Partial<Unit>;
  new_data: Partial<Unit>;
}

export interface CreateUnitInput {
  unit_id: string;
  block: Block;
  type: UnitType;
  level: Level;
  size: number;
  price: number;
  status: UnitStatus;
  owner_category: OwnerCategory;
  owner_name: string;
  reservation_expires_at?: string | null;
  sale_date?: string | null;
  notes?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  toilets?: number | null;
}

function toUnitHistorySnapshot(value: Json | null): Partial<Unit> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Partial<Unit>;
}

/**
 * Maps a typed DB row from the `units` table into the app-level Unit shape.
 *
 * Sale truth fields (final_price, payment_type, crm_lead_id) are initialised to
 * null here and replaced by the related-truth overlay in `unitsWithTruth`.
 *
 * `sale_date` and `buyer_name` are read from the `units` row as a legacy compat
 * bridge: they act as fallbacks for units sold before `unit_sales` became the
 * canonical table, or when the active sale record is missing. The overlay always
 * prefers `unit_sales` values when an active record exists.
 *
 * Note: `units.sale_price` and `units.buyer_lead_id` exist in the DB schema but
 * are intentionally NOT mapped here. `final_price` comes from `unit_sales` and
 * `buyer_lead_id` is superseded by `unit_sales.crm_lead_id`.
 */
function mapDbUnit(row: UnitRow): Unit {
  return {
    id: row.id,
    unit_id: row.unit_id,
    block: row.block as Block,
    type: row.type as UnitType,
    level: row.level as Level,
    size: row.size,
    price: row.price,
    status: row.status as UnitStatus,
    owner_category: row.owner_category as OwnerCategory,
    owner_name: row.owner_name,
    reservation_expires_at: row.reservation_expires_at,
    has_active_reservation: false,
    active_reservation_id: null,
    active_reservation_showing_id: null,
    notes: row.notes,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    toilets: row.toilets,
    // Legacy compat fallbacks — overridden by sale truth overlay when active unit_sales exists.
    sale_date: row.sale_date,
    buyer_name: row.buyer_name,
    // Sale truth fields — populated exclusively from unit_sales via the overlay.
    final_price: null,
    payment_type: null,
    crm_lead_id: null,
  };
}

/**
 * Canonical sale truth sourced from `unit_sales`.
 * All financial and buyer identity fields should be read from here, not from
 * the legacy columns on the `units` table.
 */
interface SaleTruth {
  final_price: number;
  sale_date: string;
  buyer_name: string | null;
  payment_type: string | null;
  crm_lead_id: string | null;
}

interface UseUnitsOptions {
  includeSaleTruth?: boolean;
  includeReservationTruth?: boolean;
}

interface ReservationTruth {
  reservation_id: string;
  showing_id: string | null;
}

function mapSaleTruth(row: UnitSaleRow): SaleTruth {
  return {
    final_price: row.final_price,
    sale_date: row.sale_date,
    buyer_name: row.buyer_name,
    payment_type: row.payment_type,
    crm_lead_id: row.crm_lead_id,
  };
}

function indexReservationTruth(
  rows: Array<{
    reservation_id: string;
    unit_id: string;
    showing_id: string | null;
  }>,
): Record<string, ReservationTruth> {
  return rows.reduce<Record<string, ReservationTruth>>((acc, row) => {
    acc[row.unit_id] = {
      reservation_id: row.reservation_id,
      showing_id: row.showing_id,
    };
    return acc;
  }, {});
}

/**
 * Reduce a list of `unit_sales` rows into a SaleTruth map keyed by `units.id`.
 * Rows without a unit_id are skipped. Only active sales should be passed in.
 */
function indexSaleTruth(rows: UnitSaleRow[]): Record<string, SaleTruth> {
  return rows.reduce<Record<string, SaleTruth>>((acc, row) => {
    if (!row.unit_id) return acc;
    acc[row.unit_id] = mapSaleTruth(row);
    return acc;
  }, {});
}

export function useUnits(options: UseUnitsOptions = {}) {
  const includeSaleTruth = options.includeSaleTruth ?? true;
  const includeReservationTruth = options.includeReservationTruth ?? false;
  const [units, setUnits] = useState<Unit[]>([]);
  const [saleTruthByUnitId, setSaleTruthByUnitId] = useState<Record<string, SaleTruth>>({});
  const [reservationTruthByUnitId, setReservationTruthByUnitId] = useState<
    Record<string, ReservationTruth>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestFetchRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Canonical refresh for the overlaid Unit model.
   *
   * Fetches `units` and active `unit_sales` concurrently and commits both pieces
   * of state in the same synchronous block so React 18 batches them into a
   * single render. This guarantees that no consumer ever observes fresh `units`
   * paired with stale `saleTruthByUnitId` (or vice versa) — eliminating the
   * stale-overlay window that exists if the two fetches are awaited serially
   * with a `setState` in between.
   *
   * Reservations past their expiry date are auto-expired only when the `units`
   * row appears to be a mirror-only reservation. If an active
   * `unit_reservations` row still exists for that unit, this hook refuses to
   * clear the mirror so frontend reads never drift away from reservation
   * authority.
   *
   * When the reservations read fails, mirror expiry is skipped entirely instead
   * of guessing. That preserves safety over eagerness.
   *
   * Error handling preserves the pre-migration contract exactly:
   *   - a units-read failure sets `error` and returns without clearing
   *     previously committed state;
   *   - a sales read failure degrades silently to an empty overlay;
   *   - a reservations read failure degrades silently to an empty overlay and
   *     suppresses mirror expiry because reservation authority could not be
   *     verified;
   *   - the bulk-expire write and any fallback units refetch both tolerate
   *     failure silently (the refetch falls back to an empty list, matching
   *     the previous `fresh ?? []` behavior).
   */
  const fetchUnits = useCallback(async () => {
    const requestId = ++latestFetchRequestIdRef.current;
    setLoading(true);

    const salesQuery = includeSaleTruth
      ? salesApi.listActiveSales()
      : Promise.resolve({
          data: [] as UnitSaleRow[],
          error: null,
        });
    const reservationsQuery = salesApi.listActiveReservationLinks();

    const [unitsResult, salesResult, reservationsResult] = await Promise.all([
      unitsApi.listUnits(),
      salesQuery,
      reservationsQuery,
    ]);

    if (!isMountedRef.current || requestId !== latestFetchRequestIdRef.current) {
      return;
    }

    if (unitsResult.error !== null) {
      setError(unitsResult.error);
      setLoading(false);
      return;
    }

    let mappedUnits = unitsResult.data.map(mapDbUnit);
    const today = new Date().toISOString().slice(0, 10);
    const authoritativeReservationUnitIds =
      reservationsResult.error === null
        ? new Set((reservationsResult.data ?? []).map((row) => row.unit_id))
        : null;

    const expired = mappedUnits.filter(
      (u) =>
        u.status === "E rezervuar" &&
        u.reservation_expires_at &&
        u.reservation_expires_at <= today &&
        authoritativeReservationUnitIds !== null &&
        !authoritativeReservationUnitIds.has(u.id)
    );

    if (expired.length > 0) {
      // Bulk expire — one UPDATE instead of a serial loop. When the
      // server returns the updated rows, patch them into the already-read
      // list and avoid a second full-table read. If the write fails or
      // returns an unexpected row set, fall back to a full refetch so
      // whatever the DB committed is what we commit to state.
      const expireResult = await unitsApi.expireReservations(expired.map((u) => u.id));

      if (!isMountedRef.current || requestId !== latestFetchRequestIdRef.current) {
        return;
      }

      const expiredById =
        expireResult.error === null
          ? new Map(expireResult.data.map((row) => [row.id, mapDbUnit(row)]))
          : null;

      if (expiredById && expiredById.size === expired.length) {
        mappedUnits = mappedUnits.map((unit) => expiredById.get(unit.id) ?? unit);
      } else {
        const fresh = await unitsApi.listUnits();

        if (!isMountedRef.current || requestId !== latestFetchRequestIdRef.current) {
          return;
        }

        mappedUnits = (fresh.data ?? []).map(mapDbUnit);
      }
    }

    const nextSaleTruth = indexSaleTruth(salesResult.data ?? []);
    const nextReservationTruth = includeReservationTruth
      ? indexReservationTruth(reservationsResult.data ?? [])
      : {};

    if (!isMountedRef.current || requestId !== latestFetchRequestIdRef.current) {
      return;
    }

    // Atomic commit — React 18 batches these into a single render, so the
    // derived overlay is always recomposed against a coherent pair.
    setUnits(mappedUnits);
    setSaleTruthByUnitId(nextSaleTruth);
    setReservationTruthByUnitId(nextReservationTruth);
    setError(null);
    setLoading(false);
  }, [includeReservationTruth, includeSaleTruth]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const createUnit = async (input: CreateUnitInput) => {
    const payload: CreateUnitPayload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const result = await unitsApi.createUnit(payload);

    if (result.error !== null) {
      console.error("Supabase error:", JSON.stringify(result.error));
      return { error: result.error };
    }
    const nextUnit = mapDbUnit(result.data);
    setUnits((prev) => [...prev, nextUnit]);
    return { data: nextUnit };
  };

  const updateUnit = async (
    id: string,
    changes: Partial<CreateUnitInput>,
    changeReason: string
  ) => {
    const existing = units.find((u) => u.id === id);
    if (!existing) return { error: "Unit not found" };

    const payload: UpdateUnitPayload = {
      ...changes,
      updated_at: new Date().toISOString(),
    };

    const result = await unitsApi.updateUnit(id, payload);

    if (result.error !== null) return { error: result.error };

    const nextUnit = mapDbUnit(result.data);

    const historyRow: InsertUnitHistoryPayload = {
      unit_id: id,
      change_reason: changeReason,
      previous_data: existing as unknown as Json,
      new_data: nextUnit as unknown as Json,
    };

    // History write is non-blocking: the primary update has already
    // succeeded. Preserving pre-migration behavior — any error from
    // the history insert is silently tolerated.
    await unitsApi.insertUnitHistoryRows([historyRow]);

    setUnits((prev) => prev.map((u) => (u.id === id ? nextUnit : u)));
    return { data: nextUnit };
  };

  const deleteUnit = async (id: string) => {
    const result = await unitsApi.deleteUnit(id);

    if (result.error !== null) return { error: result.error };
    setUnits((prev) => prev.filter((u) => u.id !== id));
    // Drop the orphaned sale-truth entry so the overlay map stays coherent
    // with the units list.
    setSaleTruthByUnitId((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _removed, ...rest } = prev;
      void _removed;
      return rest;
    });
    setReservationTruthByUnitId((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _removed, ...rest } = prev;
      void _removed;
      return rest;
    });
    return {};
  };

  const renameOwnerEntityAcrossUnits = async (
    ownerCategory: OwnerCategory,
    currentOwnerName: string,
    nextOwnerName: string,
    changeReason: string
  ) => {
    const affectedUnits = units.filter(
      (unit) => unit.owner_category === ownerCategory && unit.owner_name === currentOwnerName
    );

    if (affectedUnits.length === 0) {
      return { data: 0 };
    }

    const result = await unitsApi.bulkRenameOwner({
      category: ownerCategory,
      currentName: currentOwnerName,
      nextName: nextOwnerName,
      updatedAt: new Date().toISOString(),
    });

    if (result.error !== null) return { error: result.error };

    const updatedUnits = result.data.map(mapDbUnit);

    if (updatedUnits.length > 0) {
      const historyRows = updatedUnits
        .map((updatedUnit) => {
          const previousUnit = affectedUnits.find((unit) => unit.id === updatedUnit.id);
          if (!previousUnit) return null;

          const historyRow: InsertUnitHistoryPayload = {
            unit_id: updatedUnit.id,
            change_reason: changeReason,
            previous_data: previousUnit as unknown as Json,
            new_data: updatedUnit as unknown as Json,
          };

          return historyRow;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      // History write is non-blocking: the primary bulk-rename has already
      // succeeded. Any error from the history insert is silently tolerated,
      // mirroring the pre-migration contract.
      await unitsApi.insertUnitHistoryRows(historyRows);
    }

    setUnits((prev) =>
      prev.map((unit) => updatedUnits.find((updatedUnit) => updatedUnit.id === unit.id) ?? unit)
    );

    return { data: updatedUnits.length };
  };

  const fetchUnitHistory = async (unitId: string): Promise<UnitHistory[]> => {
    const result = await unitsApi.listUnitHistory(unitId);

    if (result.error !== null) return [];
    return result.data.map((row: UnitHistoryRow) => ({
      id: row.id,
      unit_id: row.unit_id ?? "",
      changed_at: row.changed_at ?? "",
      change_reason: row.change_reason ?? "",
      previous_data: toUnitHistorySnapshot(row.previous_data),
      new_data: toUnitHistorySnapshot(row.new_data),
    }));
  };

  const unitsWithTruth = useMemo(
    () =>
      units.map((unit) => {
        const saleTruth = saleTruthByUnitId[unit.id];
        const reservationTruth = reservationTruthByUnitId[unit.id];

        if (!saleTruth && !reservationTruth) {
          return unit;
        }

        return {
          ...unit,
          has_active_reservation: Boolean(reservationTruth),
          active_reservation_id: reservationTruth?.reservation_id ?? null,
          active_reservation_showing_id: reservationTruth?.showing_id ?? null,
          // ── Sale truth overlay from unit_sales ───────────────────────────
          // `units.price` is intentionally preserved as the listing/asking price.
          final_price: saleTruth?.final_price ?? unit.final_price,
          // `sale_date` prefers unit_sales; falls back to units.sale_date as a
          // legacy compat bridge for units written before unit_sales was canonical.
          sale_date: saleTruth?.sale_date || unit.sale_date,
          // `buyer_name` prefers unit_sales; falls back to units.buyer_name for
          // the same legacy reason.
          buyer_name: saleTruth?.buyer_name ?? unit.buyer_name,
          // `payment_type` comes from unit_sales only — units table has no such column.
          payment_type: saleTruth?.payment_type ?? unit.payment_type,
          // `crm_lead_id` comes from unit_sales only.
          crm_lead_id: saleTruth?.crm_lead_id ?? unit.crm_lead_id,
        };
      }),
    [reservationTruthByUnitId, saleTruthByUnitId, units],
  );

  return {
    units: unitsWithTruth,
    loading,
    error,
    fetchUnits,
    createUnit,
    updateUnit,
    deleteUnit,
    renameOwnerEntityAcrossUnits,
    fetchUnitHistory,
  };
}
