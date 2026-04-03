import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  TrendingUp,
  FileText,
  BarChart3,
  Building2,
  Megaphone,
  Users,
  Download,
  FileSpreadsheet,
  FileDown,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  Check,
  FolderOpen,
} from "lucide-react";
import { useDashboard } from "./context/DashboardContext";

function formatEuro(value: number) {
  return `€${value.toLocaleString("en-US")}`;
}

function formatCompactEuro(value: number) {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
  return `€${value}`;
}

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

function useCountUp(end: number, startAnimation: boolean, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!startAnimation) return;

    let frame = 0;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(end * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [end, startAnimation, duration]);

  return value;
}

function RevealSection({
  children,
  delay = 0,
  amount = 0.22,
}: {
  children: React.ReactNode;
  delay?: number;
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      className="text-[11.5px] tracking-[0.08em] text-gray-400"
      style={{ fontWeight: 600, textTransform: "uppercase" }}
    >
      {label}
    </p>
  );
}

function SummaryKPI({
  label,
  value,
  change,
  up,
  delay,
  isCurrency = false,
}: {
  label: string;
  value: number;
  change: string;
  up: boolean;
  delay: number;
  isCurrency?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const counted = useCountUp(value, inView, 1300);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white px-5 py-5"
    >
      <p className="text-[12px] tracking-wide text-gray-400" style={{ fontWeight: 500 }}>
        {label}
      </p>

      <p className="text-[24px] text-gray-900" style={{ fontWeight: 600, lineHeight: 1.1 }}>
        {isCurrency ? formatEuro(counted) : counted.toLocaleString("en-US")}
      </p>

      <div className="flex items-center gap-1.5">
        {up ? (
          <ArrowUpRight size={13} className="text-emerald-500" />
        ) : (
          <ArrowDownRight size={13} className="text-amber-500" />
        )}
        <span
          className="text-[12px]"
          style={{
            color: up ? "#10b981" : "#f59e0b",
            fontWeight: 500,
          }}
        >
          {change}
        </span>
        <span className="ml-1 text-[11px] text-gray-300">vs prev. period</span>
      </div>
    </motion.div>
  );
}

function StatusPill({
  text,
  tone,
}: {
  text: string;
  tone: "positive" | "neutral" | "watch";
}) {
  const styles =
    tone === "positive"
      ? { bg: "#ecfdf5", color: "#10b981" }
      : tone === "watch"
      ? { bg: "#fff7ed", color: "#f59e0b" }
      : { bg: "#f3f4f6", color: "#6b7280" };

  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px]"
      style={{ background: styles.bg, color: styles.color, fontWeight: 600 }}
    >
      {text}
    </span>
  );
}

function ExportModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: {
    title: string;
    desc: string;
    format: string;
  } | null;
}) {
  return (
    <AnimatePresence>
      {open && item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/25"
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)]"
          >
            <div className="flex items-start justify-between border-b border-gray-50 px-6 py-5">
              <div>
                <p className="text-[12px] uppercase tracking-[0.08em] text-gray-400" style={{ fontWeight: 600 }}>
                  Export Action
                </p>
                <h3 className="mt-1 text-[20px] text-gray-900" style={{ fontWeight: 600 }}>
                  {item.title}
                </h3>
                <p className="mt-1 text-[13px] text-gray-400">{item.desc}</p>
              </div>

              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 transition-colors hover:bg-gray-100"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="flex flex-col gap-5 px-6 py-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-100 bg-[#fbfcfe] p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400" style={{ fontWeight: 600 }}>
                    Format
                  </p>
                  <p className="mt-2 text-[16px] text-gray-900" style={{ fontWeight: 600 }}>
                    {item.format}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-[#fbfcfe] p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400" style={{ fontWeight: 600 }}>
                    Scope
                  </p>
                  <p className="mt-2 text-[16px] text-gray-900" style={{ fontWeight: 600 }}>
                    Live OS
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-[#fbfcfe] p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400" style={{ fontWeight: 600 }}>
                    Status
                  </p>
                  <p className="mt-2 text-[16px] text-emerald-600" style={{ fontWeight: 600 }}>
                    Ready
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-[12px] text-gray-500" style={{ fontWeight: 500 }}>
                  Included in this export
                </p>

                <div className="mt-3 flex flex-col gap-2.5">
                  {[
                    "Live executive KPI summary",
                    "Period comparisons and key highlights",
                    "Strategic commentary and recommendations",
                  ].map((point) => (
                    <div key={point} className="flex items-center gap-2.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50">
                        <Check size={12} className="text-emerald-600" />
                      </div>
                      <span className="text-[13px] text-gray-600">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-600 transition-colors hover:bg-gray-50"
                  style={{ fontSize: "13px", fontWeight: 500 }}
                >
                  Cancel
                </button>

                <div className="flex items-center gap-3">
                  <button
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50"
                    style={{ fontSize: "13px", fontWeight: 500 }}
                  >
                    <FolderOpen size={14} />
                    Save to Folder
                  </button>

                  <button
                    className="flex items-center gap-2 rounded-xl bg-[#003883] px-4 py-2.5 text-white transition-opacity hover:opacity-95"
                    style={{ fontSize: "13px", fontWeight: 600 }}
                  >
                    <Download size={14} />
                    Download Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function ExecutiveReports() {
  const { data } = useDashboard();
  const [selectedExport, setSelectedExport] = useState<{
    title: string;
    desc: string;
    format: string;
  } | null>(null);

  const contractedRevenue = data.sales.revenue;
  const sellThroughRate =
    data.units.total > 0 ? Math.round((data.units.sold / data.units.total) * 100) : 0;
  const reservedPipeline = data.units.reserved;
  const trafficGrowthBase =
    data.marketing.leadsGenerated > 0
      ? pctChange(data.marketing.reach, data.marketing.leadsGenerated)
      : 0;

  const totalLeadsDelta = pctChange(data.sales.leads, data.crm.activeClients || 1);
  const totalVisitsDelta = pctChange(data.sales.showings, data.sales.calls || 1);
  const reservedUnitsDelta = pctChange(data.units.reserved, data.units.available || 1);
  const soldUnitsDelta = pctChange(data.units.sold, data.units.reserved || 1);
  const availableUnitsDelta = pctChange(data.units.available, data.units.total || 1);
  const totalSalesValueDelta = pctChange(
    data.sales.revenue,
    data.targets.monthlyRevenueTarget || 1
  );
  const marketingSpendDelta = pctChange(
    data.marketing.spend,
    data.targets.monthlyRevenueTarget || 1
  );
  const trafficViewsDelta = pctChange(
    data.marketing.reach,
    data.marketing.clicks || 1
  );

  const summaryKpis = [
    {
      label: "Total Leads",
      value: data.sales.leads,
      change: `${totalLeadsDelta >= 0 ? "+" : ""}${totalLeadsDelta.toFixed(1)}%`,
      up: totalLeadsDelta >= 0,
      isCurrency: false,
    },
    {
      label: "Total Visits",
      value: data.sales.showings,
      change: `${totalVisitsDelta >= 0 ? "+" : ""}${totalVisitsDelta.toFixed(1)}%`,
      up: totalVisitsDelta >= 0,
      isCurrency: false,
    },
    {
      label: "Reserved Units",
      value: data.units.reserved,
      change: `${reservedUnitsDelta >= 0 ? "+" : ""}${reservedUnitsDelta.toFixed(1)}%`,
      up: reservedUnitsDelta >= 0,
      isCurrency: false,
    },
    {
      label: "Sold Units",
      value: data.units.sold,
      change: `${soldUnitsDelta >= 0 ? "+" : ""}${soldUnitsDelta.toFixed(1)}%`,
      up: soldUnitsDelta >= 0,
      isCurrency: false,
    },
    {
      label: "Available Units",
      value: data.units.available,
      change: `${availableUnitsDelta >= 0 ? "+" : ""}${availableUnitsDelta.toFixed(1)}%`,
      up: availableUnitsDelta >= 0,
      isCurrency: false,
    },
    {
      label: "Total Sales Value",
      value: data.sales.revenue,
      change: `${totalSalesValueDelta >= 0 ? "+" : ""}${totalSalesValueDelta.toFixed(1)}%`,
      up: totalSalesValueDelta >= 0,
      isCurrency: true,
    },
    {
      label: "Marketing Spend",
      value: data.marketing.spend,
      change: `${marketingSpendDelta >= 0 ? "+" : ""}${marketingSpendDelta.toFixed(1)}%`,
      up: marketingSpendDelta >= 0,
      isCurrency: true,
    },
    {
      label: "Traffic / Views",
      value: data.marketing.reach,
      change: `${trafficViewsDelta >= 0 ? "+" : ""}${trafficViewsDelta.toFixed(1)}%`,
      up: trafficViewsDelta >= 0,
      isCurrency: false,
    },
  ];

  const reportTypes = [
    { title: "Executive Summary", desc: "Full period overview with KPIs, trends and highlights", icon: FileText, color: "#003883" },
    { title: "Sales Report", desc: "Unit sales breakdown, revenue tracking and pipeline status", icon: BarChart3, color: "#0ea5e9" },
    { title: "Units Availability Snapshot", desc: "Live inventory status across all floors and types", icon: Building2, color: "#6366f1" },
    { title: "Marketing Summary", desc: "Campaign performance, channel ROI and lead sources", icon: Megaphone, color: "#f59e0b" },
    { title: "CRM Activity Summary", desc: "Team activity, follow-ups and conversion tracking", icon: Users, color: "#10b981" },
  ];

  const exportsList = [
    { title: "Export PDF", desc: "Full formatted executive report", icon: FileDown, format: "PDF" },
    { title: "Export Excel", desc: "Raw data with all metrics and tables", icon: FileSpreadsheet, format: "XLSX" },
    { title: "Investor Summary", desc: "One-page investor brief with key figures", icon: FileText, format: "PDF" },
    { title: "Units Availability Sheet", desc: "Current inventory with pricing and status", icon: Building2, format: "XLSX" },
    { title: "Sales Summary", desc: "Period sales data with breakdown", icon: BarChart3, format: "PDF" },
  ];

  const insights = [
    {
      text: `Current sales revenue stands at ${formatCompactEuro(data.sales.revenue)}, with ${data.units.sold} units sold and ${data.units.reserved} still in reservation.`,
      type: "positive" as const,
    },
    {
      text: `${data.units.available} units remain available. The next cycle should focus on converting reserved stock and supporting lower-velocity inventory.`,
      type: "neutral" as const,
    },
    {
      text: `Marketing reach is ${data.marketing.reach.toLocaleString("en-US")} with ${data.marketing.leadsGenerated.toLocaleString("en-US")} generated leads.`,
      type: "positive" as const,
    },
    {
      text: `CRM follow-up volume is currently ${data.crm.followUps.toLocaleString("en-US")} with ${data.crm.activeClients.toLocaleString("en-US")} active clients in the pipeline.`,
      type: "neutral" as const,
    },
    {
      text: "Recommended next move: push reserved units toward close while strengthening campaigns for remaining available inventory.",
      type: "action" as const,
    },
  ];

  const strategicRows: {
    category: string;
    status: string;
    tone: "positive" | "neutral" | "watch";
    note: string;
  }[] = [
    {
      category: "Sales",
      status: totalSalesValueDelta >= 0 ? "Strong" : "Watch",
      tone: totalSalesValueDelta >= 0 ? "positive" : "watch",
      note: `Revenue is ${formatCompactEuro(data.sales.revenue)} against a target of ${formatCompactEuro(
        data.targets.monthlyRevenueTarget
      )}.`,
    },
    {
      category: "Marketing",
      status: trafficViewsDelta >= 0 ? "Efficient" : "Mixed",
      tone: trafficViewsDelta >= 0 ? "positive" : "watch",
      note: `Reach is ${data.marketing.reach.toLocaleString("en-US")} with ${data.marketing.clicks.toLocaleString(
        "en-US"
      )} clicks and ${data.marketing.leadsGenerated.toLocaleString("en-US")} generated leads.`,
    },
    {
      category: "CRM",
      status: "Stable",
      tone: "neutral",
      note: `Follow-ups total ${data.crm.followUps.toLocaleString("en-US")} with ${data.crm.meetings.toLocaleString(
        "en-US"
      )} meetings and ${data.crm.hotLeads.toLocaleString("en-US")} hot leads.`,
    },
    {
      category: "Inventory",
      status: availableUnitsDelta < 0 ? "Tightening" : "Mixed",
      tone: availableUnitsDelta < 0 ? "positive" : "watch",
      note: `${data.units.available} units remain available out of ${data.units.total}, while ${data.units.sold} are already sold.`,
    },
  ];

  const recommendations = [
    "Prioritise available inventory that is moving slower than the reserved/sold mix.",
    "Push reserved units toward close before the next reporting cycle.",
    "Keep marketing spend weighted toward the highest-performing reach sources.",
    "Prepare an investor-facing summary around revenue, sell-through and remaining stock.",
  ];

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#f8f9fb" }}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-8 py-8">
        <RevealSection>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <div className="border-b border-gray-50 px-7 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[22px] text-gray-900" style={{ fontWeight: 600 }}>
                    Executive Reports
                  </h1>
                  <p className="mt-1 text-[13.5px] text-gray-400">
                    Boardroom-ready summaries and export centre — Live OS snapshot
                  </p>
                </div>

                <StatusPill
                  text={totalSalesValueDelta >= 0 ? "Strong Quarter" : "Watch Quarter"}
                  tone={totalSalesValueDelta >= 0 ? "positive" : "watch"}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-5 px-7 py-6">
              {[
                { label: "Contracted Revenue", value: formatEuro(contractedRevenue) },
                { label: "Sell-Through Rate", value: `${sellThroughRate}%` },
                { label: "Reserved Pipeline", value: `${reservedPipeline} Units` },
                { label: "Traffic Growth", value: `${trafficGrowthBase >= 0 ? "+" : ""}${trafficGrowthBase.toFixed(1)}%` },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.42, delay: 0.08 + i * 0.06 }}
                  className="rounded-xl border border-gray-100 bg-[#fbfcfe] px-5 py-4"
                >
                  <p className="text-[11.5px] uppercase tracking-[0.06em] text-gray-400" style={{ fontWeight: 600 }}>
                    {item.label}
                  </p>
                  <p className="mt-2 text-[24px] text-gray-900" style={{ fontWeight: 600 }}>
                    {item.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection delay={0.03}>
          <section>
            <SectionLabel label="Executive Summary" />
            <div className="mt-4 grid grid-cols-4 gap-4">
              {summaryKpis.map((kpi, index) => (
                <SummaryKPI
                  key={kpi.label}
                  label={kpi.label}
                  value={kpi.value}
                  change={kpi.change}
                  up={kpi.up}
                  isCurrency={kpi.isCurrency}
                  delay={index * 0.04}
                />
              ))}
            </div>
          </section>
        </RevealSection>

        <RevealSection delay={0.05}>
          <section>
            <SectionLabel label="Key Highlights" />
            <div className="mt-4 grid grid-cols-4 gap-4">
              {[
                {
                  title: "Revenue Momentum",
                  text: `Current revenue is ${formatCompactEuro(data.sales.revenue)} with live performance now tied directly to the OS.`,
                },
                {
                  title: "Inventory Demand",
                  text: `${data.units.reserved} units are reserved and ${data.units.sold} units are sold, indicating continued absorption.`,
                },
                {
                  title: "Marketing Efficiency",
                  text: `${data.marketing.reach.toLocaleString("en-US")} reach generated ${data.marketing.leadsGenerated.toLocaleString(
                    "en-US"
                  )} leads from current campaign activity.`,
                },
                {
                  title: "Next Focus",
                  text: `The next cycle should prioritise conversion of ${data.units.reserved} reserved units and clearance of ${data.units.available} available units.`,
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: i * 0.05 }}
                  className="rounded-xl border border-gray-100 bg-white p-5"
                >
                  <p className="text-[13px] text-gray-800" style={{ fontWeight: 600 }}>
                    {item.title}
                  </p>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-gray-400">
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        </RevealSection>

        <RevealSection delay={0.06}>
          <div className="grid grid-cols-12 gap-6">
            <section className="col-span-5">
              <SectionLabel label="Performance Comparison" />
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
                <div className="grid grid-cols-4 border-b border-gray-50 px-5 py-3">
                  {["Metric", "Current", "Reference", "Delta"].map((h, i) => (
                    <span
                      key={h}
                      className={`text-[11px] uppercase tracking-[0.08em] text-gray-400 ${i > 0 ? "text-right" : ""}`}
                      style={{ fontWeight: 600 }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {[
                  {
                    label: "Revenue",
                    current: formatCompactEuro(data.sales.revenue),
                    previous: formatCompactEuro(data.targets.monthlyRevenueTarget),
                    delta: `${totalSalesValueDelta >= 0 ? "+" : ""}${totalSalesValueDelta.toFixed(1)}%`,
                    up: totalSalesValueDelta >= 0,
                  },
                  {
                    label: "Sold Units",
                    current: String(data.units.sold),
                    previous: String(data.units.reserved),
                    delta: `${soldUnitsDelta >= 0 ? "+" : ""}${soldUnitsDelta.toFixed(1)}%`,
                    up: soldUnitsDelta >= 0,
                  },
                  {
                    label: "Reserved Units",
                    current: String(data.units.reserved),
                    previous: String(data.units.available),
                    delta: `${reservedUnitsDelta >= 0 ? "+" : ""}${reservedUnitsDelta.toFixed(1)}%`,
                    up: reservedUnitsDelta >= 0,
                  },
                  {
                    label: "Marketing Spend",
                    current: formatCompactEuro(data.marketing.spend),
                    previous: formatCompactEuro(data.targets.monthlyRevenueTarget),
                    delta: `${marketingSpendDelta >= 0 ? "+" : ""}${marketingSpendDelta.toFixed(1)}%`,
                    up: marketingSpendDelta >= 0,
                  },
                ].map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.38, delay: i * 0.05 }}
                    className="grid grid-cols-4 border-b border-gray-50 px-5 py-4 last:border-b-0"
                  >
                    <span className="text-[13px] text-gray-700" style={{ fontWeight: 500 }}>
                      {row.label}
                    </span>
                    <span className="text-right text-[13px] text-gray-900" style={{ fontWeight: 600 }}>
                      {row.current}
                    </span>
                    <span className="text-right text-[13px] text-gray-400">{row.previous}</span>
                    <span
                      className="text-right text-[12px]"
                      style={{
                        fontWeight: 600,
                        color: row.up ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {row.delta}
                    </span>
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="col-span-7">
              <SectionLabel label="Strategic Snapshot" />
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
                {strategicRows.map((row, i) => (
                  <motion.div
                    key={row.category}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.42, delay: i * 0.05 }}
                    className="border-b border-gray-50 px-6 py-5 last:border-b-0"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[13px] text-gray-800" style={{ fontWeight: 600 }}>
                        {row.category}
                      </p>
                      <StatusPill text={row.status} tone={row.tone} />
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-gray-500">
                      {row.note}
                    </p>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
        </RevealSection>

        <RevealSection delay={0.08}>
          <section>
            <SectionLabel label="Report Types" />
            <div className="mt-4 grid grid-cols-5 gap-4">
              {reportTypes.map((r, i) => (
                <motion.button
                  key={r.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.42, delay: i * 0.04 }}
                  className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-gray-100 bg-white p-5 text-left transition-all hover:border-gray-200 hover:shadow-md"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: r.color + "10" }}
                  >
                    <r.icon size={18} style={{ color: r.color }} />
                  </div>
                  <div>
                    <p className="text-[13px] text-gray-800" style={{ fontWeight: 600 }}>
                      {r.title}
                    </p>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-gray-400">
                      {r.desc}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        </RevealSection>

        <RevealSection delay={0.1}>
          <section>
            <SectionLabel label="Export Centre" />
            <div className="mt-4 grid grid-cols-5 gap-4">
              {exportsList.map((e, i) => (
                <motion.button
                  key={e.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.42, delay: i * 0.04 }}
                  onClick={() => setSelectedExport(e)}
                  className="group flex cursor-pointer flex-col justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 text-left transition-all hover:border-gray-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50">
                      <e.icon size={17} className="text-gray-500" />
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px]"
                      style={{
                        background: e.format === "PDF" ? "#00388312" : "#10b98112",
                        color: e.format === "PDF" ? "#003883" : "#10b981",
                        fontWeight: 600,
                      }}
                    >
                      {e.format}
                    </span>
                  </div>

                  <div>
                    <p className="text-[13px] text-gray-800" style={{ fontWeight: 600 }}>
                      {e.title}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-gray-400">
                      {e.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-gray-400 transition-colors group-hover:text-[#003883]">
                    <Download size={13} />
                    <span className="text-[11px]" style={{ fontWeight: 500 }}>
                      Download
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        </RevealSection>

        <RevealSection delay={0.12}>
          <section className="pb-4">
            <SectionLabel label="Investor Brief" />
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-50 px-6 py-4">
                <Lightbulb size={15} style={{ color: "#003883" }} />
                <span className="text-[12.5px] text-gray-500" style={{ fontWeight: 500 }}>
                  Strategic Commentary — Live OS
                </span>
              </div>

              <div className="flex flex-col gap-4 px-6 py-5">
                {insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.36, delay: i * 0.05 }}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-0.5">
                      {insight.type === "positive" ? (
                        <TrendingUp size={14} className="text-emerald-500" />
                      ) : insight.type === "action" ? (
                        <Lightbulb size={14} style={{ color: "#003883" }} />
                      ) : (
                        <Minus size={14} className="text-gray-300" />
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed text-gray-600">
                      {insight.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </RevealSection>

        <RevealSection delay={0.14}>
          <section className="pb-2">
            <SectionLabel label="Recommended Next Actions" />
            <div className="mt-4 rounded-xl border border-gray-100 bg-white p-6">
              <div className="flex flex-col gap-4">
                {recommendations.map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.36, delay: i * 0.06 }}
                    className="flex items-start gap-4"
                  >
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
                      style={{
                        background: i === 0 ? "#00388310" : "#f3f4f6",
                        color: i === 0 ? "#003883" : "#6b7280",
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-[13px] leading-relaxed text-gray-600">{item}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </RevealSection>
      </div>

      <ExportModal
        open={!!selectedExport}
        item={selectedExport}
        onClose={() => setSelectedExport(null)}
      />
    </div>
  );
}