import { AnimatePresence, motion } from "framer-motion";
import { useState, type ComponentType, type CSSProperties } from "react";
import {
  NAVY,
  SOFT_EASE,
  fadeUp,
  fmtMetric,
  useCountUp,
} from "../shared";
import { Card } from "../primitives";

type SummaryMetricKey = "calls" | "contacts" | "showings" | "sales";

type SummaryMetric = {
  key: SummaryMetricKey;
  label: string;
  icon: ComponentType<{ size?: number; style?: CSSProperties; strokeWidth?: number }>;
  delay: number;
  curr: number;
};

type ChartPoint = {
  month: string;
  calls: number;
  contacts: number;
  showings: number;
  sales: number;
};

function AnnualActivityMetricRow({
  label,
  metricKey,
  color,
  data,
  maxValue,
  selectedMonth,
  onHover,
}: {
  label: string;
  metricKey: SummaryMetricKey;
  color: string;
  data: ChartPoint[];
  maxValue: number;
  selectedMonth: number;
  onHover: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-[74px_1fr] items-end gap-3">
      <div className="flex h-[54px] items-end pb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <span className="text-[11px] font-semibold text-black/42">{label}</span>
        </div>
      </div>
      <div className="grid h-[54px] grid-cols-12 items-end gap-2 border-b border-[#eef0f4]">
        {data.map((point, index) => {
          const value = point[metricKey];
          const isSelected = index === selectedMonth;
          const height = value > 0 ? Math.max(8, Math.round((value / maxValue) * 46)) : 2;

          return (
            <div
              key={`${metricKey}-${point.month}`}
              className="flex h-full items-end justify-center"
              onMouseEnter={() => onHover(index)}
              aria-label={`${label}, ${point.month}: ${fmtMetric(value)}`}
            >
              <motion.span
                className="w-[18px] rounded-t-[5px]"
                initial={false}
                animate={{ height }}
                transition={{ duration: 0.28, ease: SOFT_EASE }}
                style={{
                  backgroundColor: value > 0 ? color : "rgba(0,0,0,0.08)",
                  opacity: value > 0 ? (isSelected ? 1 : 0.78) : 0.45,
                  boxShadow: isSelected && value > 0 ? `0 7px 18px ${color}24` : "none",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnnualActivityMiniBars({
  data,
  selectedMonth,
  series,
}: {
  data: ChartPoint[];
  selectedMonth: number;
  series: Array<{ key: SummaryMetricKey; label: string; color: string }>;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? selectedMonth;
  const activePoint = data[activeIndex] ?? null;
  const maxByMetric = Object.fromEntries(
    series.map((item) => [item.key, Math.max(1, ...data.map((point) => point[item.key]))]),
  ) as Record<SummaryMetricKey, number>;

  return (
    <div
      className="rounded-[16px] border border-[#edf0f5] bg-[#fbfcfe] px-5 py-3.5"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="mb-3 flex min-h-[32px] items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-black/35">
          Shkallë e ndarë për secilin tregues
        </p>
        <AnimatePresence mode="wait">
          {activePoint ? (
            <motion.div
              key={activePoint.month}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[12px] border border-[#e8e8ec] bg-white px-3 py-2 shadow-[0_4px_14px_rgba(16,24,40,0.05)]"
            >
              <span className="text-[11px] font-semibold" style={{ color: NAVY }}>
                {activePoint.month}
              </span>
              <span className="text-[11px] text-black/35">|</span>
              {series.map((item) => (
                <span key={item.key} className="text-[11px] font-semibold" style={{ color: item.color }}>
                  {fmtMetric(activePoint[item.key])} {item.label.toLowerCase()}
                </span>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="space-y-2.5">
        {series.map((item) => (
          <AnnualActivityMetricRow
            key={item.key}
            label={item.label}
            metricKey={item.key}
            color={item.color}
            data={data}
            maxValue={maxByMetric[item.key]}
            selectedMonth={selectedMonth}
            onHover={setHoveredIndex}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-[74px_1fr] gap-3">
        <div />
        <div className="grid grid-cols-12 gap-2">
          {data.map((point, index) => {
            const isSelected = index === selectedMonth;
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

function SummaryKpiCard({
  label,
  value,
  icon: Icon,
  delay,
  active,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ size?: number; style?: CSSProperties; strokeWidth?: number }>;
  delay: number;
  active: boolean;
}) {
  const animated = useCountUp(value, active, 1400);

  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={{ y: -3, boxShadow: "0 12px 24px rgba(16,24,40,0.07)" }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex min-h-[92px] items-center gap-4 rounded-[16px] border border-[#edf0f5] bg-[#fbfcfe] px-5 py-4"
      style={{ boxShadow: "0 1px 2px rgba(16,24,40,0.035)" }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#f1f4fa]">
        <Icon size={16} style={{ color: NAVY }} strokeWidth={1.9} />
      </div>
      <div className="min-w-0">
        <p className="text-[33px] leading-none" style={{ fontWeight: 760, color: NAVY }}>
          {fmtMetric(animated)}
        </p>
        <p className="mt-1.5 truncate text-[10.5px] uppercase leading-none" style={{ fontWeight: 760, color: "rgba(0,0,0,0.38)" }}>
          {label.toLocaleUpperCase("sq-AL")}
        </p>
      </div>
    </motion.div>
  );
}

export function DailyLogSummary({
  summaryMetrics,
  summaryStarted,
  todayLabel,
  selectedMonth,
  selectedYear,
  annualChartData,
}: {
  summaryMetrics: SummaryMetric[];
  summaryStarted: boolean;
  todayLabel: string;
  selectedMonth: number;
  selectedYear: number;
  annualChartData: ChartPoint[];
}) {
  const chartSeries: Array<{
    key: SummaryMetricKey;
    label: string;
    color: string;
  }> = [
    {
      key: "calls",
      label: "Thirrje",
      color: NAVY,
    },
    {
      key: "contacts",
      label: "Kontakte",
      color: "#356fc8",
    },
    {
      key: "showings",
      label: "Shfaqje",
      color: "#b0892f",
    },
    {
      key: "sales",
      label: "Shitje",
      color: "#3c7a57",
    },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.16, ease: "easeOut" }}
        className="mb-5"
      >
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold leading-[1.25] tracking-[-0.02em]" style={{ color: NAVY }}>
                Aktiviteti ditor
              </p>
              <p className="mt-1 text-[12px] leading-[1.38]" style={{ color: "rgba(0, 56, 131, 0.68)" }}>
                {todayLabel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryMetrics.map((metric) => (
              <SummaryKpiCard
                key={metric.key}
                label={metric.label}
                value={metric.curr}
                icon={metric.icon}
                delay={metric.delay}
                active={summaryStarted}
              />
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.28, ease: "easeOut" }}
        className="mb-5"
      >
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold leading-[1.25] tracking-[-0.02em]" style={{ color: NAVY }}>
                Progresi gjatë vitit
              </p>
              <p className="mt-1 text-[12px] leading-[1.38]" style={{ color: "rgba(0, 56, 131, 0.68)" }}>
                Aktiviteti mujor sipas treguesve — {selectedYear}
              </p>
            </div>
          </div>
          <motion.div
            key={`chart-${selectedYear}`}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="min-h-[300px]"
          >
            <AnnualActivityMiniBars
              data={annualChartData}
              selectedMonth={selectedMonth}
              series={chartSeries}
            />
          </motion.div>
        </Card>
      </motion.div>
    </>
  );
}
