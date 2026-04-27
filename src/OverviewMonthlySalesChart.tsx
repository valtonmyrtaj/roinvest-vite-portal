import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSaleMonthlySeries } from "./hooks/useSaleReporting";
import { formatEuro as fmtEur } from "./lib/formatCurrency";
import { NAVY, SOFT_EASE } from "./ui/tokens";

const ALBANIAN_MONTH_LABELS = [
  "Janar",
  "Shkurt",
  "Mars",
  "Prill",
  "Maj",
  "Qershor",
  "Korrik",
  "Gusht",
  "Shtator",
  "Tetor",
  "Nëntor",
  "Dhjetor",
] as const;

interface ChartEntry {
  month: string;
  units: number;
  revenue: number;
  label: string;
}

function SalesMiniBars({
  data,
  selectedMonth,
}: {
  data: ChartEntry[];
  selectedMonth: string | null;
}) {
  const shouldReduceMotion = useReducedMotion();
  const selectedIndex = selectedMonth
    ? data.findIndex((point) => point.month === selectedMonth)
    : -1;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? (selectedIndex >= 0 ? selectedIndex : null);
  const activePoint = activeIndex === null ? null : data[activeIndex];
  const maxUnits = Math.max(1, ...data.map((point) => point.units));

  return (
    <div
      className="rounded-[16px] border border-[#edf0f5] bg-[#fbfcfe] px-5 py-3.5"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="mb-3 flex min-h-[32px] items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-black/35">
          Shitje të kontraktuara sipas muajit
        </p>
        <AnimatePresence mode="wait">
          {activePoint ? (
            <motion.div
              key={activePoint.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="flex items-center gap-3 rounded-[12px] border border-[#e8e8ec] bg-white px-3 py-2 shadow-[0_4px_14px_rgba(16,24,40,0.05)]"
            >
              <span className="text-[11px] font-semibold" style={{ color: NAVY }}>
                {activePoint.month}
              </span>
              <span className="text-[11px] text-black/35">|</span>
              <span className="text-[11px] font-semibold" style={{ color: NAVY }}>
                {activePoint.units} njësi
              </span>
              <span className="text-[11px] font-semibold text-black/45">
                {fmtEur(activePoint.revenue)}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-[62px_1fr] items-end gap-3">
        <div className="flex h-[190px] items-end pb-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: NAVY }} />
            <span className="text-[11px] font-semibold text-black/42">Shitje</span>
          </div>
        </div>
        <div className="grid h-[190px] grid-cols-12 items-end gap-2 border-b border-[#eef0f4]">
          {data.map((point, index) => {
            const isSelected = point.month === selectedMonth;
            const height = point.units > 0 ? Math.max(8, Math.round((point.units / maxUnits) * 158)) : 2;

            return (
              <div
                key={`sales-${point.month}`}
                className="flex h-full items-end justify-center"
                onMouseEnter={() => setHoveredIndex(index)}
                aria-label={`${point.label}: ${point.units} njësi, ${fmtEur(point.revenue)}`}
              >
                <motion.span
                  className="w-[24px] rounded-t-[7px]"
                  initial={shouldReduceMotion ? false : { height: 0 }}
                  animate={{ height }}
                  transition={{
                    duration: 0.34,
                    delay: shouldReduceMotion ? 0 : index * 0.018,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    backgroundColor: point.units > 0 ? NAVY : "rgba(0,0,0,0.08)",
                    opacity: point.units > 0 ? (isSelected ? 1 : 0.84) : 0.45,
                    boxShadow: isSelected && point.units > 0 ? `0 7px 18px ${NAVY}24` : "none",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-[62px_1fr] gap-3">
        <div />
        <div className="grid grid-cols-12 gap-2">
          {data.map((point) => {
            const isSelected = point.month === selectedMonth;
            return (
              <span
                key={point.month}
                className="text-center text-[9px] tracking-[-0.025em]"
                style={{
                  color: isSelected ? NAVY : "rgba(0,0,0,0.36)",
                  fontWeight: isSelected ? 800 : 600,
                }}
              >
                {point.month}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function OverviewMonthlySalesChart({
  chartYear,
  selectedMonthIndex,
  started,
}: {
  chartYear: number | null;
  selectedMonthIndex: number | null;
  started: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const {
    series: monthlySeries,
    loading,
    error: monthlySeriesError,
  } = useSaleMonthlySeries({
    ownerScope: "Investitor",
    year: chartYear,
  });

  const chartData = useMemo<ChartEntry[]>(
    () =>
      monthlySeries.map((entry) => {
        const monthIndex = Math.min(Math.max(entry.monthNumber - 1, 0), 11);
        const fullMonthLabel = ALBANIAN_MONTH_LABELS[monthIndex] ?? entry.monthLabel;

        return {
          month: fullMonthLabel,
          label: chartYear === null ? fullMonthLabel : `${fullMonthLabel} ${chartYear}`,
          units: entry.soldUnits,
          revenue: entry.contractedValue,
        };
      }),
    [chartYear, monthlySeries],
  );
  const selectedMonthLabel =
    selectedMonthIndex === null ? null : ALBANIAN_MONTH_LABELS[selectedMonthIndex] ?? null;

  const hasChartData = monthlySeries.some((entry) => entry.soldUnits > 0);

  if (chartYear === null) {
    return (
      <div className="flex h-[252px] items-center justify-center rounded-[16px] border border-dashed border-[#e1e5eb] bg-[#fbfbfc] text-center">
        <div>
          <p className="text-[13px] font-medium text-black/52">
            Grafiku mujor kërkon një vit të zgjedhur
          </p>
          <p className="mt-1 text-[12px] text-black/34">
            Zgjidh një vit sipër që KPI-të dhe grafiku të përdorin të njëjtën periudhë.
          </p>
        </div>
      </div>
    );
  }

  if (!started || loading) {
    return (
      <div className="flex h-[252px] items-center justify-center rounded-[16px] border border-dashed border-[#e1e5eb] bg-[#fbfbfc] text-center">
        <p className="text-[12.5px] text-black/36">Duke ngarkuar grafikun...</p>
      </div>
    );
  }

  if (monthlySeriesError) {
    return (
      <div className="flex h-[252px] items-center justify-center rounded-[16px] border border-dashed border-[#e1e5eb] bg-[#fbfbfc] text-center">
        <p className="text-[12.5px] text-[#b14b4b]/80">
          Grafiku nuk u ngarkua për vitin e zgjedhur.
        </p>
      </div>
    );
  }

  if (!hasChartData) {
    return (
      <div className="flex h-[252px] items-center justify-center rounded-[16px] border border-dashed border-[#e1e5eb] bg-[#fbfbfc] text-center">
        <div>
          <p className="text-[13px] font-medium text-black/52">
            Asnjë shitje e regjistruar për vitin {chartYear}
          </p>
          <p className="mt-1 text-[12px] text-black/34">
            Grafiku do të shfaqet sapo të ketë aktivitet në këtë periudhë.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: SOFT_EASE }}
      className="min-h-[252px]"
    >
      <SalesMiniBars data={chartData} selectedMonth={selectedMonthLabel} />
    </motion.div>
  );
}
