import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock3, BadgeCheck, Building2 } from "lucide-react";
import { CustomSelect } from "./components/CustomSelect";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useUnits } from "./hooks/useUnits";
import type { OwnerCategory } from "./hooks/useUnits";

const NAVY = "#003883";

const SQ_MONTHS = [
  "Janar","Shkurt","Mars","Prill","Maj","Qershor",
  "Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor",
];
const SQ_MONTHS_SHORT = ["Jan","Shk","Mar","Pri","Maj","Qer","Kor","Gus","Sht","Tet","Nën","Dhj"];
const FILTER_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];
const CHART_YEARS  = [2025, 2026, 2027, 2028, 2029, 2030];

function todayAlbanian() {
  const d = new Date();
  return `${d.getDate()} ${SQ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatEur(n: number) {
  return `€${n.toLocaleString("de-DE")}`;
}

function useCountUp(end: number, active: boolean, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let t0: number | null = null;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setVal(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [end, active, duration]);
  return val;
}

function useCountUpRevenue(end: number, active: boolean) {
  return useCountUp(end, active, 1600);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] as const },
});

// Period badge pill
function PeriodBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px]"
      style={{
        background: "rgba(0,56,131,0.08)",
        color: NAVY,
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </span>
  );
}

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
        {formatEur(d.revenue)}
      </p>
    </div>
  );
}

interface KpiDef {
  key: string;
  label: string;
  value: number;
  total: number;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>;
  badge?: string | null;
}

function KpiCard({ kpi, delay, active }: { kpi: KpiDef; delay: number; active: boolean }) {
  const animated = useCountUp(kpi.value, active);
  const pct = kpi.total > 0 ? Math.round((kpi.value / kpi.total) * 100) : 0;

  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(0,0,0,0.09)" }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 rounded-[18px] border border-[#e8e8ec] bg-white p-5"
      style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#f4f4f5]">
          <kpi.icon size={16} style={{ color: NAVY }} strokeWidth={1.8} />
        </div>
        <span className="text-[12px] text-black/30" style={{ fontWeight: 500 }}>
          {pct}%
        </span>
      </div>

      <p
        className="text-[38px] leading-none tracking-[-2px]"
        style={{ fontWeight: 700, color: NAVY }}
      >
        {animated}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <p className="text-[12.5px] text-black/45" style={{ fontWeight: 500 }}>
          {kpi.label}
        </p>
        {kpi.badge && <PeriodBadge label={kpi.badge} />}
      </div>

      <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-black/[0.05]">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: active ? `${pct}%` : "0%" }}
          transition={{ duration: 1, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ backgroundColor: NAVY, opacity: 0.15 }}
        />
      </div>
    </motion.div>
  );
}

function SecondaryPartyCard({
  category,
  delay,
  active,
}: {
  category: OwnerCategory;
  delay: number;
  active: boolean;
}) {
  const { units } = useUnits();
  const catUnits = units.filter((u) => u.owner_category === category);
  const sold = catUnits.filter((u) => u.status === "E shitur").length;
  const available = catUnits.filter((u) => u.status === "Në dispozicion").length;
  const total = catUnits.length;
  const soldPct = total > 0 ? Math.round((sold / total) * 100) : 0;
  const animatedSold = useCountUp(sold, active, 1000);

  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(0,0,0,0.09)" }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 rounded-[18px] border border-[#e8e8ec] bg-white p-6"
      style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
    >
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#f4f4f5]">
          <Building2 size={16} style={{ color: NAVY }} strokeWidth={1.8} />
        </div>
        {soldPct > 0 && (
          <span className="text-[12px] text-black/28" style={{ fontWeight: 500 }}>
            {soldPct}%
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="py-2 text-[13px] text-black/30" style={{ fontWeight: 400 }}>
          Asnjë njësi e caktuar
        </p>
      ) : (
        <>
          <p
            className="text-[38px] leading-none tracking-[-2px]"
            style={{ fontWeight: 700, color: NAVY }}
          >
            {animatedSold}
          </p>
          <p className="mt-1.5 text-[12.5px] text-black/45" style={{ fontWeight: 500 }}>
            Njësi të shitura
          </p>
          <p className="mt-0.5 text-[12px] text-black/28">
            {total} gjithsej njësi
          </p>

          <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-black/[0.05]">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: active ? `${soldPct}%` : "0%" }}
              transition={{ duration: 1, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ backgroundColor: NAVY, opacity: 0.15 }}
            />
          </div>

          <div className="mt-4 flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-[6px] w-[6px] rounded-full bg-[#b14b4b]" />
              <span className="text-[12px] text-black/40">E shitur</span>
              <span className="text-[12px] text-black/70" style={{ fontWeight: 600 }}>{sold}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-[6px] w-[6px] rounded-full bg-[#3c7a57]" />
              <span className="text-[12px] text-black/40">Në dispozicion</span>
              <span className="text-[12px] text-black/70" style={{ fontWeight: 600 }}>{available}</span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function OverviewPage() {
  const { units, loading } = useUnits();
  const [started, setStarted] = useState(false);

  // Period filter state
  const [filterYear, setFilterYear] = useState<number | "all">("all");
  const [filterMonth, setFilterMonth] = useState<number | "all">("all"); // 0-indexed

  // Chart year — syncs with filterYear when a specific year is selected
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  useEffect(() => {
    if (filterYear !== "all") setChartYear(filterYear);
  }, [filterYear]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setStarted(true), 80);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // All Investitor units
  const inv = useMemo(
    () => units.filter((u) => u.owner_category === "Investitor"),
    [units]
  );

  // Always-unfiltered counts (for progress bar, available, reserved, total KPIs)
  const soldAll     = inv.filter((u) => u.status === "E shitur").length;
  const available   = inv.filter((u) => u.status === "Në dispozicion").length;
  const reserved    = inv.filter((u) => u.status === "E rezervuar").length;
  const total       = inv.length;
  const soldPct     = total > 0 ? (soldAll / total) * 100 : 0;
  const reservedPct = total > 0 ? (reserved / total) * 100 : 0;
  const availablePct = total > 0 ? (available / total) * 100 : 0;

  // Period-filtered sold units (for hero revenue + sold KPI)
  const filteredSoldUnits = useMemo(() => {
    return inv.filter((u) => {
      if (u.status !== "E shitur") return false;
      if (filterYear === "all") return true;
      if (!u.sale_date) return false;
      const sd = new Date(u.sale_date);
      if (sd.getFullYear() !== filterYear) return false;
      if (filterMonth !== "all" && sd.getMonth() !== filterMonth) return false;
      return true;
    });
  }, [inv, filterYear, filterMonth]);

  const soldFiltered   = filteredSoldUnits.length;
  const totalRevenue   = filteredSoldUnits.reduce((s, u) => s + u.price, 0);
  const completionPct  = total > 0 ? Math.round((soldFiltered / total) * 100) : 0;
  const animatedRevenue = useCountUpRevenue(totalRevenue, started);

  // Period label for badges
  const periodLabel: string | null =
    filterYear === "all"
      ? null
      : filterMonth === "all"
      ? `${filterYear}`
      : `${SQ_MONTHS[filterMonth as number]} ${filterYear}`;

  const kpis: KpiDef[] = [
    { key: "sold",      label: "Njësi të shitura",    value: soldFiltered, total, icon: BadgeCheck,   badge: periodLabel },
    { key: "available", label: "Njësi në dispozicion", value: available,    total, icon: CheckCircle2, badge: null },
    { key: "reserved",  label: "Njësi të rezervuara",  value: reserved,     total, icon: Clock3,       badge: null },
    { key: "total",     label: "Gjithsej njësi",        value: total,        total, icon: Building2,    badge: null },
  ];

  // Monthly chart data
  const chartData = useMemo<ChartEntry[]>(() => {
    const months: ChartEntry[] = SQ_MONTHS.map((name, i) => ({
      month: SQ_MONTHS_SHORT[i],
      label: `${name} ${chartYear}`,
      units: 0,
      revenue: 0,
    }));
    inv
      .filter((u) => u.status === "E shitur" && u.sale_date)
      .forEach((u) => {
        const sd = new Date(u.sale_date!);
        if (sd.getFullYear() === chartYear) {
          months[sd.getMonth()].units += 1;
          months[sd.getMonth()].revenue += u.price;
        }
      });
    return months;
  }, [inv, chartYear]);

  const hasChartData = inv.some((u) => u.status === "E shitur" && u.sale_date);

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: "#f8f8fa" }}>
      <div className="mx-auto max-w-[1100px] px-10 py-10">

        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <motion.h1
              {...fadeUp(0)}
              className="text-[26px] tracking-wide"
              style={{ fontWeight: 700, color: "#003883" }}
            >
              UF Partners Residence
            </motion.h1>
            <motion.p {...fadeUp(0.06)} className="mt-0.5 text-[13px]" style={{ color: "#003883", opacity: 0.20 }}>
              Rr. Agron Selenica, Gjilan
            </motion.p>
          </div>

          <motion.span {...fadeUp(0.08)} className="mt-1 text-[13px] text-black/28">
            {todayAlbanian()}
          </motion.span>
        </div>

        {/* Period filter — right-aligned above hero card */}
        <motion.div {...fadeUp(0.08)} className="mb-3 flex justify-end gap-2">
          <CustomSelect
            size="sm"
            className="min-w-[148px]"
            options={["Të gjitha vitet", ...FILTER_YEARS.map(String)]}
            value={filterYear === "all" ? "Të gjitha vitet" : String(filterYear)}
            onChange={(v) => {
              setFilterYear(v === "Të gjitha vitet" ? "all" : Number(v));
              setFilterMonth("all");
            }}
          />
          {filterYear !== "all" && (
            <CustomSelect
              size="sm"
              className="min-w-[148px]"
              options={SQ_MONTHS}
              value={filterMonth === "all" ? "" : SQ_MONTHS[filterMonth as number]}
              placeholder="Të gjitha muajt"
              onChange={(v) => setFilterMonth(v === "" ? "all" : SQ_MONTHS.indexOf(v))}
            />
          )}
        </motion.div>

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex items-end justify-between rounded-[24px] border border-[#E8E8EC] bg-white px-8 py-7"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.06)" }}
        >
          {/* Left: label tightly above revenue */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <p
                className="text-[11px] uppercase tracking-[0.14em] text-black/35"
                style={{ fontWeight: 600 }}
              >
                Të ardhura totale
              </p>
              {periodLabel && <PeriodBadge label={periodLabel} />}
            </div>
            <p
              className="text-[52px] leading-none tracking-[-2px]"
              style={{ color: NAVY, fontWeight: 700 }}
            >
              {formatEur(animatedRevenue)}
            </p>
          </div>

          {/* Right: completion stats */}
          <div className="flex flex-col items-end gap-1 text-right">
            <p className="text-[13px] text-black/50" style={{ fontWeight: 400 }}>
              Bazuar në {soldFiltered} njësi të shitura
            </p>
            <p
              className="text-[38px] leading-none tracking-[-1.5px]"
              style={{ color: NAVY, fontWeight: 700 }}
            >
              {completionPct}%
            </p>
            <p className="text-[12px] text-black/40">
              e projektit e shitur
            </p>
          </div>
        </motion.div>

        {/* KPI cards */}
        <div className="mb-8 flex gap-4">
          {kpis.map((k, i) => (
            <KpiCard key={k.key} kpi={k} delay={0.1 + i * 0.07} active={started} />
          ))}
        </div>

        {/* Progress bar — always unfiltered */}
        <motion.div
          {...fadeUp(0.38)}
          className="mb-8 rounded-[18px] border border-[#e8e8ec] bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
        >
          <p className="mb-4 text-[13px] text-black/55" style={{ fontWeight: 600 }}>
            Ndarja e stokut
          </p>

          <div className="flex h-3 overflow-hidden rounded-full bg-[#f0f0f2]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: started ? `${soldPct}%` : "0%" }}
              transition={{ duration: 0.95, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{ backgroundColor: "#b14b4b" }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: started ? `${reservedPct}%` : "0%" }}
              transition={{ duration: 0.95, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
              style={{ backgroundColor: "#b0892f" }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: started ? `${availablePct}%` : "0%" }}
              transition={{ duration: 0.95, delay: 0.62, ease: [0.22, 1, 0.36, 1] }}
              style={{ backgroundColor: "#3c7a57" }}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-6">
            {[
              { label: "E shitur",       count: soldAll,   pct: soldPct,      color: "#b14b4b" },
              { label: "E rezervuar",    count: reserved,  pct: reservedPct,  color: "#b0892f" },
              { label: "Në dispozicion", count: available, pct: availablePct, color: "#3c7a57" },
            ].map((seg) => (
              <div key={seg.label} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-[13px] text-black/45">{seg.label}</span>
                <span className="text-[13px]" style={{ fontWeight: 700, color: seg.color }}>
                  {seg.count}
                </span>
                <span className="text-[12px] text-black/25">
                  {Math.round(seg.pct)}%
                </span>
              </div>
            ))}
            <span className="ml-auto text-[12px] text-black/25">
              {total} njësi gjithsej
            </span>
          </div>
        </motion.div>

        {/* Monthly sales chart */}
        {hasChartData && (
          <motion.div
            {...fadeUp(0.44)}
            className="mb-8 rounded-[18px] border border-[#e8e8ec] bg-white p-6"
            style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-[13px] text-black/55" style={{ fontWeight: 600 }}>
                  Shitjet mujore
                </p>
                <p className="mt-0.5 text-[12px] text-black/35">
                  Njësi të shitura sipas muajit
                </p>
              </div>
              <CustomSelect
                size="sm"
                className="min-w-[90px]"
                options={CHART_YEARS.map(String)}
                value={String(chartYear)}
                onChange={(v) => setChartYear(Number(v))}
              />
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={22} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "rgba(0,0,0,0.35)", fontWeight: 500 }}
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
                <Bar dataKey="units" radius={[5, 5, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.units > 0 ? NAVY : "rgba(0,56,131,0.08)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Secondary parties — always unfiltered */}
        <motion.p
          {...fadeUp(0.5)}
          className="mb-3 text-[11px] uppercase tracking-[0.1em] text-black/28"
          style={{ fontWeight: 600 }}
        >
          Struktura e pronësisë
        </motion.p>
        <div className="flex gap-4">
          <SecondaryPartyCard category="Pronarët e tokës"   delay={0.54} active={started} />
          <SecondaryPartyCard category="Kompani ndërtimore" delay={0.60} active={started} />
        </div>

      </div>
    </div>
  );
}
