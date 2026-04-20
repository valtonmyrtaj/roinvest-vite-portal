import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useSaleMonthlySeries } from "./hooks/useSaleReporting";
import { formatEuro as fmtEur } from "./lib/formatCurrency";
import { NAVY } from "./ui/tokens";

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
      className="rounded-[12px] border border-[#e8e8ec] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      style={{ minWidth: 160 }}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-black/35">
        {d.label}
      </p>
      <p className="text-[20px] font-bold leading-none tracking-[-1px]" style={{ color: NAVY }}>
        {d.units}
        <span className="ml-1.5 text-[12px] font-normal text-black/40">njësi</span>
      </p>
      <p className="mt-1.5 text-[13px] font-semibold text-black/60">
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
  const {
    series: monthlySeries,
    error: monthlySeriesError,
  } = useSaleMonthlySeries({
    ownerScope: "Investitor",
    year: chartYear,
  });

  const chartData = useMemo<ChartEntry[]>(
    () =>
      monthlySeries.map((entry) => ({
        month: entry.monthShortLabel,
        label: `${entry.monthLabel} ${chartYear}`,
        units: entry.soldUnits,
        revenue: entry.contractedValue,
      })),
    [chartYear, monthlySeries],
  );

  const hasChartData = monthlySeries.some((entry) => entry.soldUnits > 0);

  if (!started) {
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
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} barSize={22} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          interval={0}
          height={42}
          tickMargin={8}
          tick={{ fontSize: 10.5, fill: "rgba(0,0,0,0.35)", fontWeight: 500 }}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "rgba(0,0,0,0.28)" }}
          width={36}
        />
        <Tooltip
          content={<SalesTooltip />}
          cursor={{ fill: "rgba(0,56,131,0.04)", radius: 6 }}
        />
        <Bar dataKey="units" radius={[0, 0, 0, 0]} maxBarSize={34}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.units > 0 ? NAVY : "#d9e3f3"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
