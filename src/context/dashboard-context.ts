import { createContext, type Dispatch, type SetStateAction } from "react";
import type { DashboardData } from "../types";

export type DashboardContextType = {
  selectedPeriod: string;
  setSelectedPeriod: Dispatch<SetStateAction<string>>;
  data: DashboardData;
  setData: Dispatch<SetStateAction<DashboardData>>;
  saveData: (newData: DashboardData) => Promise<{ error: string | null }>;
  resetData: () => void;
  dataLoading: boolean;
};

export const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);
