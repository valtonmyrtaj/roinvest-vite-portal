import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { unitsShell as unitsShellApi } from "../lib/api";
import type {
  ActiveReservationShellRow,
  UnitsShellFilters,
} from "../lib/api/unitsShell";
import type { Block, Level, OwnerCategory, Unit, UnitStatus } from "./useUnits";

interface UnitsShellState {
  totalUnits: number;
  availableUnitsCount: number;
  activeReservationsCount: number;
  ownerOptionsByCategory: Record<OwnerCategory, string[]>;
  ownershipCounts: Record<OwnerCategory, number>;
  stockCounts: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
  };
  activeReservations: Unit[];
}

const EMPTY_STATE: UnitsShellState = {
  totalUnits: 0,
  availableUnitsCount: 0,
  activeReservationsCount: 0,
  ownerOptionsByCategory: {
    Investitor: [],
    "Pronarët e tokës": [],
    "Kompani ndërtimore": [],
  },
  ownershipCounts: {
    Investitor: 0,
    "Pronarët e tokës": 0,
    "Kompani ndërtimore": 0,
  },
  stockCounts: {
    total: 0,
    available: 0,
    reserved: 0,
    sold: 0,
  },
  activeReservations: [],
};

export function useUnitsShell(filters: UnitsShellFilters) {
  const [state, setState] = useState<UnitsShellState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const stableFilters = useMemo(
    () => ({
      stockCategory: filters.stockCategory ?? "",
      stockEntity: filters.stockEntity ?? "",
    }),
    [filters.stockCategory, filters.stockEntity],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchShell = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    const result = await unitsShellApi.getUnitsShellSnapshot(stableFilters);

    if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
      return;
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!result.data) {
      setError("Përmbledhja e njësive nuk u ngarkua.");
      setLoading(false);
      return;
    }

    setState({
      totalUnits: result.data.totalUnits,
      availableUnitsCount: result.data.availableUnitsCount,
      activeReservationsCount: result.data.activeReservationsCount,
      ownerOptionsByCategory: result.data.ownerOptionsByCategory,
      ownershipCounts: result.data.ownershipCounts,
      stockCounts: result.data.stockCounts,
      activeReservations: result.data.activeReservations.map(mapActiveReservationRowToUnit),
    });
    setLoading(false);
  }, [stableFilters]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        void fetchShell();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchShell]);

  return {
    ...state,
    loading,
    error,
    refresh: fetchShell,
  };
}

function mapActiveReservationRowToUnit(row: ActiveReservationShellRow): Unit {
  return {
    id: row.id,
    unit_id: row.unit_id,
    block: row.block as Block,
    type: row.type as Unit["type"],
    level: row.level as Level,
    size: row.size,
    price: row.price,
    status: row.status as UnitStatus,
    owner_category: row.owner_category as OwnerCategory,
    owner_name: row.owner_name,
    reservation_expires_at: row.reservation_expires_at,
    has_active_reservation: Boolean(row.active_reservation_id),
    active_reservation_id: row.active_reservation_id,
    active_reservation_showing_id: row.active_reservation_showing_id,
    notes: null,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
    bedrooms: null,
    bathrooms: null,
    toilets: null,
    orientation: null,
    floorplan_code: null,
    has_storage: row.has_storage ?? false,
    balcony_area: null,
    terrace_area: null,
    final_price: null,
    sale_date: null,
    buyer_name: null,
    payment_type: null,
    crm_lead_id: null,
  };
}
