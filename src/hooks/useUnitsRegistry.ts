import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { unitsRegistry as unitsRegistryApi } from "../lib/api";
import type { RegistryUnitRow, UnitsRegistryFilters } from "../lib/api/unitsRegistry";

export function useUnitsRegistry(filters: UnitsRegistryFilters) {
  const [rows, setRows] = useState<RegistryUnitRow[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [scopeCount, setScopeCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const stableFilters = useMemo(
    () => ({
      block: filters.block ?? "",
      type: filters.type ?? "",
      level: filters.level ?? "",
      status: filters.status ?? "",
      category: filters.category ?? "",
      entity: filters.entity ?? "",
      search: filters.search?.trim() ?? "",
      page: Math.max(1, filters.page ?? 1),
      pageSize: Math.min(100, Math.max(1, filters.pageSize ?? 40)),
    }),
    [
      filters.block,
      filters.category,
      filters.entity,
      filters.level,
      filters.page,
      filters.pageSize,
      filters.search,
      filters.status,
      filters.type,
    ],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchRegistry = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    const result = await unitsRegistryApi.getUnitsRegistrySnapshot(stableFilters);

    if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
      return;
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!result.data) {
      setError("Regjistri i njësive nuk u ngarkua.");
      setLoading(false);
      return;
    }

    setRows(result.data.rows);
    setFilteredCount(result.data.filteredCount);
    setScopeCount(result.data.scopeCount);
    setPage(result.data.page);
    setPageSize(result.data.pageSize);
    setLoading(false);
  }, [stableFilters]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        void fetchRegistry();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchRegistry]);

  return {
    rows,
    filteredCount,
    scopeCount,
    page,
    pageSize,
    loading,
    error,
    refresh: fetchRegistry,
  };
}
