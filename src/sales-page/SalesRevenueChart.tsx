import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Card } from "./primitives";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { NAVY, SQ_MONTHS, type ChartPoint } from "./shared";

function MonthlyRevenueMiniBars({
  chartData,
  selectedMonth,
}: {
  chartData: ChartPoint[];
  selectedMonth: number | "all";
}) {
  const shouldReduceMotion = useReducedMotion();
  const selectedMonthLabel = selectedMonth === "all" ? null : SQ_MONTHS[selectedMonth];
  const selectedIndex =
    selectedMonthLabel === null
      ? -1
      : chartData.findIndex((point) => point.monthIndex === selectedMonth);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? (selectedIndex >= 0 ? selectedIndex : null);
  const activePoint = activeIndex === null ? null : chartData[activeIndex];
  const maxRevenue = Math.max(1, ...chartData.map((point) => point.revenue));

  return (
    <div
      className="rounded-[16px] border border-[#edf0f5] bg-[#fbfcfe] px-5 py-3.5"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="mb-3 flex min-h-[32px] items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-black/35">
          Vlerë mujore e kontraktuar
        </p>
        <AnimatePresence mode="wait">
          {activePoint ? (
            <motion.div
              key={`${activePoint.monthIndex}-${activePoint.revenue}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="flex items-center gap-3 rounded-[12px] border border-[#e8e8ec] bg-white px-3 py-2 shadow-[0_4px_14px_rgba(16,24,40,0.05)]"
            >
              <span className="text-[11px] font-semibold" style={{ color: NAVY }}>
                {SQ_MONTHS[activePoint.monthIndex] ?? activePoint.month}
              </span>
              <span className="text-[11px] text-black/35">|</span>
              <span className="text-[11px] font-semibold" style={{ color: NAVY }}>
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
            <span className="text-[11px] font-semibold text-black/42">Kontrata</span>
          </div>
        </div>
        <div className="grid h-[190px] grid-cols-12 items-end gap-2 border-b border-[#eef0f4]">
          {chartData.map((point, index) => {
            const isSelected = selectedMonth !== "all" && point.monthIndex === selectedMonth;
            const height =
              point.revenue > 0 ? Math.max(8, Math.round((point.revenue / maxRevenue) * 158)) : 2;

            return (
              <div
                key={`${point.monthIndex}-${point.month}`}
                className="flex h-full items-end justify-center"
                onMouseEnter={() => setHoveredIndex(index)}
                aria-label={`${SQ_MONTHS[point.monthIndex] ?? point.month}: ${fmtEur(
                  point.revenue,
                )}`}
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
                    backgroundColor: point.revenue > 0 ? NAVY : "rgba(0,0,0,0.08)",
                    opacity: point.revenue > 0 ? (isSelected ? 1 : 0.84) : 0.45,
                    boxShadow:
                      isSelected && point.revenue > 0 ? `0 7px 18px ${NAVY}24` : "none",
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
          {chartData.map((point) => {
            const isSelected = selectedMonth !== "all" && point.monthIndex === selectedMonth;
            return (
              <span
                key={point.monthIndex}
                className="text-center text-[9px] tracking-[-0.025em]"
                style={{
                  color: isSelected ? NAVY : "rgba(0,0,0,0.36)",
                  fontWeight: isSelected ? 800 : 600,
                }}
              >
                {SQ_MONTHS[point.monthIndex] ?? point.month}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SalesRevenueChart({
  selectedYear,
  selectedMonth,
  loading,
  error,
  chartData,
}: {
  selectedYear: number;
  selectedMonth: number | "all";
  loading: boolean;
  error: string | null;
  chartData: ChartPoint[];
}) {
  const hasRevenueData = chartData.some((item) => item.revenue > 0);

  return (
    <div className="mt-6">
      <Card className="overflow-hidden">
        <CardSectionHeader
          title="Vlera e kontraktuar mujore"
          subtitle={`Ritmi i shitjeve për vitin ${selectedYear}`}
          className="mb-3 border-b-0 px-0 py-0"
          bodyClassName="max-w-[420px]"
          titleClassName="text-[16px] leading-[1.18] tracking-[0em]"
          subtitleClassName="mt-0.5 text-[11.75px] leading-[1.35]"
          titleStyle={{ fontWeight: 700 }}
          subtitleStyle={{ color: "rgba(15,23,42,0.42)" }}
        />

        <div className="min-h-[252px]">
          {error ? (
            <div className="flex h-[252px] items-center justify-center rounded-[16px] border border-dashed border-[#e6e8ec] bg-[#fafbfc] px-6 text-center text-[13px] text-[#b14b4b]/80">
              Seria mujore nuk u ngarkua për vitin e zgjedhur.
            </div>
          ) : loading ? (
            <div className="flex h-[252px] flex-col justify-end gap-4 rounded-[16px] border border-dashed border-[#edf0f4] bg-[#fbfcfd] px-5 py-5">
              <div className="grid h-full grid-cols-12 items-end gap-3">
                {Array.from({ length: 12 }, (_, index) => (
                  <div key={index} className="flex h-full flex-col justify-end gap-2">
                    <div
                      className="animate-pulse rounded-t-[10px] bg-[#e7ebf2]"
                      style={{ height: `${28 + ((index % 5) + 1) * 18}px` }}
                    />
                    <div className="mx-auto h-[10px] w-[22px] animate-pulse rounded-full bg-[#eef1f5]" />
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-black/34">
                Duke ngarkuar serinë mujore për {selectedYear}
              </p>
            </div>
          ) : !hasRevenueData ? (
            <div className="flex h-[252px] items-center justify-center rounded-[16px] border border-dashed border-[#e6e8ec] bg-[#fafbfc] px-6 text-center">
              <div className="max-w-[320px]">
                <p className="text-[13px] font-medium text-black/48">
                  Nuk ka shitje të regjistruara për {selectedYear}
                </p>
                <p className="mt-1 text-[11.5px] text-black/34">
                  Grafiku do të plotësohet sapo të regjistrohen kontrata gjatë këtij viti.
                </p>
              </div>
            </div>
          ) : (
            <MonthlyRevenueMiniBars chartData={chartData} selectedMonth={selectedMonth} />
          )}
        </div>
      </Card>
    </div>
  );
}
