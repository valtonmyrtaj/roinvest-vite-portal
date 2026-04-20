import { useState, useEffect, useCallback, useRef } from "react";
import { marketing } from "../lib/api";
import type {
  MarketingRow,
  MarketingInput,
  OfflineEntry,
  OfflineInput,
} from "../lib/api/marketing";

// Re-export the canonical types from the data-access layer so existing
// import sites (`from "./hooks/useMarketing"`) keep working unchanged.
export type { MarketingRow, MarketingInput, OfflineEntry, OfflineInput };

/**
 * Adapt the api layer's `{ data, error: string | null }` result into the
 * hook's long-standing `{ error: Error | null }` public contract.
 */
function toErrorResult(error: string | null): { error: Error | null } {
  return { error: error ? new Error(error) : null };
}

export function useMarketing() {
  const [marketingData, setMarketingData]   = useState<MarketingRow[]>([]);
  const [offlineEntries, setOfflineEntries] = useState<OfflineEntry[]>([]);
  const [loading, setLoading]               = useState(true);
  // Ignore late responses so an older mount fetch cannot overwrite a newer refresh.
  const latestFetchRequestIdRef             = useRef(0);
  const isMountedRef                        = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadMarketing = useCallback(async () => {
    const requestId = ++latestFetchRequestIdRef.current;
    const { data, error } = await marketing.listMarketing();

    if (!isMountedRef.current || requestId !== latestFetchRequestIdRef.current) {
      return;
    }

    if (!error && data) {
      setMarketingData(data.digital);
      setOfflineEntries(data.offline);
    }
    setLoading(false);
  }, []);

  const fetchMarketing = useCallback(async () => {
    setLoading(true);
    await loadMarketing();
  }, [loadMarketing]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      void loadMarketing();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [loadMarketing]);

  /** Upsert digital monthly data — updates if year+month row exists, inserts otherwise. */
  const saveMonthlyData = useCallback(
    async (input: MarketingInput): Promise<{ error: Error | null }> => {
      const { error } = await marketing.saveMonthlyData(input);
      if (!error) await fetchMarketing();
      return toErrorResult(error);
    },
    [fetchMarketing]
  );

  /** Insert a new offline marketing entry. */
  const createOfflineEntry = useCallback(
    async (data: OfflineInput): Promise<{ error: Error | null }> => {
      const { error } = await marketing.createOfflineEntry(data);
      if (!error) await fetchMarketing();
      return toErrorResult(error);
    },
    [fetchMarketing]
  );

  /** Update an existing digital marketing row by id. */
  const updateDigitalEntry = useCallback(
    async (id: string, input: MarketingInput): Promise<{ error: Error | null }> => {
      const { error } = await marketing.updateDigitalEntry(id, input);
      if (!error) await fetchMarketing();
      return toErrorResult(error);
    },
    [fetchMarketing]
  );

  /** Update an existing offline marketing entry by id. */
  const updateOfflineEntry = useCallback(
    async (id: string, data: OfflineInput): Promise<{ error: Error | null }> => {
      const { error } = await marketing.updateOfflineEntry(id, data);
      if (!error) await fetchMarketing();
      return toErrorResult(error);
    },
    [fetchMarketing]
  );

  /** Delete an offline entry by id. */
  const deleteOfflineEntry = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      const { error } = await marketing.deleteOfflineEntry(id);
      if (!error) await fetchMarketing();
      return toErrorResult(error);
    },
    [fetchMarketing]
  );

  /** Delete a digital entry by id. */
  const deleteDigitalEntry = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      const { error } = await marketing.deleteDigitalEntry(id);
      if (!error) await fetchMarketing();
      return toErrorResult(error);
    },
    [fetchMarketing]
  );

  return {
    marketingData,
    offlineEntries,
    loading,
    fetchMarketing,
    saveMonthlyData,
    updateDigitalEntry,
    createOfflineEntry,
    updateOfflineEntry,
    deleteDigitalEntry,
    deleteOfflineEntry,
  };
}
