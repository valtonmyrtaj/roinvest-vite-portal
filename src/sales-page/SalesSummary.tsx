import { motion } from "framer-motion";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { KpiCard } from "./primitives";

type SalesKpiItem = {
  label: string;
  value: number;
  color: string;
  icon: ComponentType<{
    size?: number;
    style?: CSSProperties;
    strokeWidth?: number;
  }>;
  formatValue?: (value: number) => string;
};

export function SalesSummary({
  financialSummaryReady,
  financialMetricsLoading,
  financialMetricsError,
  kpis,
  periodControls,
}: {
  financialSummaryReady: boolean;
  financialMetricsLoading: boolean;
  financialMetricsError: string | null;
  kpis: SalesKpiItem[];
  periodControls: ReactNode;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="mb-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="md:col-start-2 xl:col-start-4">{periodControls}</div>
      </motion.div>
      {financialMetricsError && (
        <p className="mb-4 -mt-1 text-[12px] text-[#b14b4b]/80">
          Treguesit financiarë nuk u ngarkuan për periudhën e zgjedhur.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            <KpiCard
              {...kpi}
              active={financialSummaryReady}
              loading={financialMetricsLoading}
              displayValueOverride={financialMetricsError ? "—" : undefined}
            />
          </motion.div>
        ))}
      </div>
    </>
  );
}
