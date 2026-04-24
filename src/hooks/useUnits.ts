import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { reservations as reservationsApi, sales as salesApi, units as unitsApi } from "../lib/api";
import type { Level } from "../lib/unitLevel";
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

export type { Level } from "../lib/unitLevel";

export type UnitStatus = "Në dispozicion" | "E rezervuar" | "E shitur";
export type UnitType = UnitTypeValue;
export type Block = "Blloku A" | "Blloku B" | "Blloku C";
export type OwnerCategory =
  | "Investitor"
  | "Pronarët e tokës"
  | "Kompani ndërtimore";
export type UnitOrientation =
  | "Veri"
  | "Veri-Lindje"
  | "Lindje"
  | "Jug-Lindje"
  | "Jug"
  | "Jug-Perëndim"
  | "Perëndim"
  | "Veri-Perëndim";

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
  orientation?: UnitOrientation | null;
  floorplan_code?: string | null;
  balcony_area?: number | null;
  terrace_area?: number | null;

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
  orientation?: UnitOrientation | null;
  floorplan_code?: string | null;
  balcony_area?: number | null;
  terrace_area?: number | null;
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
    orientation: row.orientation as UnitOrientation | null,
    floorplan_code: row.floorplan_code,
    balcony_area: row.balcony_area,
    terrace_area: row.terrace_area,
    // Legacy compat fallbacks — overridden by sale truth overlay when active unit_sales exists.
    sale_date: row.sale_date,
    buyer_name: row.buyer_name,
    // Sale truth fields — populated exclusively from unit_sales via the overlay.
    final_price: null,
    payment_type: null,
    crm_lead_id: null,
  };
}

function normalizeUpdateComparableValue(
  key: keyof CreateUnitInput,
  value: unknown,
): unknown {
  if (value === undefined) return null;

  if (key === "reservation_expires_at" || key === "sale_date") {
    return typeof value === "string" && value ? value.slice(0, 10) : null;
  }

  if ((key === "notes" || key === "floorplan_code") && typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  return value ?? null;
}

function buildMeaningfulUnitChanges(
  existing: Unit,
  changes: Partial<CreateUnitInput>,
): Partial<CreateUnitInput> {
  const meaningfulChanges: Partial<CreateUnitInput> = {};
  const writableChanges = meaningfulChanges as Record<string, unknown>;

  Object.entries(changes).forEach(([rawKey, nextValue]) => {
    const key = rawKey as keyof CreateUnitInput;
    const currentValue = existing[key as keyof Unit];

    if (
      normalizeUpdateComparableValue(key, currentValue) !==
      normalizeUpdateComparableValue(key, nextValue)
    ) {
      writableChanges[key] = nextValue;
    }
  });

  return meaningfulChanges;
}

function buildUnitHistoryDelta(
  existing: Unit,
  nextUnit: Unit,
  changedKeys: Array<keyof CreateUnitInput>,
) {
  const previousData: Record<string, unknown> = {};
  const newData: Record<string, unknown> = {};

  changedKeys.forEach((key) => {
    previousData[key] = existing[key as keyof Unit] ?? null;
    newData[key] = nextUnit[key as keyof Unit] ?? null;
  });

  return { previousData, newData };
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
  enabled?: boolean;
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
  const enabled = options.enabled ?? true;
  const [units, setUnits] = useState<Unit[]>([]);
  const [saleTruthByUnitId, setSaleTruthByUnitId] = useState<Record<string, SaleTruth>>({});
  const [reservationTruthByUnitId, setReservationTruthByUnitId] = useState<
    Record<string, ReservationTruth>
  >({});
  const [loading, setLoading] = useState(enabled);
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
   * Reservations past their expiry date are expired through reservation
   * authority first: active `unit_reservations` rows are closed server-side and
   * the corresponding `units` mirror/history are updated atomically. Any
   * remaining mirror-only expired rows are then cleaned up as legacy fallback.
   *
   * When the reservations read fails, mirror expiry is skipped entirely instead
   * of guessing. That preserves safety over eagerness.
   *
   * Error handling preserves the pre-migration contract exactly:
   *   - a units-read failure sets `error` and returns without clearing
   *     previously committed state;
   *   - a sales read failure degrades silently to an empty overlay;
   *   - a reservations read failure degrades silently to an empty overlay and
   *     suppresses reservation expiry because authority could not be verified;
   *   - the authoritative expiry write, legacy mirror cleanup write, and any
   *     fallback refetches all tolerate
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
    const reservationsQuery = reservationsApi.listActiveReservationLinks();

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
    const cutoffDate = new Date();
    cutoffDate.setHours(0, 0, 0, 0);
    const cutoffIso = cutoffDate.toISOString();
    const today = cutoffIso.slice(0, 10);
    let activeReservationLinks =
      reservationsResult.error === null ? (reservationsResult.data ?? []) : [];
    let authoritativeReservationUnitIds =
      reservationsResult.error === null
        ? new Set(activeReservationLinks.map((row) => row.unit_id))
        : null;

    const expiredAuthoritative =
      authoritativeReservationUnitIds === null
        ? []
        : mappedUnits.filter(
            (u) =>
              u.status === "E rezervuar" &&
              u.reservation_expires_at &&
              u.reservation_expires_at <= today &&
              authoritativeReservationUnitIds!.has(u.id),
          );

    if (expiredAuthoritative.length > 0) {
      const expireResult = await reservationsApi.expireUnitReservations({
        unitRecordIds: expiredAuthoritative.map((u) => u.id),
        cutoff: cutoffIso,
      });

      if (!isMountedRef.current || requestId !== latestFetchRequestIdRef.current) {
        return;
      }

      const expiredById =
        expireResult.error === null
          ? new Map(expireResult.data.map((row) => [row.id, mapDbUnit(row)]))
          : null;

      if (expiredById && expiredById.size === expiredAuthoritative.length) {
        const expiredUnitIds = new Set(expiredAuthoritative.map((unit) => unit.id));
        mappedUnits = mappedUnits.map((unit) => expiredById.get(unit.id) ?? unit);
        activeReservationLinks = activeReservationLinks.filter(
          (row) => !expiredUnitIds.has(row.unit_id),
        );
      } else {
        const [freshUnits, freshReservations] = await Promise.all([
          unitsApi.listUnits(),
          reservationsApi.listActiveReservationLinks(),
        ]);

        if (!isMountedRef.current || requestId !== latestFetchRequestIdRef.current) {
          return;
        }

        mappedUnits = (freshUnits.data ?? []).map(mapDbUnit);
        if (freshReservations.error === null) {
          activeReservationLinks = freshReservations.data ?? [];
          authoritativeReservationUnitIds = new Set(
            activeReservationLinks.map((row) => row.unit_id),
          );
        } else {
          activeReservationLinks = [];
          authoritativeReservationUnitIds = null;
        }
      }

      if (authoritativeReservationUnitIds !== null) {
        authoritativeReservationUnitIds = new Set(
          activeReservationLinks.map((row) => row.unit_id),
        );
      }
    }

    const expiredMirrorOnly =
      authoritativeReservationUnitIds === null
        ? []
        : mappedUnits.filter(
            (u) =>
              u.status === "E rezervuar" &&
              u.reservation_expires_at &&
              u.reservation_expires_at <= today &&
              !authoritativeReservationUnitIds!.has(u.id),
          );

    if (expiredMirrorOnly.length > 0) {
      // Legacy cleanup only — these rows no longer have authoritative
      // reservation backing, so clearing the mirror directly is safe.
      const expireResult = await unitsApi.expireReservations(
        expiredMirrorOnly.map((u) => u.id),
      );

      if (!isMountedRef.current || requestId !== latestFetchRequestIdRef.current) {
        return;
      }

      const expiredById =
        expireResult.error === null
          ? new Map(expireResult.data.map((row) => [row.id, mapDbUnit(row)]))
          : null;

      if (expiredById && expiredById.size === expiredMirrorOnly.length) {
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
      ? indexReservationTruth(activeReservationLinks)
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
    if (!enabled) {
      setLoading(false);
      return;
    }

    fetchUnits();
  }, [enabled, fetchUnits]);

  const createUnit = async (input: CreateUnitInput) => {
    if (input.status === "E rezervuar") {
      return {
        error:
          "Rezervimet administrohen nga rrjedha kanonike e rezervimeve. Njësitë e reja duhet të nisin si 'Në dispozicion' ose të shiten nga rrjedha kanonike e shitjes.",
      };
    }

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

    const nextStatus = (changes.status ?? existing.status) as UnitStatus;
    const currentReservationMirror =
      existing.status === "E rezervuar"
        ? normalizeReservationMirror(existing.reservation_expires_at)
        : null;
    const nextReservationMirror =
      nextStatus === "E rezervuar"
        ? normalizeReservationMirror(changes.reservation_expires_at ?? existing.reservation_expires_at)
        : null;
    const hasAuthoritativeReservation = Boolean(existing.active_reservation_id);
    const reservationStateChanged =
      nextStatus !== existing.status || nextReservationMirror !== currentReservationMirror;

    if (nextStatus === "E rezervuar" && !hasAuthoritativeReservation) {
      return {
        error:
          "Rezervimet administrohen nga rrjedha kanonike e rezervimeve. Kjo rrugë nuk mund të ruajë statusin 'E rezervuar' pa një rezervim autoritativ aktiv.",
      };
    }

    if (hasAuthoritativeReservation && reservationStateChanged) {
      return {
        error:
          "Njësia ka rezervim autoritativ aktiv. Statusi dhe data e skadimit nuk mund të ndryshohen nga kjo rrugë.",
      };
    }

    const meaningfulChanges = buildMeaningfulUnitChanges(existing, changes);
    const changedKeys = Object.keys(meaningfulChanges) as Array<keyof CreateUnitInput>;

    if (changedKeys.length === 0) {
      return { data: existing };
    }

    const payload: UpdateUnitPayload = {
      ...meaningfulChanges,
      updated_at: new Date().toISOString(),
    };

    const result = await unitsApi.updateUnit(id, payload);

    if (result.error !== null) return { error: result.error };

    const nextUnit = mapDbUnit(result.data);
    const { previousData, newData } = buildUnitHistoryDelta(existing, nextUnit, changedKeys);

    const historyRow: InsertUnitHistoryPayload = {
      unit_id: id,
      change_reason: changeReason,
      previous_data: previousData as Json,
      new_data: newData as Json,
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

function normalizeReservationMirror(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}
