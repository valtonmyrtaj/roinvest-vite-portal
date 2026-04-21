import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
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

const ALBANIAN_MONTH_SHORT_LABELS = [
  "Jan",
  "Shk",
  "Mar",
  "Pri",
  "Maj",
  "Qer",
  "Kor",
  "Gus",
  "Sht",
  "Tet",
  "Nën",
  "Dhj",
] as const;

const FULL_MONTH_LABEL_MIN_WIDTH = 720;

interface ChartEntry {
  month: string;
  units: number;
  revenue: number;
  label: string;
}

interface TooltipPayloadItem {
  value: number;
  payload: ChartEntry;
}

function SalesTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div
      className="rounded-[12px] border border-[#e8e8ec] bg-white px-3.5 py-3"
      style={{
        minWidth: 164,
        boxShadow:
          "0 1px 2px rgba(16,24,40,0.045), 0 14px 32px rgba(16,24,40,0.08)",
      }}
    >
      <p
        className="mb-2 text-[10px] uppercase"
        style={{
          color: "rgba(15,23,42,0.42)",
          fontWeight: 600,
          letterSpacing: "0.12em",
        }}
      >
        {d.label}
      </p>
      <p
        className="text-[22px] leading-none tracking-[-0.03em]"
        style={{ color: NAVY, fontWeight: 700 }}
      >
        {d.units}
        <span
          className="ml-1.5 text-[11.5px]"
          style={{ color: "rgba(15,23,42,0.4)", fontWeight: 500 }}
        >
          njësi
        </span>
      </p>
      <p
        className="mt-2 text-[12.5px]"
        style={{ color: "rgba(15,23,42,0.58)", fontWeight: 600 }}
      >
        {fmtEur(d.revenue)}
      </p>
    </div>
  );
}

export default function OverviewMonthlySalesChart({
  chartYear,
  started,
}: {
  chartYear: number;
  started: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const chartFrameRef = useRef<HTMLDivElement | null>(null);
  const {
    series: monthlySeries,
    loading,
    error: monthlySeriesError,
  } = useSaleMonthlySeries({
    ownerScope: "Investitor",
    year: chartYear,
  });
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
  const [chartWidth, setChartWidth] = useState<number>(() =>
    typeof window === "undefined" ? FULL_MONTH_LABEL_MIN_WIDTH : window.innerWidth,
  );
  const shouldUseFullMonthLabels = chartWidth >= FULL_MONTH_LABEL_MIN_WIDTH;

  useEffect(() => {
    const node = chartFrameRef.current;
    if (!node) {
      return;
    }

    const updateWidth = (nextWidth: number) => {
      setChartWidth((currentWidth) =>
        Math.round(currentWidth) === Math.round(nextWidth) ? currentWidth : nextWidth,
      );
    };

    updateWidth(node.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      updateWidth(entry.contentRect.width);
    });

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const chartData = useMemo<ChartEntry[]>(
    () =>
      monthlySeries.map((entry) => {
        const monthIndex = Math.min(Math.max(entry.monthNumber - 1, 0), 11);
        const fullMonthLabel = ALBANIAN_MONTH_LABELS[monthIndex] ?? entry.monthLabel;
        const shortMonthLabel = ALBANIAN_MONTH_SHORT_LABELS[monthIndex] ?? entry.monthShortLabel;

        return {
          month: shouldUseFullMonthLabels ? fullMonthLabel : shortMonthLabel,
          label: `${fullMonthLabel} ${chartYear}`,
          units: entry.soldUnits,
          revenue: entry.contractedValue,
        };
      }),
    [chartYear, monthlySeries, shouldUseFullMonthLabels],
  );
  const maxUnits = useMemo(
    () => chartData.reduce((highestValue, entry) => Math.max(highestValue, entry.units), 0),
    [chartData],
  );
  const yAxisMax = maxUnits >= 4 ? maxUnits + 1 : 4;

  const hasChartData = monthlySeries.some((entry) => entry.soldUnits > 0);
  const shouldPlayIntro =
    started &&
    !loading &&
    !monthlySeriesError &&
    hasChartData &&
    !hasPlayedIntro &&
    !shouldReduceMotion;

  useEffect(() => {
    if (!shouldPlayIntro) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setHasPlayedIntro(true);
    }, 860);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [shouldPlayIntro]);

  if (!started || loading) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-[14px] border border-dashed border-[#e1e5eb] bg-[#fbfbfc] text-center">
        <p className="text-[12.5px] text-black/36">Duke ngarkuar grafikun...</p>
      </div>
    );
  }

  if (monthlySeriesError) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-[14px] border border-dashed border-[#e1e5eb] bg-[#fbfbfc] text-center">
        <p className="text-[12.5px] text-[#b14b4b]/80">
          Grafiku nuk u ngarkua për vitin e zgjedhur.
        </p>
      </div>
    );
  }

  if (!hasChartData) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-[14px] border border-dashed border-[#e1e5eb] bg-[#fbfbfc] text-center">
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
      ref={chartFrameRef}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: SOFT_EASE }}
      className="h-[166px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          barSize={22}
          barCategoryGap="26%"
          margin={{ top: 6, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="rgba(15,23,42,0.06)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            interval={0}
            height={34}
            tickMargin={10}
            tick={{
              fontSize: shouldUseFullMonthLabels ? 10.5 : 11,
              fill: "rgba(15,23,42,0.42)",
              fontWeight: 500,
            }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            domain={[0, yAxisMax]}
            tick={{ fontSize: 10.5, fill: "rgba(15,23,42,0.28)" }}
            width={34}
          />
          <Tooltip
            content={<SalesTooltip />}
            cursor={{ fill: "rgba(0,56,131,0.035)", radius: 8 }}
          />
          <Bar
            dataKey="units"
            radius={[0, 0, 0, 0]}
            maxBarSize={32}
            activeBar={{
              fillOpacity: 0.96,
              stroke: "rgba(255,255,255,0.85)",
              strokeWidth: 1,
            }}
            isAnimationActive={shouldPlayIntro}
            animationBegin={120}
            animationDuration={980}
            animationEasing="ease-in-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.units > 0 ? NAVY : "#d9e3f3"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
