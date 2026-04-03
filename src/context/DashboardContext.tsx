import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { seedData } from "../assets/data/seedData";
import type { DashboardData } from "../types";
import { supabase } from "../lib/supabase";

type DashboardContextType = {
  selectedPeriod: string;
  setSelectedPeriod: Dispatch<SetStateAction<string>>;
  data: DashboardData;
  setData: Dispatch<SetStateAction<DashboardData>>;
  saveData: (newData: DashboardData) => Promise<{ error: string | null }>;
  resetData: () => void;
  dataLoading: boolean;
};

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

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

        const query = supabase
          .from("dashboard_snapshots")
          .select("data")
          .eq("period", selectedPeriod)
          .maybeSingle();

        const result = await Promise.race([query, timeout]);

        if (cancelled) return;

        if (result && "data" in result && result.data?.data) {
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
        const upsertPromise = supabase
          .from("dashboard_snapshots")
          .upsert(
            {
              period: selectedPeriod,
              data: newData,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "period" }
          );

        const timeoutPromise = new Promise<{ error: { message: string } }>(
          (resolve) =>
            setTimeout(
              () => resolve({ error: { message: "Request timed out" } }),
              8000
            )
        );

        const result = await Promise.race([upsertPromise, timeoutPromise]);
        return { error: result.error?.message ?? null };
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

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }

  return context;
}
