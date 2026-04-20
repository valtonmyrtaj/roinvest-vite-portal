import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedData } from "../assets/data/seedData";
import type { DashboardData } from "../types";
import { dashboard } from "../lib/api";
import { DashboardContext } from "./dashboard-context";

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedPeriod, setSelectedPeriod] = useState("Mar 2026");
  const [data, setData] = useState<DashboardData>(seedData);
  const [dataLoading, setDataLoading] = useState(true);

  // Load data from Supabase whenever the selected period changes
  useEffect(() => {
    let cancelled = false;

    async function fetchPeriodData() {
      setDataLoading(true);

      try {
        const timeout = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 5000)
        );

        const query = dashboard.getDashboardSnapshot(selectedPeriod);

        const result = await Promise.race([query, timeout]);

        if (cancelled) return;

        if (result && !result.error && result.data?.data) {
          setData(result.data.data as DashboardData);
        } else {
          setData(seedData);
        }
      } catch {
        if (!cancelled) setData(seedData);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    fetchPeriodData();

    return () => {
      cancelled = true;
    };
  }, [selectedPeriod]);

  // Save data to Supabase and update local state
  const saveData = useCallback(
    async (newData: DashboardData): Promise<{ error: string | null }> => {
      setData(newData);

      try {
        const upsertPromise = dashboard.saveDashboardSnapshot({
          period: selectedPeriod,
          data: newData,
          updated_at: new Date().toISOString(),
        });

        const timeoutPromise = new Promise<{ data: null; error: string }>(
          (resolve) =>
            setTimeout(() => resolve({ data: null, error: "Request timed out" }), 8000)
        );

        const result = await Promise.race([upsertPromise, timeoutPromise]);
        return { error: result.error ?? null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Unknown error" };
      }
    },
    [selectedPeriod]
  );

  const resetData = useCallback(() => {
    setData(seedData);
  }, []);

  const value = useMemo(
    () => ({
      selectedPeriod,
      setSelectedPeriod,
      data,
      setData,
      saveData,
      resetData,
      dataLoading,
    }),
    [selectedPeriod, data, saveData, resetData, dataLoading]
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
