import { useCallback, useEffect, useRef, useState } from "react";
import { unitDetail as unitDetailApi } from "../lib/api";
import type { UnitDetailSnapshot } from "../lib/api/unitDetail";
import type { Block, Level, OwnerCategory, Unit, UnitOrientation, UnitStatus } from "./useUnits";

export function useUnitDetail(unitId: string | null) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchUnit = useCallback(async () => {
    if (!unitId) {
      setUnit(null);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    const result = await unitDetailApi.getUnitDetailSnapshot(unitId);

    if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
      return;
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!result.data) {
      setError("Detajet e njësisë nuk u ngarkuan.");
      setLoading(false);
      return;
    }

    setUnit(mapUnitDetailSnapshot(result.data));
    setLoading(false);
  }, [unitId]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        void fetchUnit();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchUnit]);

  return {
    unit,
    loading,
    error,
    refresh: fetchUnit,
  };
}

function mapUnitDetailSnapshot(snapshot: UnitDetailSnapshot): Unit {
  const row = snapshot.unit;

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
    reservation_expires_at:
      row.reservation_expires_at ?? snapshot.activeReservation?.expires_at ?? null,
    has_active_reservation: Boolean(snapshot.activeReservation),
    active_reservation_id: snapshot.activeReservation?.reservation_id ?? null,
    active_reservation_showing_id: snapshot.activeReservation?.showing_id ?? null,
    active_reservation_contact_name: snapshot.activeReservation?.contact_name ?? null,
    active_reservation_contact_phone: snapshot.activeReservation?.contact_phone ?? null,
    active_reservation_reserved_at: snapshot.activeReservation?.reserved_at ?? null,
    active_reservation_notes: snapshot.activeReservation?.notes ?? null,
    notes: row.notes,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    toilets: row.toilets,
    orientation: row.orientation as UnitOrientation | null,
    floorplan_code: row.floorplan_code,
    has_storage: row.has_storage ?? false,
    balcony_area: row.balcony_area,
    terrace_area: row.terrace_area,
    final_price: snapshot.activeSale?.final_price ?? null,
    sale_date: snapshot.activeSale?.sale_date || row.sale_date,
    buyer_name: snapshot.activeSale?.buyer_name ?? row.buyer_name,
    buyer_phone: snapshot.activeSale?.buyer_phone ?? null,
    payment_type: snapshot.activeSale?.payment_type ?? null,
    crm_lead_id: snapshot.activeSale?.crm_lead_id ?? null,
  };
}
