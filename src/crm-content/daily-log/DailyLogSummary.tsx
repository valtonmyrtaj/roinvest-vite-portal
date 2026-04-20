import { AnimatePresence, motion } from "framer-motion";
import { type ComponentType, type CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CustomSelect } from "../../components/CustomSelect";
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
  prev: number | null;
};

type ChartPoint = {
  month: string;
  calls: number;
  contacts: number;
  showings: number;
  sales: number;
};

function SummaryDelta({
  value,
  prevValue,
  comparisonText,
}: {
  value: number;
  prevValue: number | null;
  comparisonText: string;
}) {
  if (prevValue === null) return null;

  const delta = value - prevValue;
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const color = isPositive ? "#3c7a57" : isNegative ? "#b14b4b" : "rgba(0,0,0,0.38)";
  const formattedDelta = `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${fmtMetric(Math.abs(delta))}`;
  const iconState = isPositive ? "positive" : isNegative ? "negative" : "neutral";

  const iconMotion =
    iconState === "positive"
      ? {
          initial: { opacity: 0, y: 3, scale: 0.94 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -2, scale: 0.97 },
        }
      : iconState === "negative"
        ? {
            initial: { opacity: 0, y: -3, scale: 0.94 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: 2, scale: 0.97 },
          }
        : {
            initial: { opacity: 0, scale: 0.96 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.96 },
          };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`${value}-${prevValue}-${comparisonText}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: SOFT_EASE }}
        className="flex min-h-[18px] items-center gap-1.5"
      >
        <motion.span
          key={`${iconState}-${value}-${prevValue}`}
          initial={iconMotion.initial}
          animate={iconMotion.animate}
          exit={iconMotion.exit}
          transition={{ duration: 0.18, ease: SOFT_EASE }}
          className="flex items-center"
        >
          {isPositive ? (
            <ArrowUpRight size={12} style={{ color }} strokeWidth={2.1} />
          ) : isNegative ? (
            <ArrowDownRight size={12} style={{ color }} strokeWidth={2.1} />
          ) : (
            <Minus size={12} style={{ color }} strokeWidth={2.1} />
          )}
        </motion.span>
        <span className="text-[12px]" style={{ color, fontWeight: 600 }}>
          {formattedDelta}
        </span>
        <span className="text-[11.5px] text-black/32">vs {comparisonText}</span>
      </motion.div>
    </AnimatePresence>
  );
}

function SummaryKpiCard({
  label,
  value,
  prevValue,
  icon: Icon,
  delay,
  active,
  comparisonText,
}: {
  label: string;
  value: number;
  prevValue: number | null;
  icon: ComponentType<{ size?: number; style?: CSSProperties; strokeWidth?: number }>;
  delay: number;
  active: boolean;
  comparisonText: string;
}) {
  const animated = useCountUp(value, active, 1400);

  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(0,0,0,0.09)" }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 rounded-[20px] border border-[#E8E8EC] bg-white px-6 py-6"
      style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.06)" }}
    >
      <div className="mb-4 flex items-start">
        <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#eaf0fa]">
          <Icon size={16} style={{ color: NAVY }} strokeWidth={1.8} />
        </div>
      </div>
      <p className="text-[36px] leading-none tracking-[-2px]" style={{ fontWeight: 700, color: NAVY }}>
        {fmtMetric(animated)}
      </p>
      <div className="mt-2">
        <SummaryDelta value={value} prevValue={prevValue} comparisonText={comparisonText} />
      </div>
      <p className="mt-2 text-[12.5px] text-black/45" style={{ fontWeight: 500 }}>
        {label}
      </p>
    </motion.div>
  );
}

export function DailyLogSummary({
  selectedEntryLabel,
  summaryMetrics,
  summaryStarted,
  selectedDayComparisonText,
  selectedYear,
  yearOptions,
  onYearChange,
  annualChartData,
}: {
  selectedEntryLabel: string | null;
  summaryMetrics: SummaryMetric[];
  summaryStarted: boolean;
  selectedDayComparisonText: string;
  selectedYear: number;
  yearOptions: string[];
  onYearChange: (year: number) => void;
  annualChartData: ChartPoint[];
}) {
  const chartSeries: Array<{
    key: SummaryMetricKey;
    label: string;
    color: string;
    strokeWidth: number;
    strokeOpacity: number;
    activeDotRadius: number;
    activeDotStrokeWidth: number;
    style?: CSSProperties;
  }> = [
    {
      key: "calls",
      label: "Thirrje",
      color: NAVY,
      strokeWidth: 2.2,
      strokeOpacity: 0.9,
      activeDotRadius: 5,
      activeDotStrokeWidth: 2.4,
    },
    {
      key: "contacts",
      label: "Kontakte",
      color: "#356fc8",
      strokeWidth: 2.8,
      strokeOpacity: 0.96,
      activeDotRadius: 6,
      activeDotStrokeWidth: 3,
      style: { filter: "drop-shadow(0 0 6px rgba(53,111,200,0.18))" },
    },
    {
      key: "showings",
      label: "Shfaqje",
      color: "#b0892f",
      strokeWidth: 2.2,
      strokeOpacity: 0.92,
      activeDotRadius: 5,
      activeDotStrokeWidth: 2.4,
    },
    {
      key: "sales",
      label: "Shitje",
      color: "#3c7a57",
      strokeWidth: 2.2,
      strokeOpacity: 0.92,
      activeDotRadius: 5,
      activeDotStrokeWidth: 2.4,
    },
  ];

  const chartRenderOrder: SummaryMetricKey[] = ["calls", "showings", "sales", "contacts"];
  const chartSeriesByKey = Object.fromEntries(chartSeries.map((series) => [series.key, series])) as Record<
    SummaryMetricKey,
    (typeof chartSeries)[number]
  >;

  return (
    <>
      <div className="mb-5">
        <p className="text-[14px] font-semibold tracking-[-0.2px]" style={{ color: NAVY }}>
          Aktiviteti ditor
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-3">
          <p className="text-[12px] text-black/35">Regjistri ditor i aktivitetit operacional</p>
          {selectedEntryLabel && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#9ca3af",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {selectedEntryLabel}
            </span>
          )}
        </div>
      </div>

      <div className="mb-5 flex gap-4">
        {summaryMetrics.map((metric) => (
          <SummaryKpiCard
            key={metric.key}
            label={metric.label}
            value={metric.curr}
            prevValue={metric.prev}
            icon={metric.icon}
            delay={metric.delay}
            active={summaryStarted}
            comparisonText={selectedDayComparisonText}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.28, ease: "easeOut" }}
        className="mb-5"
      >
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[#f0f0f2] px-5 py-3.5">
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
                Progresi gjatë vitit
              </p>
              <p className="mt-0.5 text-[12px] text-black/35">Jan–Dhj · Viti {selectedYear}</p>
            </div>
            <div className="w-[104px]">
              <CustomSelect
                value={String(selectedYear)}
                onChange={(value) => {
                  const nextYear = Number(value);
                  if (Number.isFinite(nextYear)) onYearChange(nextYear);
                }}
                options={yearOptions}
                placeholder="Viti"
                size="sm"
              />
            </div>
          </div>
          <motion.div
            key={`chart-${selectedYear}`}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-[248px] px-3 py-3"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={annualChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(0,0,0,0.35)", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(0,0,0,0.28)", fontSize: 11 }}
                  width={30}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(0,56,131,0.12)", strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(232,232,236,1)",
                    boxShadow: "0 10px 30px rgba(16,24,40,0.08)",
                    padding: "10px 12px",
                  }}
                  labelStyle={{ color: "rgba(0,0,0,0.72)", fontWeight: 600, marginBottom: 6 }}
                  formatter={(value, key) => {
                    const label = chartSeries.find((series) => series.key === key)?.label ?? key;
                    return [value, label];
                  }}
                />
                {chartRenderOrder.map((seriesKey) => {
                  const series = chartSeriesByKey[seriesKey];
                  return (
                    <Line
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      stroke={series.color}
                      strokeWidth={series.strokeWidth}
                      strokeOpacity={series.strokeOpacity}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={{
                        r: series.activeDotRadius,
                        fill: "rgba(255,255,255,0.94)",
                        stroke: series.color,
                        strokeWidth: series.activeDotStrokeWidth,
                      }}
                      style={series.style}
                      isAnimationActive
                      animationDuration={520}
                      animationEasing="ease-out"
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#f0f0f2] px-5 py-3">
            {chartSeries.map((series) => (
              <span key={series.key} className="inline-flex items-center gap-1.5 text-[11px] text-black/45">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: series.color }} />
                {series.label}
              </span>
            ))}
          </div>
        </Card>
      </motion.div>
    </>
  );
}
