import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Eye, Users,
  Plus, X, Trash2, AlertTriangle,
} from "lucide-react";
import { CustomSelect } from "./components/CustomSelect";
import { CardSectionHeader } from "./components/ui/CardSectionHeader";
import { DatePickerField } from "./components/ui/DatePickerField";
import { PageHeader } from "./components/ui/PageHeader";
import { useMarketing, type MarketingInput, type MarketingRow, type OfflineEntry, type OfflineInput } from "./hooks/useMarketing";

const NAVY = "#003883";
const FB_COLOR = "#003883";
const VIEWS_COLOR = "#003883";
const LEADS_COLOR = "#3c7a57";

const SQ_MONTHS = [
  "Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor",
  "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor",
];
const YEAR_OPTIONS = ["2026", "2027", "2028", "2029", "2030"] as const;
const YEARS = YEAR_OPTIONS.map(Number);
const CHANNELS = ["Billboard", "Fletushka", "Radio", "Evente", "Tjetër"] as const;

const SECTION_HEADER_TITLE_STYLE = {
  fontSize: 17,
  fontWeight: 700,
  letterSpacing: "0em",
  lineHeight: 1.18,
};

const CHART_HEADER_TITLE_STYLE = {
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "0em",
  lineHeight: 1.18,
};

const CHART_HEADER_SUBTITLE_STYLE = {
  fontSize: 11.75,
  fontWeight: 500,
  lineHeight: 1.35,
};

const OFFLINE_LOG_MOTION = {
  initial: { opacity: 0, y: 6, filter: "blur(1.5px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -4, filter: "blur(1px)" },
  transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const },
};

function fmtEur(n: number) {
  return `€${n.toLocaleString("de-DE")}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("de-DE");
}

function fmtFullNum(n: number) {
  return n.toLocaleString("de-DE");
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function getIsoMonth(iso: string) {
  const month = Number(iso.slice(5, 7));
  return Number.isFinite(month) ? month : null;
}

function offlineEntryMatchesPeriod(entry: OfflineEntry, year: number, month: number | "all") {
  if (entry.year !== year) return false;
  if (month === "all") return true;

  if (entry.period_type === "Vjetore") {
    return getIsoMonth(entry.date) === month;
  }

  return entry.month === month;
}

function offlineEntryMatchesKpiScope(entry: OfflineEntry, year: number, month: number | "all", scope: KpiScope) {
  if (scope === "month" || month === "all") {
    return offlineEntryMatchesPeriod(entry, year, month);
  }

  if (entry.year !== year) return false;
  const entryMonth = entry.period_type === "Vjetore" ? getIsoMonth(entry.date) : entry.month;
  return entryMonth !== null && entryMonth >= 1 && entryMonth <= month;
}

function getKpiPeriodLabel(year: number, month: number | "all", scope: KpiScope) {
  if (month === "all") return `${year}`;
  const monthLabel = SQ_MONTHS[month - 1];
  if (scope === "ytd" && month > 1) return `Janar - ${monthLabel} ${year}`;
  return `${monthLabel} ${year}`;
}

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

interface HeroCardProps {
  label: string;
  value: number;
  prevValue: number | null;
  format: (n: number) => string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>;
  comparisonLabel: string;
  delay: number;
  active: boolean;
}

type MarketingChartPoint = {
  label: string;
  spend: number;
  views: number;
  leads: number;
};

type KpiScope = "month" | "ytd";

type EngagementMetricKey = "views" | "leads";

function EngagementMetricRow({
  label,
  metricKey,
  color,
  data,
  maxValue,
  selectedMonthLabel,
  onHover,
}: {
  label: string;
  metricKey: EngagementMetricKey;
  color: string;
  data: MarketingChartPoint[];
  maxValue: number;
  selectedMonthLabel: string | null;
  onHover: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-[62px_1fr] items-end gap-3">
      <div className="flex h-[106px] items-end pb-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <span className="text-[11px] font-semibold text-black/42">{label}</span>
        </div>
      </div>
      <div className="grid h-[106px] grid-cols-12 items-end gap-2 border-b border-[#eef0f4]">
        {data.map((point, index) => {
          const value = point[metricKey];
          const isSelected = point.label === selectedMonthLabel;
          const height = value > 0 ? Math.max(8, Math.round((value / maxValue) * 90)) : 2;

          return (
            <div
              key={`${metricKey}-${point.label}`}
              className="flex h-full items-end justify-center"
              onMouseEnter={() => onHover(index)}
              aria-label={`${label}, ${point.label}: ${fmtNum(value)}`}
            >
              <motion.span
                className="w-[22px] rounded-t-[6px]"
                initial={false}
                animate={{ height }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  backgroundColor: value > 0 ? color : "rgba(0,0,0,0.08)",
                  opacity: value > 0 ? (isSelected ? 1 : 0.82) : 0.45,
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

function SpendMiniBars({
  data,
  selectedMonthLabel,
}: {
  data: MarketingChartPoint[];
  selectedMonthLabel: string | null;
}) {
  const selectedIndex = selectedMonthLabel
    ? data.findIndex((point) => point.label === selectedMonthLabel)
    : -1;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? (selectedIndex >= 0 ? selectedIndex : null);
  const activePoint = activeIndex === null ? null : data[activeIndex];
  const maxSpend = Math.max(1, ...data.map((point) => point.spend));

  return (
    <div
      className="rounded-[16px] border border-[#edf0f5] bg-[#fbfcfe] px-5 py-3.5"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="mb-3 flex min-h-[32px] items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-black/35">
          Shpenzime mujore të Facebook Ads
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
                {activePoint.label}
              </span>
              <span className="text-[11px] text-black/35">|</span>
              <span className="text-[11px] font-semibold" style={{ color: FB_COLOR }}>
                {fmtEur(activePoint.spend)} Facebook Ads
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-[62px_1fr] items-end gap-3">
        <div className="flex h-[190px] items-end pb-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: FB_COLOR }} />
            <span className="text-[11px] font-semibold text-black/42">Facebook</span>
          </div>
        </div>
        <div className="grid h-[190px] grid-cols-12 items-end gap-2 border-b border-[#eef0f4]">
          {data.map((point, index) => {
            const isSelected = point.label === selectedMonthLabel;
            const height = point.spend > 0 ? Math.max(8, Math.round((point.spend / maxSpend) * 158)) : 2;

            return (
              <div
                key={`spend-${point.label}`}
                className="flex h-full items-end justify-center"
                onMouseEnter={() => setHoveredIndex(index)}
                aria-label={`Facebook Ads, ${point.label}: ${fmtEur(point.spend)}`}
              >
                <motion.span
                  className="w-[24px] rounded-t-[7px]"
                  initial={false}
                  animate={{ height }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    backgroundColor: point.spend > 0 ? FB_COLOR : "rgba(0,0,0,0.08)",
                    opacity: point.spend > 0 ? (isSelected ? 1 : 0.84) : 0.45,
                    boxShadow: isSelected && point.spend > 0 ? `0 7px 18px ${FB_COLOR}24` : "none",
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
            const isSelected = point.label === selectedMonthLabel;
            return (
              <span
                key={point.label}
                className="text-center text-[9px] tracking-[-0.025em]"
                style={{
                  color: isSelected ? NAVY : "rgba(0,0,0,0.36)",
                  fontWeight: isSelected ? 800 : 600,
                }}
              >
                {point.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EngagementMiniBars({
  data,
  selectedMonthLabel,
}: {
  data: MarketingChartPoint[];
  selectedMonthLabel: string | null;
}) {
  const selectedIndex = selectedMonthLabel
    ? data.findIndex((point) => point.label === selectedMonthLabel)
    : -1;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? (selectedIndex >= 0 ? selectedIndex : null);
  const activePoint = activeIndex === null ? null : data[activeIndex];
  const maxViews = Math.max(1, ...data.map((point) => point.views));
  const maxLeads = Math.max(1, ...data.map((point) => point.leads));

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
              key={activePoint.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="flex items-center gap-3 rounded-[12px] border border-[#e8e8ec] bg-white px-3 py-2 shadow-[0_4px_14px_rgba(16,24,40,0.05)]"
            >
              <span className="text-[11px] font-semibold" style={{ color: NAVY }}>
                {activePoint.label}
              </span>
              <span className="text-[11px] text-black/35">|</span>
              <span className="text-[11px] font-semibold" style={{ color: VIEWS_COLOR }}>
                {fmtNum(activePoint.views)} shikime
              </span>
              <span className="text-[11px] font-semibold" style={{ color: LEADS_COLOR }}>
                {fmtNum(activePoint.leads)} kontakte
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        <EngagementMetricRow
          label="Shikime"
          metricKey="views"
          color={VIEWS_COLOR}
          data={data}
          maxValue={maxViews}
          selectedMonthLabel={selectedMonthLabel}
          onHover={setHoveredIndex}
        />
        <EngagementMetricRow
          label="Kontakte"
          metricKey="leads"
          color={LEADS_COLOR}
          data={data}
          maxValue={maxLeads}
          selectedMonthLabel={selectedMonthLabel}
          onHover={setHoveredIndex}
        />
      </div>

      <div className="mt-2 grid grid-cols-[62px_1fr] gap-3">
        <div />
        <div className="grid grid-cols-12 gap-2">
          {data.map((point) => {
            const isSelected = point.label === selectedMonthLabel;
            return (
              <span
                key={point.label}
                className="text-center text-[9px] tracking-[-0.025em]"
                style={{
                  color: isSelected ? NAVY : "rgba(0,0,0,0.36)",
                  fontWeight: isSelected ? 800 : 600,
                }}
              >
                {point.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HeroCard({
  label,
  value,
  prevValue,
  format,
  icon: Icon,
  comparisonLabel,
  delay,
  active,
}: HeroCardProps) {
  const animated = useCountUp(value, active, 1400);
  const delta = prevValue !== null && prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null;
  const deltaPos = delta !== null && delta >= 0;

  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={{ y: -3, boxShadow: "0 12px 24px rgba(16,24,40,0.07)" }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 rounded-[18px] border border-[#e8e8ec] bg-white px-5 py-4"
      style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.05)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#eef3fb]">
              <Icon size={15} style={{ color: NAVY }} strokeWidth={1.9} />
            </div>
          </div>
          <p className="text-[30px] leading-none tracking-[-1.7px]" style={{ fontWeight: 750, color: NAVY }}>
            {format(animated)}
          </p>
          <p className="mt-2 text-[12.5px] text-black/48" style={{ fontWeight: 600 }}>{label}</p>
        </div>

        <div className="flex min-w-[84px] flex-col items-end gap-2 pt-1 text-right">
          {delta !== null && (
            <div
              className="inline-flex items-center gap-1 rounded-full px-2 py-1"
              style={{ backgroundColor: deltaPos ? "#f0f7f3" : "#fdf3f3" }}
            >
              {deltaPos ? (
                <TrendingUp size={11} style={{ color: "#3c7a57" }} strokeWidth={2} />
              ) : (
                <TrendingDown size={11} style={{ color: "#b14b4b" }} strokeWidth={2} />
              )}
              <span className="text-[11px]" style={{ color: deltaPos ? "#3c7a57" : "#b14b4b", fontWeight: 700 }}>
                {deltaPos ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            </div>
          )}
          {prevValue !== null && prevValue > 0 && (
            <div className="text-right leading-snug">
              <p className="text-[10.5px] font-semibold text-black/32">{format(prevValue)}</p>
              <p className="text-[10px] text-black/28">{comparisonLabel}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function KpiScopeSwitch({
  value,
  onChange,
}: {
  value: KpiScope;
  onChange: (scope: KpiScope) => void;
}) {
  const options: Array<{ value: KpiScope; label: string }> = [
    { value: "month", label: "Muaji" },
    { value: "ytd", label: "Viti deri tani" },
  ];

  return (
    <div className="inline-flex rounded-[12px] border border-[#dfe6f2] bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.025)]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="relative rounded-[9px] px-3 py-1.5 text-[11px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#003883]/10"
            style={{
              color: active ? NAVY : "rgba(0,0,0,0.45)",
              fontWeight: active ? 750 : 650,
            }}
          >
            {active && (
              <motion.span
                layoutId="marketing-kpi-scope-active"
                className="absolute inset-0 rounded-[9px] bg-[#eef3fb]"
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MarketingActionCard({
  title,
  onClick,
  variant = "secondary",
}: {
  title: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-[146px] will-change-transform items-center gap-2 rounded-[12px] border px-2.5 py-2 text-left shadow-[0_1px_2px_rgba(16,24,40,0.025)] transition-[transform,box-shadow,background-color,border-color] duration-100 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(16,24,40,0.055)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#003883]/10"
      style={{
        backgroundColor: isPrimary ? "#f3f6fb" : "white",
        borderColor: isPrimary ? "#e2e9f4" : "#dfe6f2",
      }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] transition-colors duration-100"
        style={{
          backgroundColor: isPrimary ? "rgba(255,255,255,0.58)" : "#eef3fb",
          color: NAVY,
        }}
      >
        <Plus size={13.5} strokeWidth={2.4} />
      </span>
      <span
        className="block text-[11.5px] leading-tight"
        style={{ color: NAVY, fontWeight: 750 }}
      >
        {title}
      </span>
    </button>
  );
}

function OfflineSummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[14px] border border-[#edf0f5] bg-[#fbfcfe] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/32">{label}</p>
      <p className="mt-1 text-[18px] leading-none tracking-[-0.03em]" style={{ color: NAVY, fontWeight: 750 }}>
        {value}
      </p>
    </div>
  );
}

// ─── Modal field helpers ───────────────────────────────────────────────────────

function ModalNumberField({
  label, value, onChange, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-black/55">
        {label}{required && <span className="ml-0.5 text-[#b14b4b]">*</span>}
      </label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[38px] w-full rounded-[10px] border border-[#e8e8ec] bg-white px-3 text-[13px] outline-none transition focus:border-[#c8d3e8] focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
        style={{ color: "rgba(0,0,0,0.85)", fontWeight: 500 }}
      />
    </div>
  );
}

function ModalTextField({
  label, value, onChange, placeholder, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-black/55">
        {label}{required && <span className="ml-0.5 text-[#b14b4b]">*</span>}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-[38px] w-full rounded-[10px] border border-[#e8e8ec] bg-white px-3 text-[13px] outline-none transition focus:border-[#c8d3e8] focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
        style={{ color: "rgba(0,0,0,0.85)", fontWeight: 500 }}
      />
    </div>
  );
}

function ModalSelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  size = "sm",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-black/55">
        {label}{required && <span className="ml-0.5 text-[#b14b4b]">*</span>}
      </label>
      <CustomSelect
        size={size}
        className="w-full"
        options={options}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  );
}

function ModalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">
        {title}
      </p>
      {children}
    </section>
  );
}

function parseOptionalNonNegative(value: string): { value: number; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) return { value: 0, error: null };

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return {
      value: 0,
      error: "Vlerat duhet të jenë 0 ose më shumë.",
    };
  }

  return { value: parsed, error: null };
}

function parseRequiredPositive(value: string): { value: number; error: string | null } {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return {
      value: 0,
      error: "Shuma duhet të jetë më e madhe se 0.",
    };
  }

  return { value: parsed, error: null };
}

function digitalFormValuesFromRow(row?: MarketingRow | null) {
  return {
    spendFB: row ? String(row.spend_facebook ?? 0) : "",
    viewsFB: row ? String(row.views_facebook ?? 0) : "",
    viewsTT: row ? String(row.views_tiktok ?? 0) : "",
    leadsFB: row ? String(row.leads_facebook ?? 0) : "",
    leadsIG: row ? String(row.leads_instagram ?? 0) : "",
    leadsTT: row ? String(row.leads_tiktok ?? 0) : "",
  };
}

// ─── DigitalModal ──────────────────────────────────────────────────────────────

function DigitalModal({
  defaultYear, defaultMonth, existingData, onClose, onSave,
}: {
  defaultYear: number;
  defaultMonth: number;
  existingData: Record<number, Record<number, MarketingRow>>;
  onClose: () => void;
  onSave: (input: MarketingInput) => Promise<{ error: Error | null }>;
}) {
  const [year, setYear]           = useState(String(defaultYear));
  // Store the month name directly — avoids SQ_MONTHS.indexOf round-trip on every change.
  const [monthName, setMonthName] = useState(SQ_MONTHS[defaultMonth - 1] ?? SQ_MONTHS[0]);
  const [spendFB, setSpendFB]     = useState("");
  const [viewsFB, setViewsFB]     = useState("");
  const [viewsTT, setViewsTT]     = useState("");
  const [leadsFB, setLeadsFB]     = useState("");
  const [leadsIG, setLeadsIG]     = useState("");
  const [leadsTT, setLeadsTT]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [errMsg, setErrMsg]       = useState<string | null>(null);

  const selectedMonthNumber = SQ_MONTHS.indexOf(monthName) + 1;
  const selectedExistingRow = existingData[Number(year)]?.[selectedMonthNumber] ?? null;
  const canSubmit = year && selectedMonthNumber >= 1 && !saving;
  const periodLabel = `${monthName} ${year}`;
  const modeLabel = selectedExistingRow ? "Përditësim" : "Regjistrim i ri";

  useEffect(() => {
    const next = digitalFormValuesFromRow(selectedExistingRow);
    setSpendFB(next.spendFB);
    setViewsFB(next.viewsFB);
    setViewsTT(next.viewsTT);
    setLeadsFB(next.leadsFB);
    setLeadsIG(next.leadsIG);
    setLeadsTT(next.leadsTT);
  }, [selectedExistingRow]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErrMsg(null);
    try {
      const values = [
        parseOptionalNonNegative(spendFB),
        parseOptionalNonNegative(viewsFB),
        parseOptionalNonNegative(viewsTT),
        parseOptionalNonNegative(leadsFB),
        parseOptionalNonNegative(leadsIG),
        parseOptionalNonNegative(leadsTT),
      ];
      const firstError = values.find((result) => result.error)?.error;
      if (firstError) {
        setErrMsg(firstError);
        return;
      }

      const payload = {
        year:            Number(year),
        month:           selectedMonthNumber,
        spend_facebook:  values[0].value,
        views_facebook:  values[1].value,
        views_tiktok:    values[2].value,
        leads_facebook:  values[3].value,
        leads_instagram: values[4].value,
        leads_tiktok:    values[5].value,
      };
      const { error } = await onSave(payload);
      if (error) { setErrMsg(error.message); return; }
      onClose();
    } catch (err) {
      setErrMsg(
        err instanceof Error
          ? err.message
          : "Të dhënat nuk u ruajtën. Kontrolloni fushat dhe provoni përsëri.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[520px] rounded-[22px] border border-[#e8e8ec] bg-white px-7 py-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] leading-tight tracking-[-0.02em]" style={{ fontWeight: 750, color: NAVY }}>
              Të dhëna digjitale
            </h2>
            <p className="mt-1 text-[12px] font-medium text-black/42">
              {modeLabel} · {periodLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-black/35 transition hover:bg-[#f5f7fb] hover:text-black/60"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="rounded-[14px] border border-[#edf0f5] bg-[#fbfcfe] p-3">
          <div className="grid grid-cols-2 gap-3">
            <ModalSelectField
              label="Viti"
              value={year}
              onChange={setYear}
              options={[...YEAR_OPTIONS]}
              required
            />
            <ModalSelectField
              label="Muaji"
              value={monthName}
              onChange={setMonthName}
              options={SQ_MONTHS}
              required
            />
          </div>
        </div>

        <div className="my-5 border-t border-[#f0f0f4]" />

        <div className="space-y-4">
          <ModalSection title="Shpenzime">
            <ModalNumberField label="Facebook Ads (€)" value={spendFB} onChange={setSpendFB} />
          </ModalSection>

          <ModalSection title="Shikime">
            <div className="grid grid-cols-2 gap-3">
              <ModalNumberField label="Facebook" value={viewsFB} onChange={setViewsFB} />
              <ModalNumberField label="TikTok" value={viewsTT} onChange={setViewsTT} />
            </div>
          </ModalSection>

          <ModalSection title="Kontakte">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ModalNumberField label="Facebook" value={leadsFB} onChange={setLeadsFB} />
              <ModalNumberField label="Instagram" value={leadsIG} onChange={setLeadsIG} />
              <ModalNumberField label="TikTok" value={leadsTT} onChange={setLeadsTT} />
            </div>
          </ModalSection>
        </div>

        {errMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#fdf3f3] px-3 py-2.5">
            <AlertTriangle size={13} style={{ color: "#b14b4b" }} strokeWidth={2} />
            <p className="text-[12px]" style={{ color: "#b14b4b" }}>{errMsg}</p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="h-[38px] rounded-[10px] border border-[#e8e8ec] px-4 text-[13px] text-black/55 transition hover:bg-[#f5f7fb]"
          >
            Anulo
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-[38px] rounded-[10px] px-5 text-[13px] text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: NAVY, fontWeight: 600 }}
          >
            {saving ? "Duke ruajtur..." : selectedExistingRow ? "Ruaj ndryshimet" : "Ruaj"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── OfflineModal ──────────────────────────────────────────────────────────────

function OfflineModal({
  defaultYear, defaultMonth, onClose, onSave,
}: {
  defaultYear: number;
  defaultMonth: number;
  onClose: () => void;
  onSave: (input: OfflineInput) => Promise<{ error: Error | null }>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [channel, setPeriodChannel]   = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount]           = useState("");
  const [periodType, setPeriodType]   = useState<"Mujore" | "Vjetore">("Mujore");
  const [year, setYear]               = useState(String(defaultYear));
  const [month, setMonth]             = useState(String(defaultMonth));
  const [date, setDate]               = useState(today);
  const [saving, setSaving]           = useState(false);
  const [errMsg, setErrMsg]           = useState<string | null>(null);

  const canSubmit =
    channel && amount && year && date &&
    (periodType === "Vjetore" || month) && !saving;
  const selectedOfflineMonthName = SQ_MONTHS[Number(month) - 1] ?? SQ_MONTHS[defaultMonth - 1] ?? "";
  const offlinePeriodLabel = periodType === "Vjetore"
    ? `Vjetore ${year}`
    : `${selectedOfflineMonthName} ${year}`;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErrMsg(null);
    try {
      const parsedAmount = parseRequiredPositive(amount);
      if (parsedAmount.error) {
        setErrMsg(parsedAmount.error);
        return;
      }

      const { error } = await onSave({
        channel,
        description: description || null,
        amount:      parsedAmount.value,
        period_type: periodType,
        year:        Number(year),
        month:       periodType === "Mujore" ? Number(month) : null,
        date,
      });
      if (error) { setErrMsg(error.message); return; }
      onClose();
    } catch (err) {
      setErrMsg(
        err instanceof Error
          ? err.message
          : "Hyrja nuk u ruajt. Kontrolloni fushat dhe provoni përsëri.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[520px] rounded-[22px] border border-[#e8e8ec] bg-white px-7 py-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] leading-tight tracking-[-0.02em]" style={{ fontWeight: 750, color: NAVY }}>
              Të dhëna offline
            </h2>
            <p className="mt-1 text-[12px] font-medium text-black/42">
              Regjistrim shpenzimi · {offlinePeriodLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-black/35 transition hover:bg-[#f5f7fb] hover:text-black/60"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4">
          <ModalSection title="Periudha">
            <div className={`grid grid-cols-1 gap-3 ${periodType === "Mujore" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <ModalSelectField
                label="Viti"
                value={year}
                onChange={setYear}
                options={[...YEAR_OPTIONS]}
                required
              />
              {periodType === "Mujore" && (
                <ModalSelectField
                  label="Muaji"
                  value={selectedOfflineMonthName}
                  onChange={(v) => setMonth(String(SQ_MONTHS.indexOf(v) + 1))}
                  options={SQ_MONTHS}
                  required
                />
              )}
              <ModalSelectField
                label="Lloji"
                value={periodType}
                onChange={(v) => setPeriodType(v as "Mujore" | "Vjetore")}
                options={["Mujore", "Vjetore"]}
                required
              />
            </div>
          </ModalSection>

          <div className="border-t border-[#f0f0f4]" />

          <ModalSection title="Shpenzimi">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ModalSelectField
                label="Kanali"
                value={channel}
                onChange={setPeriodChannel}
                options={[...CHANNELS]}
                placeholder="Zgjidh kanalin"
                required
                size="md"
              />
              <ModalNumberField label="Shuma (€)" value={amount} onChange={setAmount} required />
            </div>
          </ModalSection>

          <ModalSection title="Detajet">
            <div className="grid grid-cols-1 gap-3">
              <DatePickerField
                label="Data"
                value={date}
                onChange={(next) => setDate(next ?? "")}
                required
              />
              <ModalTextField
                label="Përshkrimi"
                value={description}
                onChange={setDescription}
                placeholder="p.sh. Billboard pranë hyrjes kryesore"
              />
            </div>
          </ModalSection>
        </div>

        {errMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#fdf3f3] px-3 py-2.5">
            <AlertTriangle size={13} style={{ color: "#b14b4b" }} strokeWidth={2} />
            <p className="text-[12px]" style={{ color: "#b14b4b" }}>{errMsg}</p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="h-[38px] rounded-[10px] border border-[#e8e8ec] px-4 text-[13px] text-black/55 transition hover:bg-[#f5f7fb]"
          >
            Anulo
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-[38px] rounded-[10px] px-5 text-[13px] text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: NAVY, fontWeight: 600 }}
          >
            {saving ? "Duke ruajtur..." : "Ruaj"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── DeleteConfirmModal ────────────────────────────────────────────────────────

function DeleteConfirmModal({
  onCancel, onConfirm, loading, error,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  error?: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[360px] rounded-[20px] border border-[#e8e8ec] bg-white p-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#fdf3f3]">
          <AlertTriangle size={18} style={{ color: "#b14b4b" }} strokeWidth={2} />
        </div>
        <h2 className="text-[15px]" style={{ fontWeight: 700, color: "rgba(0,0,0,0.82)" }}>
          Fshi hyrjen offline
        </h2>
        <p className="mt-1.5 text-[13px] text-black/45">
          Jeni i sigurt? Ky veprim nuk mund të zhbëhet.
        </p>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#fdf3f3] px-3 py-2.5">
            <AlertTriangle size={13} style={{ color: "#b14b4b" }} strokeWidth={2} />
            <p className="text-[12px]" style={{ color: "#b14b4b" }}>{error}</p>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="h-[38px] rounded-[10px] border border-[#e8e8ec] px-4 text-[13px] text-black/55 transition hover:bg-[#f5f7fb] disabled:opacity-50"
          >
            Anulo
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="h-[38px] rounded-[10px] px-5 text-[13px] text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#b14b4b", fontWeight: 600 }}
          >
            {loading ? "Duke fshirë..." : "Fshi"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MarketingDashboard() {
  const {
    marketingData, offlineEntries, loading,
    saveMonthlyData, createOfflineEntry, deleteOfflineEntry,
  } = useMarketing();

  const [started, setStarted] = useState(false);
  const now = new Date();
  const currentYear = YEARS.includes(now.getFullYear()) ? now.getFullYear() : YEARS[0];
  const currentMonth = now.getMonth() + 1;
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | "all">(currentMonth);
  const [kpiScope, setKpiScope] = useState<KpiScope>("month");
  const [offlineLogYear, setOfflineLogYear] = useState(currentYear);
  const [offlineLogMonth, setOfflineLogMonth] = useState(currentMonth);

  const [showDigitalModal, setShowDigitalModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId]     = useState<string | null>(null);
  const [deleting, setDeleting]                 = useState(false);
  const [deleteError, setDeleteError]           = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setStarted(true), 80);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const existingData = useMemo(() => {
    const map: Record<number, Record<number, (typeof marketingData)[0]>> = {};
    for (const row of marketingData) {
      if (!map[row.year]) map[row.year] = {};
      map[row.year][row.month] = row;
    }
    return map;
  }, [marketingData]);

  const aggregateDigital = useCallback(
    (rows: typeof marketingData) => ({
      spend: rows.reduce((s, r) => s + r.spend_facebook, 0),
      views: rows.reduce((s, r) => s + r.views_facebook + r.views_tiktok, 0),
      leads: rows.reduce((s, r) => s + r.leads_facebook + r.leads_instagram + r.leads_tiktok, 0),
    }),
    [],
  );

  const currentDigitalRows = useMemo(
    () =>
      marketingData.filter((r) => {
        if (r.year !== filterYear) return false;
        if (filterMonth === "all") return true;
        if (kpiScope === "ytd") return r.month <= filterMonth;
        if (r.month !== filterMonth) return false;
        return true;
      }),
    [marketingData, filterYear, filterMonth, kpiScope]
  );

  const prevDigitalRows = useMemo(() => {
    if (filterMonth === "all") return marketingData.filter((r) => r.year === filterYear - 1);
    if (kpiScope === "ytd") {
      return marketingData.filter((r) => r.year === filterYear - 1 && r.month <= filterMonth);
    }
    const prevYear  = filterMonth === 1 ? filterYear - 1 : filterYear;
    const prevMonth = filterMonth === 1 ? 12 : (filterMonth as number) - 1;
    return marketingData.filter((r) => r.year === prevYear && r.month === prevMonth);
  }, [marketingData, filterYear, filterMonth, kpiScope]);

  const currentDigital = useMemo(() => aggregateDigital(currentDigitalRows), [aggregateDigital, currentDigitalRows]);
  const prevDigital    = useMemo(() => aggregateDigital(prevDigitalRows),    [aggregateDigital, prevDigitalRows]);

  const offlineSpendCurrent = useMemo(
    () =>
      offlineEntries
        .filter((entry) => offlineEntryMatchesKpiScope(entry, filterYear, filterMonth, kpiScope))
        .reduce((s, e) => s + e.amount, 0),
    [offlineEntries, filterYear, filterMonth, kpiScope]
  );

  const offlineSpendPrev = useMemo(() => {
    if (filterMonth === "all") {
      return offlineEntries
        .filter((e) => e.year === filterYear - 1)
        .reduce((s, e) => s + e.amount, 0);
    }
    if (kpiScope === "ytd") {
      return offlineEntries
        .filter((entry) => offlineEntryMatchesKpiScope(entry, filterYear - 1, filterMonth, "ytd"))
        .reduce((s, e) => s + e.amount, 0);
    }
    const prevYear  = filterMonth === 1 ? filterYear - 1 : filterYear;
    const prevMonth = filterMonth === 1 ? 12 : (filterMonth as number) - 1;
    return offlineEntries
      .filter((entry) => offlineEntryMatchesPeriod(entry, prevYear, prevMonth))
      .reduce((s, e) => s + e.amount, 0);
  }, [offlineEntries, filterYear, filterMonth, kpiScope]);

  const totalSpend    = currentDigital.spend + offlineSpendCurrent;
  const prevTotalSpend = prevDigital.spend + offlineSpendPrev;
  const hasPrevPeriod  = prevDigitalRows.length > 0 || offlineSpendPrev > 0;
  const selectedChartMonthLabel = filterMonth === "all" ? null : SQ_MONTHS[(filterMonth as number) - 1];
  const kpiPeriodLabel = getKpiPeriodLabel(filterYear, filterMonth, kpiScope);
  const comparisonLabel =
    filterMonth === "all"
      ? "viti i kaluar"
      : kpiScope === "ytd"
        ? getKpiPeriodLabel(filterYear - 1, filterMonth, "ytd")
        : "muaji i kaluar";

  const chartData = useMemo(
    (): MarketingChartPoint[] =>
      SQ_MONTHS.map((label, idx) => {
        const row = existingData[filterYear]?.[idx + 1];
        return {
          label,
          spend: row?.spend_facebook ?? 0,
          views: (row?.views_facebook ?? 0) + (row?.views_tiktok ?? 0),
          leads: (row?.leads_facebook ?? 0) + (row?.leads_instagram ?? 0) + (row?.leads_tiktok ?? 0),
        };
      }),
    [existingData, filterYear]
  );

  const filteredOfflineLog = useMemo(
    () =>
      offlineEntries
        .filter((entry) => {
          if (entry.year !== offlineLogYear) return false;
          if (entry.period_type === "Vjetore") return getIsoMonth(entry.date) === offlineLogMonth;
          return entry.month === offlineLogMonth;
        })
        .sort((a, b) => {
          if (a.period_type !== b.period_type) return a.period_type === "Mujore" ? -1 : 1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }),
    [offlineEntries, offlineLogYear, offlineLogMonth],
  );

  const offlineLogSpend = filteredOfflineLog.reduce((sum, entry) => sum + entry.amount, 0);
  const offlineLogMonthName = SQ_MONTHS[offlineLogMonth - 1];
  const defaultModalMonth = filterMonth === "all" ? currentMonth : (filterMonth as number);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setDeleteError(null);
    setDeleting(true);
    const { error } = await deleteOfflineEntry(deleteTargetId);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    setDeleteTargetId(null);
  };

  return (
    <div style={{ backgroundColor: "#f8f8fa" }}>
      <div className="mx-auto max-w-[1100px] px-10 py-10">

        {/* Header */}
        <PageHeader
          tone="brand"
          className="mb-5 items-start"
          titleClassName="leading-none"
          subtitleClassName="!mt-0"
          title={
            <motion.span {...fadeUp(0)} className="block">
              Marketingu
            </motion.span>
          }
          subtitle={
            <motion.span {...fadeUp(0.06)} className="block">
              Performanca e marketingut digjital dhe offline
            </motion.span>
          }
        />

        {/* Period selectors + quick actions */}
        <motion.div {...fadeUp(0.08)} className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CustomSelect
              size="sm"
              className="min-w-[100px]"
              options={[...YEAR_OPTIONS]}
              value={String(filterYear)}
              onChange={(v) => {
                setFilterYear(Number(v));
                setOfflineLogYear(Number(v));
              }}
            />
            <CustomSelect
              size="sm"
              className="min-w-[160px]"
              options={SQ_MONTHS}
              value={filterMonth === "all" ? "" : SQ_MONTHS[(filterMonth as number) - 1]}
              placeholder="Të gjitha muajt"
              onChange={(v) => {
                if (v === "") {
                  setFilterMonth("all");
                  return;
                }
                const nextMonth = SQ_MONTHS.indexOf(v) + 1;
                setFilterMonth(nextMonth);
                setOfflineLogMonth(nextMonth);
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <MarketingActionCard
              title="Performancë digjitale"
              variant="primary"
              onClick={() => setShowDigitalModal(true)}
            />
            <MarketingActionCard
              title="Shpenzim offline"
              onClick={() => setShowOfflineModal(true)}
            />
          </div>
        </motion.div>

        {/* KPI scope */}
        <motion.div
          {...fadeUp(0.1)}
          className="mb-3 flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-black/32">
              Përmbledhja
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={`${kpiScope}-${kpiPeriodLabel}`}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className="mt-0.5 text-[12px] font-semibold"
                style={{ color: NAVY }}
              >
                {kpiPeriodLabel}
              </motion.p>
            </AnimatePresence>
          </div>
          <KpiScopeSwitch value={kpiScope} onChange={setKpiScope} />
        </motion.div>

        {/* Hero cards */}
        <div className="mb-8 flex gap-4">
          <HeroCard
            label="Shpenzimet totale"
            value={totalSpend}
            prevValue={hasPrevPeriod ? prevTotalSpend : null}
            format={fmtEur}
            icon={TrendingUp}
            comparisonLabel={comparisonLabel}
            delay={0.1}
            active={started}
          />
          <HeroCard
            label="Shikimet totale"
            value={currentDigital.views}
            prevValue={prevDigitalRows.length > 0 ? prevDigital.views : null}
            format={fmtFullNum}
            icon={Eye}
            comparisonLabel={comparisonLabel}
            delay={0.17}
            active={started}
          />
          <HeroCard
            label="Kontaktet totale"
            value={currentDigital.leads}
            prevValue={prevDigitalRows.length > 0 ? prevDigital.leads : null}
            format={fmtNum}
            icon={Users}
            comparisonLabel={comparisonLabel}
            delay={0.24}
            active={started}
          />
        </div>

        {/* Spend mini bars */}
        <motion.div
          {...fadeUp(0.3)}
          className="mb-5 rounded-[18px] border border-[#e8e8ec] bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
        >
          <CardSectionHeader
            title="Shpenzimet sipas muajve"
            subtitle={`Shpenzimet e Facebook Ads sipas muajve — ${filterYear}`}
            className="mb-3 border-b-0 px-0 py-0"
            titleStyle={CHART_HEADER_TITLE_STYLE}
            subtitleStyle={CHART_HEADER_SUBTITLE_STYLE}
          />
          <SpendMiniBars data={chartData} selectedMonthLabel={selectedChartMonthLabel} />
        </motion.div>

        {/* Views / leads mini bars */}
        <motion.div
          {...fadeUp(0.36)}
          className="mb-8 rounded-[18px] border border-[#e8e8ec] bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
        >
          <CardSectionHeader
            title="Shikimet dhe kontaktet sipas muajve"
            subtitle={`Shikimet dhe kontaktet sipas muajve — ${filterYear}`}
            className="mb-3 border-b-0 px-0 py-0"
            titleStyle={CHART_HEADER_TITLE_STYLE}
            subtitleStyle={CHART_HEADER_SUBTITLE_STYLE}
          />
          <EngagementMiniBars data={chartData} selectedMonthLabel={selectedChartMonthLabel} />
        </motion.div>

        {/* Offline marketing log */}
        <motion.div
          {...fadeUp(0.42)}
          className="mb-8 rounded-[18px] border border-[#e8e8ec] bg-white px-6 py-5"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
        >
          <CardSectionHeader
            title="Regjistri i marketingut offline"
            className="mb-3 border-b-0 px-0 py-0"
            titleStyle={SECTION_HEADER_TITLE_STYLE}
            right={
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Muaji</span>
                  <CustomSelect
                    size="sm"
                    className="min-w-[112px]"
                    options={SQ_MONTHS}
                    value={offlineLogMonthName}
                    onChange={(next) => setOfflineLogMonth(SQ_MONTHS.indexOf(next) + 1)}
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Viti</span>
                  <CustomSelect
                    size="sm"
                    className="min-w-[92px]"
                    options={[...YEAR_OPTIONS]}
                    value={String(offlineLogYear)}
                    onChange={(next) => setOfflineLogYear(Number(next))}
                  />
                </label>
              </div>
            }
          />

          <div className="mb-3 grid grid-cols-3 gap-2.5">
            <OfflineSummaryCard label="Periudha" value={`${offlineLogMonthName} ${offlineLogYear}`} />
            <OfflineSummaryCard label="Shpenzime të muajit" value={fmtEur(offlineLogSpend)} />
            <OfflineSummaryCard label="Hyrje" value={String(filteredOfflineLog.length)} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {filteredOfflineLog.length === 0 ? (
              <motion.div key={`empty-${offlineLogYear}-${offlineLogMonth}`} {...OFFLINE_LOG_MOTION} className="flex flex-col items-center py-10">
                <p className="text-[13px] text-black/40" style={{ fontWeight: 500 }}>
                  {offlineEntries.length === 0
                    ? "Nuk ka hyrje offline të regjistruara ende"
                    : `Nuk ka hyrje offline për ${offlineLogMonthName} ${offlineLogYear}`}
                </p>
                <p className="mt-1 text-[12px] text-black/28">
                  {offlineEntries.length === 0
                    ? "Regjistro hyrjen e parë për ta nisur evidencën operative."
                    : "Ndrysho periudhën ose shto një hyrje offline për këtë muaj."}
                </p>
              </motion.div>
            ) : (
              <motion.div key={`table-${offlineLogYear}-${offlineLogMonth}`} {...OFFLINE_LOG_MOTION} className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[170px]" />
                    <col />
                    <col className="w-[92px]" />
                    <col className="w-[110px]" />
                    <col className="w-[96px]" />
                    <col className="w-[28px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#f0f0f4]">
                      {["Kanali", "Përshkrimi", "Shuma (€)", "Periudha", "Data", ""].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap pb-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-black/35"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOfflineLog.map((entry) => (
                      <tr key={entry.id} className="border-b border-[#f8f8fa] transition hover:bg-[#fafbfd]">
                        <td className="py-3 pr-4">
                          <span
                            className="inline-flex items-center whitespace-nowrap rounded-[7px] px-2.5 py-1 text-[11.5px]"
                            style={{
                              background: "#f0f1f3",
                              color: "rgba(24, 31, 42, 0.62)",
                              fontWeight:  600,
                            }}
                          >
                            {entry.channel}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-[12.5px] text-black/50">
                          {entry.description || <span className="text-black/25">—</span>}
                        </td>
                        <td className="py-3 pr-4 text-[13px]" style={{ color: NAVY, fontWeight: 700 }}>
                          {fmtEur(entry.amount)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className="inline-flex items-center whitespace-nowrap rounded-[6px] px-2 py-0.5 text-[11px]"
                            style={{
                              background: entry.period_type === "Vjetore" ? "#eaf0fa" : "#f0f7f3",
                              color:      entry.period_type === "Vjetore" ? NAVY : "#3c7a57",
                              fontWeight: 600,
                            }}
                          >
                            {entry.period_type}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-[12.5px] text-black/45">
                          {fmtDate(entry.date)}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setDeleteTargetId(entry.id);
                              setDeleteError(null);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-[7px] text-black/25 transition hover:bg-[#fdf3f3] hover:text-[#b14b4b]"
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {showDigitalModal && (
          <DigitalModal
            defaultYear={filterYear}
            defaultMonth={defaultModalMonth}
            existingData={existingData}
            onClose={() => setShowDigitalModal(false)}
            onSave={saveMonthlyData}
          />
        )}
        {showOfflineModal && (
          <OfflineModal
            defaultYear={filterYear}
            defaultMonth={defaultModalMonth}
            onClose={() => setShowOfflineModal(false)}
            onSave={createOfflineEntry}
          />
        )}
        {deleteTargetId && (
          <DeleteConfirmModal
            loading={deleting}
            error={deleteError}
            onCancel={() => {
              setDeleteTargetId(null);
              setDeleteError(null);
            }}
            onConfirm={handleDeleteConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
