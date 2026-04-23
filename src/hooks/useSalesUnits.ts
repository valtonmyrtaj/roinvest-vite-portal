import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sales as salesApi } from "../lib/api";
import type { SalesUnitRow } from "../lib/api/sales";
import type { Block, Level, OwnerCategory, Unit, UnitStatus } from "./useUnits";

export function useSalesUnits(unitIds: string[]) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const stableUnitIds = useMemo(
    () => Array.from(new Set(unitIds.filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [unitIds],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchUnits = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    if (stableUnitIds.length === 0) {
      setUnits([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await salesApi.listSaleUnitsByIds(stableUnitIds);

    if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
      return;
    }

    if (result.error) {
      setUnits([]);
      setError(result.error);
      setLoading(false);
      return;
    }

    setUnits((result.data ?? []).map(mapSalesUnitRowToUnit));
    setLoading(false);
  }, [stableUnitIds]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        void fetchUnits();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchUnits]);

  return {
    units,
    loading,
    error,
    refresh: fetchUnits,
  };
}

export function mapSalesUnitRowToUnit(row: SalesUnitRow): Unit {
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
    has_active_reservation: false,
    active_reservation_id: null,
    active_reservation_showing_id: null,
    reservation_expires_at: null,
    notes: null,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
    bedrooms: null,
    bathrooms: null,
    toilets: null,
    final_price: row.final_price,
    sale_date: row.sale_date,
    buyer_name: row.buyer_name,
    payment_type: row.payment_type,
    crm_lead_id: row.crm_lead_id,
  };
}
