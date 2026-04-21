import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, RevenueTooltip } from "./primitives";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { fmtRevenueAxisTick, NAVY, type ChartPoint } from "./shared";

export function SalesRevenueChart({
  selectedYear,
  selectedMonth,
  loading,
  error,
  chartData,
  revenueAxis,
}: {
  selectedYear: number;
  selectedMonth: number | "all";
  loading: boolean;
  error: string | null;
  chartData: ChartPoint[];
  revenueAxis: {
    max: number;
    ticks: number[];
  };
}) {
  return (
    <div className="mt-6">
      <Card className="overflow-hidden">
        <CardSectionHeader
          title="Vlera e kontraktuar mujore"
          subtitle={`Ritmi i shitjeve për vitin ${selectedYear}`}
          className="mb-5 border-b-0 px-0 py-0"
          bodyClassName="max-w-[420px]"
        />

        <div className="h-[280px]">
          {error ? (
            <div className="flex h-full items-center justify-center rounded-[18px] border border-dashed border-[#e6e8ec] bg-[#fafbfc] px-6 text-center text-[13px] text-[#b14b4b]/80">
              Seria mujore nuk u ngarkua për vitin e zgjedhur.
            </div>
          ) : loading ? (
            <div className="flex h-full flex-col justify-end gap-4 rounded-[18px] border border-dashed border-[#edf0f4] bg-[#fbfcfd] px-5 py-5">
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
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -18, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "rgba(0,0,0,0.35)" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  domain={[0, revenueAxis.max]}
                  ticks={revenueAxis.ticks}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "rgba(0,0,0,0.35)" }}
                  tickFormatter={fmtRevenueAxisTick}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(0,56,131,0.04)" }} />
                <Bar dataKey="revenue" radius={[0, 0, 0, 0]} maxBarSize={34}>
                  {chartData.map((row) => (
                    <Cell
                      key={`${row.month}-${row.monthIndex}`}
                      fill={
                        selectedMonth === "all" || row.monthIndex === selectedMonth
                          ? NAVY
                          : "#d9e3f3"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
