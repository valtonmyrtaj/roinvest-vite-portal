import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useUnits } from "./hooks/useUnits";

const NAVY   = "#003883";
const SQ_MONTHS       = ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"];
const SQ_MONTHS_SHORT = ["Jan","Shk","Mar","Pri","Maj","Qer","Kor","Gus","Sht","Tet","Nën","Dhj"];

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return `€${n.toLocaleString("de-DE")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")} ${SQ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] as const },
});

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

// ─── KpiCard ─────────────────────────────────────────────────────────────────

interface KpiDef {
  key: string;
  label: string;
  value: number;
  sub?: string;
  color: string;
  delta?: number | null;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>;
  format?: (n: number) => string;
}

function KpiCard({ kpi, delay, active }: { kpi: KpiDef; delay: number; active: boolean }) {
  const animated = useCountUp(kpi.value, active);
  const display  = kpi.format ? kpi.format(animated) : String(animated);

  const iconBg =
    kpi.color === "#b14b4b" ? "#fbeeee"
    : kpi.color === "#b0892f" ? "#fff8e8"
    : kpi.color === "#3c7a57" ? "#edf7f1"
    : "#eaf0fa";

  const deltaPos = kpi.delta !== null && kpi.delta !== undefined && kpi.delta >= 0;

  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(0,0,0,0.09)" }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 rounded-[18px] border border-[#e8e8ec] bg-white p-5"
      style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[11px]"
          style={{ background: iconBg }}
        >
          <kpi.icon size={16} style={{ color: kpi.color }} strokeWidth={1.8} />
        </div>
      </div>
      <p className="text-[36px] leading-none tracking-[-2px]" style={{ fontWeight: 700, color: kpi.color }}>
        {display}
      </p>
      <p className="mt-1.5 text-[12.5px] text-black/45" style={{ fontWeight: 500 }}>
        {kpi.label}
      </p>
      {kpi.sub && (
        <p className="mt-0.5 text-[11.5px] text-black/28">{kpi.sub}</p>
      )}
      {kpi.delta !== null && kpi.delta !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          {deltaPos
            ? <TrendingUp size={11} style={{ color: "#3c7a57" }} strokeWidth={2} />
            : <TrendingDown size={11} style={{ color: "#b14b4b" }} strokeWidth={2} />
          }
          <span
            className="text-[11.5px]"
            style={{ color: deltaPos ? "#3c7a57" : "#b14b4b", fontWeight: 600 }}
          >
            {deltaPos ? "+" : ""}{kpi.delta.toFixed(1)}%
          </span>
          <span className="text-[11px] text-black/28">vs muaji i kaluar</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Revenue Chart Tooltip ────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-[10px] border border-[#e8e8ec] bg-white px-3 py-2"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}
    >
      <p className="text-[11px] text-black/40">{label}</p>
      <p className="text-[13px]" style={{ color: NAVY, fontWeight: 700 }}>
        {fmtEur(payload[0].value)}
      </p>
    </div>
  );
}

// ─── Typology Bars ────────────────────────────────────────────────────────────

interface TypologyUnitRow {
  id: string;
  unit_id: string;
  block: string;
  level: string;
  size: number;
  price: number;
}

interface TypologyRow {
  label: string;
  revenue: number;
  soldCount: number;
  units: TypologyUnitRow[];
}

function TypologyBars({ rows }: { rows: TypologyRow[] }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const maxRevenue = rows.reduce((m, r) => Math.max(m, r.revenue), 0);

  const toggleRow = (label: string) => {
    setOpenRows((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div ref={ref} className="flex flex-col gap-3.5">
      {rows.map((row, i) => {
        const pct = maxRevenue > 0 ? (row.revenue / maxRevenue) * 100 : 0;
        const isOpen = !!openRows[row.label];
        const isZeroRow = row.revenue === 0 && row.soldCount === 0;
        const rowClass = isZeroRow
          ? "rounded-[12px] border border-[#f4f4f7] bg-[#fdfdfe] px-3.5 py-3"
          : "rounded-[12px] border border-[#ececf1] bg-[#fcfcfd] px-3.5 py-3";
        const labelClass = isZeroRow ? "text-[12.5px] text-black/40" : "text-[12.5px] text-black/60";
        const summaryClass = isZeroRow ? "ml-2 text-right text-[12.5px] text-black/42" : "ml-2 text-right text-[12.5px] text-black/60";
        return (
          <div key={row.label} className={rowClass}>
            <button
              type="button"
              onClick={() => toggleRow(row.label)}
              className="grid w-full grid-cols-[120px_1fr_auto_18px] items-center gap-3.5 text-left"
            >
              <span className={labelClass} style={{ fontWeight: 500 }}>
                {row.label}
              </span>
              <div className="h-[8px] overflow-hidden rounded-full bg-black/[0.05]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: inView ? `${pct}%` : "0%",
                    backgroundColor: NAVY,
                    opacity: isZeroRow ? 0.28 : 0.75,
                    transition: `width 1000ms cubic-bezier(0.22,1,0.36,1) ${i * 70}ms`,
                  }}
                />
              </div>
              <span className={summaryClass} style={{ fontWeight: isZeroRow ? 500 : 600 }}>
                {row.soldCount} njësi · {fmtEur(row.revenue)}
              </span>
              <ChevronDown
                size={13}
                className="translate-y-[1px] text-black/28 transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            <div className={isOpen ? "mt-3 border-t border-[#ececf0] pt-2.5" : "hidden"}>
              {row.units.length === 0 ? (
                <p className="text-[11.5px] text-black/35">Asnjë njësi e shitur për këtë tipologji.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {row.units.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-[9px] border border-[#ededf1] bg-white px-2.5 py-2"
                    >
                      <p className="text-[11.5px] text-black/55">
                        {u.block} · {u.level} · {u.size} m²
                      </p>
                      <p className="text-[11.5px] text-black/68" style={{ fontWeight: 600 }}>
                        {fmtEur(u.price)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Reserved Card Row ───────────────────────────────────────────────────────

function ReservedRow({ unit, index }: { unit: any; index: number }) {
  const expires = fmtDate(unit.reservation_expires_at);
  const expiryTs = unit.reservation_expires_at ? new Date(unit.reservation_expires_at).getTime() : NaN;
  const msUntilExpiry = Number.isNaN(expiryTs) ? null : expiryTs - Date.now();
  const isExpiringSoon = msUntilExpiry !== null && msUntilExpiry > 0 && msUntilExpiry < 7 * 86_400_000;

  return (
    <motion.div
      {...fadeUp(0.08 + index * 0.04)}
      className="flex items-center justify-between rounded-[13px] border border-[#f0f0f2] bg-white px-4 py-3 transition hover:border-[#e0e0e8]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#fff8e8]">
          <Clock3 size={14} style={{ color: "#b0892f" }} strokeWidth={2} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-black/80">{unit.unit_id}</p>
          <p className="mt-0.5 text-[11.5px] text-black/40">
            {unit.block} · {unit.level} · {unit.size} m²
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6 text-right">
        <div>
          <p className="text-[12.5px] font-semibold text-black/70">{fmtEur(unit.price)}</p>
        </div>
        <div>
          <p
            className="text-[11.5px]"
            style={{
              color: isExpiringSoon ? "#b14b4b" : "rgba(0,0,0,0.35)",
              fontWeight: isExpiringSoon ? 600 : 400,
            }}
          >
            {isExpiringSoon && <Clock3 size={11} style={{ color: "#b14b4b" }} strokeWidth={2} className="mr-1 inline-block align-[-1px]" />}
            {expires}
          </p>
          <p className="text-[10.5px] text-black/25">skadon</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const { units, loading } = useUnits();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setStarted(true), 80);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Filter to Investitor only
  const inv       = units.filter((u) => u.owner_category === "Investitor");
  const soldUnits = inv.filter((u) => u.status === "E shitur");
  const reserved  = inv.filter((u) => u.status === "E rezervuar");
  const available = inv.filter((u) => u.status === "Në dispozicion");

  const totalRevenue = soldUnits.reduce((s, u) => s + u.price, 0);

  // Current & previous month helpers
  const now       = new Date();
  const curYear   = now.getFullYear();
  const curMonth  = now.getMonth();
  const prevYear  = curMonth === 0 ? curYear - 1 : curYear;
  const prevMonth = curMonth === 0 ? 11 : curMonth - 1;

  // Hero label: e.g. "TË ARDHURA — PRILL 2026"
  const heroLabel = `TË ARDHURA — ${SQ_MONTHS[curMonth].toUpperCase()} ${curYear}`;

  const inMonth = (isoDate: string | null | undefined, y: number, m: number) => {
    if (!isoDate) return false;
    const d = new Date(isoDate);
    return d.getFullYear() === y && d.getMonth() === m;
  };

  const soldThisMonth      = soldUnits.filter((u) => inMonth(u.sale_date, curYear, curMonth));
  const soldLastMonthUnits = soldUnits.filter((u) => inMonth(u.sale_date, prevYear, prevMonth));

  const soldCountThisMonth = soldThisMonth.length;
  const soldCountLastMonth = soldLastMonthUnits.length;

  const revenueThisMonth = soldThisMonth.reduce((s, u) => s + u.price, 0);
  const revenueLastMonth = soldLastMonthUnits.reduce((s, u) => s + u.price, 0);

  const momDelta    = revenueLastMonth > 0
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
    : null;
  const momPositive = momDelta !== null && momDelta >= 0;

  // Units sold delta (for KPI card)
  const unitsDelta = soldCountLastMonth > 0
    ? ((soldCountThisMonth - soldCountLastMonth) / soldCountLastMonth) * 100
    : null;

  // Animated hero number — current month revenue
  const animatedMonthRevenue = useCountUp(revenueThisMonth, started, 1600);

  // Monthly chart data — current year, group by sale_date month
  const chartData = SQ_MONTHS_SHORT.map((label, idx) => ({
    label,
    revenue: soldUnits
      .filter((u) => inMonth(u.sale_date, curYear, idx))
      .reduce((s, u) => s + u.price, 0),
  }));

  // Typology breakdown (derived display typology)
  // If level is Penthouse, treat it as its own typology; otherwise use unit type.
  const getDisplayTypology = (u: (typeof inv)[number]) =>
    u.level === "Penthouse" ? "Penthouse" : u.type;

  const typologyOrder = ["Banesë", "Lokal", "Garazhë", "Penthouse"] as const;
  const presentTypologies = new Set(inv.map(getDisplayTypology));
  const typologyRevenue = new Map<string, number>();

  soldUnits.forEach((u) => {
    const key = getDisplayTypology(u);
    typologyRevenue.set(key, (typologyRevenue.get(key) ?? 0) + u.price);
  });

  const typologyRows = typologyOrder
    .map((label) => {
      const unitsInTypology = soldUnits
        .filter((u) => getDisplayTypology(u) === label)
        .sort((a, b) => b.price - a.price);

      return {
        label,
        revenue: typologyRevenue.get(label) ?? 0,
        soldCount: unitsInTypology.length,
        units: unitsInTypology,
      };
    })
    .filter((r) => presentTypologies.has(r.label));

  const kpis: KpiDef[] = [
    {
      key:   "sold_month",
      label: "Njësi të shitura këtë muaj",
      value: soldCountThisMonth,
      color: "#b14b4b",
      icon:  BadgeCheck,
      delta: unitsDelta,
    },
    {
      key:   "reserved",
      label: "Njësi të rezervuara",
      value: reserved.length,
      color: "#b0892f",
      icon:  Clock3,
    },
    {
      key:   "available",
      label: "Njësi në dispozicion",
      value: available.length,
      color: "#3c7a57",
      icon:  CheckCircle2,
    },
  ];

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: "#f8f8fa" }}>
      <div className="mx-auto max-w-[1100px] px-10 py-10">

        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <motion.h1
              {...fadeUp(0)}
              className="text-[26px] tracking-wide"
              style={{ fontWeight: 700, color: NAVY }}
            >
              Shitjet
            </motion.h1>
            <motion.p {...fadeUp(0.06)} className="mt-0.5 text-[13px]" style={{ color: NAVY, opacity: 0.65 }}>
              Performanca e shitjeve në kohë reale
            </motion.p>
          </div>
        </div>

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex items-end justify-between rounded-[24px] border border-[#E8E8EC] bg-white px-8 py-7"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.06)" }}
        >
          {/* Left — current month revenue */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-black/35" style={{ fontWeight: 600 }}>
              {heroLabel}
            </p>
            <p className="text-[52px] leading-none tracking-[-2px]" style={{ color: NAVY, fontWeight: 700 }}>
              {fmtEur(animatedMonthRevenue)}
            </p>
            {/* Secondary line: total all-time + MoM delta */}
            <div className="flex items-center gap-3">
              <p className="text-[12px] text-black/35">{fmtEur(totalRevenue)} gjithsej</p>
              {momDelta !== null && (
                <div className="flex items-center gap-1">
                  {momPositive
                    ? <TrendingUp size={11} style={{ color: "#3c7a57" }} strokeWidth={2} />
                    : <TrendingDown size={11} style={{ color: "#b14b4b" }} strokeWidth={2} />
                  }
                  <span
                    className="text-[12px]"
                    style={{ color: momPositive ? "#3c7a57" : "#b14b4b", fontWeight: 600 }}
                  >
                    {momPositive ? "+" : ""}{momDelta.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right — units sold this month */}
          <div className="flex flex-col items-end gap-1 text-right">
            <p className="text-[11px] uppercase tracking-[0.14em] text-black/35" style={{ fontWeight: 600 }}>
              Njësi të shitura
            </p>
            <p className="text-[38px] leading-none tracking-[-1.5px]" style={{ color: NAVY, fontWeight: 700 }}>
              {soldCountThisMonth}
            </p>
            <p className="text-[12px] text-black/40">këtë muaj</p>
          </div>
        </motion.div>

        {/* KPI row — 3 cards */}
        <div className="mb-8 flex gap-4">
          {kpis.map((k, i) => (
            <KpiCard key={k.key} kpi={k} delay={0.1 + i * 0.07} active={started} />
          ))}
        </div>

        {/* Monthly Revenue Chart */}
        <motion.div
          {...fadeUp(0.3)}
          className="mb-8 rounded-[18px] border border-[#e8e8ec] bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
        >
          <div className="mb-5">
            <p className="text-[13px] text-black/55" style={{ fontWeight: 600 }}>Të ardhurat mujore</p>
            <p className="mt-0.5 text-[12px] text-black/30">
              Të ardhura nga shitjet sipas muajit — {curYear}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={22} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "rgba(0,0,0,0.35)", fontWeight: 500 }}
              />
              <YAxis hide />
              <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(0,56,131,0.04)", radius: 6 }} />
              <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                {chartData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={idx === curMonth ? NAVY : "rgba(0,56,131,0.18)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Performance by Typology */}
        <motion.div
          {...fadeUp(0.38)}
          className="mb-8 rounded-[18px] border border-[#e8e8ec] bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
        >
          <div className="mb-5">
            <p className="text-[13px] text-black/55" style={{ fontWeight: 600 }}>Performanca sipas tipologjisë</p>
            <p className="mt-0.5 text-[12px] text-black/30">Të ardhura sipas kategorisë së njësive</p>
          </div>
          {typologyRows.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-black/30">Asnjë njësi e regjistruar</p>
          ) : (
            <TypologyBars rows={typologyRows} />
          )}
        </motion.div>

        {/* Reserved Units */}
        <motion.div {...fadeUp(0.44)} className="mb-2">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[13px] text-black/55" style={{ fontWeight: 600 }}>Njësi të rezervuara</p>
              <p className="mt-0.5 text-[12px] text-black/30">Lista e rezervimeve aktive — Investitor</p>
            </div>
            <div
              className="flex items-center gap-2 rounded-[12px] px-3 py-1.5"
              style={{ background: "#fff8e8" }}
            >
              <Clock3 size={13} style={{ color: "#b0892f" }} strokeWidth={2} />
              <span className="text-[12px]" style={{ color: "#b0892f", fontWeight: 600 }}>
                {reserved.length} aktive
              </span>
            </div>
          </div>

          {reserved.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#e8e8ec] py-10 text-center">
              <Building2 size={24} className="mx-auto mb-2 text-black/15" />
              <p className="text-[13px] text-black/30">Asnjë njësi e rezervuar</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {reserved.map((u, i) => (
                <ReservedRow key={u.id} unit={u} index={i} />
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
