import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Eye, Users, Database,
  Plus, X, Trash2, AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { CustomSelect } from "./components/CustomSelect";
import { CardSectionHeader } from "./components/ui/CardSectionHeader";
import { PageHeader } from "./components/ui/PageHeader";
import { useMarketing, type MarketingInput, type OfflineInput } from "./hooks/useMarketing";

const NAVY = "#003883";
const FB_COLOR = "#003883";
const VIEWS_COLOR = "#003883";
const LEADS_COLOR = "#3c7a57";

const SQ_MONTHS = [
  "Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor",
  "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor",
];
const SQ_MONTHS_SHORT = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gus", "Sht", "Tet", "Nën", "Dhj"];
const YEAR_OPTIONS = ["2026", "2027", "2028", "2029", "2030"] as const;
const YEARS = YEAR_OPTIONS.map(Number);
const CHANNELS = ["Billboard", "Fletushka", "Radio", "Evente", "Tjetër"] as const;
const OFFLINE_FILTERS = ["E gjitha", "Mujore", "Vjetore"] as const;

const CHANNEL_COLOR: Record<string, string> = {
  Billboard: "#003883",
  Fletushka: "#3c7a57",
  Radio:     "#b0892f",
  Evente:    "#7b4bb0",
  Tjetër:    "#6b7280",
};

function fmtEur(n: number) {
  return `€${n.toLocaleString("de-DE")}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("de-DE");
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
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
  delay: number;
  active: boolean;
}

type SpendTooltipPayloadItem = {
  value?: number | string;
};

type SpendTooltipProps = {
  active?: boolean;
  payload?: SpendTooltipPayloadItem[];
  label?: string;
};

type LineTooltipPayloadItem = {
  name?: string;
  stroke?: string;
  value?: number | string;
};

type LineTooltipProps = {
  active?: boolean;
  payload?: LineTooltipPayloadItem[];
  label?: string;
};

function HeroCard({ label, value, prevValue, format, icon: Icon, delay, active }: HeroCardProps) {
  const animated = useCountUp(value, active, 1400);
  const delta = prevValue !== null && prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null;
  const deltaPos = delta !== null && delta >= 0;

  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(0,0,0,0.09)" }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 rounded-[20px] border border-[#E8E8EC] bg-white px-6 py-6"
      style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.06)" }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#eaf0fa]">
          <Icon size={16} style={{ color: NAVY }} strokeWidth={1.8} />
        </div>
        {delta !== null && (
          <div className="flex items-center gap-1">
            {deltaPos ? (
              <TrendingUp size={12} style={{ color: "#3c7a57" }} strokeWidth={2} />
            ) : (
              <TrendingDown size={12} style={{ color: "#b14b4b" }} strokeWidth={2} />
            )}
            <span className="text-[12px]" style={{ color: deltaPos ? "#3c7a57" : "#b14b4b", fontWeight: 600 }}>
              {deltaPos ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <p className="text-[36px] leading-none tracking-[-2px]" style={{ fontWeight: 700, color: NAVY }}>
        {format(animated)}
      </p>
      <p className="mt-2 text-[12.5px] text-black/45" style={{ fontWeight: 500 }}>{label}</p>
      {prevValue !== null && prevValue > 0 && (
        <p className="mt-0.5 text-[11.5px] text-black/28">{format(prevValue)} muaji i kaluar</p>
      )}
    </motion.div>
  );
}

function SpendTooltip({ active, payload, label }: SpendTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] border border-[#e8e8ec] bg-white px-3 py-2" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
      <p className="mb-1 text-[11px] text-black/40">{label}</p>
      <p className="text-[13px]" style={{ color: NAVY, fontWeight: 700 }}>
        {fmtEur(Number(payload[0].value ?? 0))}
      </p>
    </div>
  );
}

function LineTooltip({ active, payload, label }: LineTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] border border-[#e8e8ec] bg-white px-3 py-2.5" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
      <p className="mb-1.5 text-[11px] text-black/40">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.stroke ?? NAVY }} />
          <span className="text-[12px] text-black/50">{p.name ?? "—"}:</span>
          <span className="text-[12px]" style={{ color: p.stroke ?? NAVY, fontWeight: 600 }}>
            {fmtNum(Number(p.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartYearSelect({ value, onChange }: { value: number; onChange: (year: number) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Viti</span>
      <CustomSelect
        size="sm"
        className="min-w-[92px]"
        options={[...YEAR_OPTIONS]}
        value={String(value)}
        onChange={(next) => onChange(Number(next))}
      />
    </label>
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

function ModalDateField({
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
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[38px] w-full rounded-[10px] border border-[#e8e8ec] bg-white px-3 text-[13px] outline-none transition focus:border-[#c8d3e8] focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
        style={{ color: "rgba(0,0,0,0.85)", fontWeight: 500 }}
      />
    </div>
  );
}

// ─── DigitalModal ──────────────────────────────────────────────────────────────

function DigitalModal({
  defaultYear, defaultMonth, onClose, onSave,
}: {
  defaultYear: number;
  defaultMonth: number;
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

  const canSubmit = year && monthName && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErrMsg(null);
    try {
      const monthNumber = SQ_MONTHS.indexOf(monthName) + 1; // 1–12
      const payload = {
        year:            Number(year),
        month:           monthNumber,
        spend_facebook:  Number(spendFB)  || 0,
        views_facebook:  Number(viewsFB)  || 0,
        views_tiktok:    Number(viewsTT)  || 0,
        leads_facebook:  Number(leadsFB)  || 0,
        leads_instagram: Number(leadsIG)  || 0,
        leads_tiktok:    Number(leadsTT)  || 0,
      };
      const { error } = await onSave(payload);
      if (error) { setErrMsg(error.message); return; }
      onClose();
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Ruajtja dështoi. Provo përsëri.");
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
        className="w-full max-w-[480px] rounded-[20px] border border-[#e8e8ec] bg-white p-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px]" style={{ fontWeight: 700, color: NAVY }}>
            Shto të dhëna dixhitale
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-black/35 transition hover:bg-[#f5f7fb] hover:text-black/60"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-black/55">
              Viti<span className="ml-0.5 text-[#b14b4b]">*</span>
            </label>
            <CustomSelect size="sm" className="w-full" options={[...YEAR_OPTIONS]} value={year} onChange={setYear} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-black/55">
              Muaji<span className="ml-0.5 text-[#b14b4b]">*</span>
            </label>
            <CustomSelect
              size="sm"
              className="w-full"
              options={SQ_MONTHS}
              value={monthName}
              onChange={setMonthName}
            />
          </div>
          <ModalNumberField label="Shpenzime Facebook (€)" value={spendFB} onChange={setSpendFB} />
          <ModalNumberField label="Shikime Facebook"       value={viewsFB} onChange={setViewsFB} />
          <ModalNumberField label="Shikime TikTok"         value={viewsTT} onChange={setViewsTT} />
          <ModalNumberField label="Leads Facebook"         value={leadsFB} onChange={setLeadsFB} />
          <ModalNumberField label="Leads Instagram"        value={leadsIG} onChange={setLeadsIG} />
          <ModalNumberField label="Leads TikTok"           value={leadsTT} onChange={setLeadsTT} />
        </div>

        {errMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#fdf3f3] px-3 py-2.5">
            <AlertTriangle size={13} style={{ color: "#b14b4b" }} strokeWidth={2} />
            <p className="text-[12px]" style={{ color: "#b14b4b" }}>{errMsg}</p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
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
            {saving ? "Duke ruajtur..." : "Shto të dhënat"}
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

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErrMsg(null);
    try {
      const { error } = await onSave({
        channel,
        description: description || null,
        amount:      Number(amount),
        period_type: periodType,
        year:        Number(year),
        month:       periodType === "Mujore" ? Number(month) : null,
        date,
      });
      if (error) { setErrMsg(error.message); return; }
      onClose();
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Ruajtja dështoi. Provo përsëri.");
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
        className="w-full max-w-[480px] rounded-[20px] border border-[#e8e8ec] bg-white p-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px]" style={{ fontWeight: 700, color: NAVY }}>
            Shto hyrje offline
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-black/35 transition hover:bg-[#f5f7fb] hover:text-black/60"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-black/55">
              Kanali<span className="ml-0.5 text-[#b14b4b]">*</span>
            </label>
            <CustomSelect
              size="md"
              className="w-full"
              options={[...CHANNELS]}
              value={channel}
              placeholder="Zgjidh kanalin"
              onChange={setPeriodChannel}
            />
          </div>
          <ModalTextField
            label="Përshkrimi"
            value={description}
            onChange={setDescription}
            placeholder="Opsionale"
          />
          <ModalNumberField label="Shuma (€)" value={amount} onChange={setAmount} required />
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-black/55">
              Periudha<span className="ml-0.5 text-[#b14b4b]">*</span>
            </label>
            <CustomSelect
              size="md"
              className="w-full"
              options={["Mujore", "Vjetore"]}
              value={periodType}
              onChange={(v) => setPeriodType(v as "Mujore" | "Vjetore")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-black/55">
                Viti<span className="ml-0.5 text-[#b14b4b]">*</span>
              </label>
              <CustomSelect size="md" className="w-full" options={[...YEAR_OPTIONS]} value={year} onChange={setYear} />
            </div>
            {periodType === "Mujore" && (
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-black/55">
                  Muaji<span className="ml-0.5 text-[#b14b4b]">*</span>
                </label>
                <CustomSelect
                  size="md"
                  className="w-full"
                  options={SQ_MONTHS}
                  value={SQ_MONTHS[Number(month) - 1] ?? ""}
                  onChange={(v) => setMonth(String(SQ_MONTHS.indexOf(v) + 1))}
                />
              </div>
            )}
          </div>
          <ModalDateField label="Data" value={date} onChange={setDate} required />
        </div>

        {errMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#fdf3f3] px-3 py-2.5">
            <AlertTriangle size={13} style={{ color: "#b14b4b" }} strokeWidth={2} />
            <p className="text-[12px]" style={{ color: "#b14b4b" }}>{errMsg}</p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
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
            {saving ? "Duke ruajtur..." : "Shto hyrjen"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── DeleteConfirmModal ────────────────────────────────────────────────────────

function DeleteConfirmModal({
  onCancel, onConfirm, loading,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
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
          Jeni i sigurt? Kjo veprim nuk mund të zhbëhet.
        </p>
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

type MarketingDashboardProps = {
  onOpenDataInput?: () => void;
};

export default function MarketingDashboard({ onOpenDataInput }: MarketingDashboardProps) {
  const {
    marketingData, offlineEntries, loading,
    saveMonthlyData, createOfflineEntry, deleteOfflineEntry,
  } = useMarketing();

  const [started, setStarted] = useState(false);
  const now = new Date();
  const [filterYear, setFilterYear] = useState(
    YEARS.includes(now.getFullYear()) ? now.getFullYear() : YEARS[0]
  );
  const [filterMonth, setFilterMonth] = useState<number | "all">(now.getMonth() + 1);

  const [showDigitalModal, setShowDigitalModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId]     = useState<string | null>(null);
  const [deleting, setDeleting]                 = useState(false);
  const [logFilter, setLogFilter]               = useState<"E gjitha" | "Mujore" | "Vjetore">("E gjitha");

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
        if (filterMonth !== "all" && r.month !== filterMonth) return false;
        return true;
      }),
    [marketingData, filterYear, filterMonth]
  );

  const prevDigitalRows = useMemo(() => {
    if (filterMonth === "all") return marketingData.filter((r) => r.year === filterYear - 1);
    const prevYear  = filterMonth === 1 ? filterYear - 1 : filterYear;
    const prevMonth = filterMonth === 1 ? 12 : (filterMonth as number) - 1;
    return marketingData.filter((r) => r.year === prevYear && r.month === prevMonth);
  }, [marketingData, filterYear, filterMonth]);

  const currentDigital = useMemo(() => aggregateDigital(currentDigitalRows), [aggregateDigital, currentDigitalRows]);
  const prevDigital    = useMemo(() => aggregateDigital(prevDigitalRows),    [aggregateDigital, prevDigitalRows]);

  const offlineSpendCurrent = useMemo(
    () =>
      offlineEntries
        .filter((e) => {
          if (e.year !== filterYear) return false;
          if (filterMonth === "all") return true;
          return e.period_type === "Vjetore" || e.month === (filterMonth as number);
        })
        .reduce((s, e) => s + e.amount, 0),
    [offlineEntries, filterYear, filterMonth]
  );

  const offlineSpendPrev = useMemo(() => {
    if (filterMonth === "all") {
      return offlineEntries
        .filter((e) => e.year === filterYear - 1)
        .reduce((s, e) => s + e.amount, 0);
    }
    const prevYear  = filterMonth === 1 ? filterYear - 1 : filterYear;
    const prevMonth = filterMonth === 1 ? 12 : (filterMonth as number) - 1;
    return offlineEntries
      .filter((e) => {
        if (e.year !== prevYear) return false;
        return e.period_type === "Vjetore" || e.month === prevMonth;
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [offlineEntries, filterYear, filterMonth]);

  const totalSpend    = currentDigital.spend + offlineSpendCurrent;
  const prevTotalSpend = prevDigital.spend + offlineSpendPrev;
  const hasPrevPeriod  = prevDigitalRows.length > 0 || offlineSpendPrev > 0;

  const chartData = useMemo(
    () =>
      SQ_MONTHS_SHORT.map((label, idx) => {
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

  const filteredOfflineLog = useMemo(() => {
    if (logFilter === "E gjitha") return offlineEntries;
    return offlineEntries.filter((e) => e.period_type === logFilter);
  }, [offlineEntries, logFilter]);

  const defaultModalMonth = filterMonth === "all" ? now.getMonth() + 1 : (filterMonth as number);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    await deleteOfflineEntry(deleteTargetId);
    setDeleting(false);
    setDeleteTargetId(null);
  };

  return (
    <div style={{ backgroundColor: "#f8f8fa" }}>
      <div className="mx-auto max-w-[1100px] px-10 py-10">

        {/* Header */}
        <PageHeader
          tone="brand"
          className="mb-5 items-start"
          title={
            <motion.span {...fadeUp(0)} className="block">
              Marketingu
            </motion.span>
          }
          subtitle={
            <motion.span {...fadeUp(0.06)} className="block">
              Përformanca e marketingut digjital dhe offline
            </motion.span>
          }
          right={
            onOpenDataInput ? (
              <motion.div {...fadeUp(0.08)}>
                <button
                  onClick={onOpenDataInput}
                  className="flex h-[38px] items-center gap-2 rounded-[11px] px-4 text-[13px] text-white transition hover:opacity-90"
                  style={{ backgroundColor: NAVY }}
                >
                  <Database size={14} strokeWidth={2.1} />
                  Hap Data Input
                </button>
              </motion.div>
            ) : null
          }
        />

        {/* Period selectors + action buttons */}
        <motion.div {...fadeUp(0.08)} className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CustomSelect
              size="sm"
              className="min-w-[100px]"
              options={[...YEAR_OPTIONS]}
              value={String(filterYear)}
              onChange={(v) => setFilterYear(Number(v))}
            />
            <CustomSelect
              size="sm"
              className="min-w-[160px]"
              options={SQ_MONTHS}
              value={filterMonth === "all" ? "" : SQ_MONTHS[(filterMonth as number) - 1]}
              placeholder="Të gjitha muajt"
              onChange={(v) => setFilterMonth(v === "" ? "all" : SQ_MONTHS.indexOf(v) + 1)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDigitalModal(true)}
              className="flex h-[34px] items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] text-white transition hover:opacity-90"
              style={{ backgroundColor: NAVY, fontWeight: 600 }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Shto të dhëna dixhitale
            </button>
            <button
              onClick={() => setShowOfflineModal(true)}
              className="flex h-[34px] items-center gap-1.5 rounded-[10px] border px-3.5 text-[12.5px] transition hover:bg-[#f5f7fb]"
              style={{ borderColor: `${NAVY}40`, color: NAVY, fontWeight: 600 }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Shto hyrje offline
            </button>
          </div>
        </motion.div>

        {/* Hero cards */}
        <div className="mb-8 flex gap-4">
          <HeroCard
            label="Shpenzimet totale"
            value={totalSpend}
            prevValue={hasPrevPeriod ? prevTotalSpend : null}
            format={fmtEur}
            icon={TrendingUp}
            delay={0.1}
            active={started}
          />
          <HeroCard
            label="Shikimet totale"
            value={currentDigital.views}
            prevValue={prevDigitalRows.length > 0 ? prevDigital.views : null}
            format={fmtNum}
            icon={Eye}
            delay={0.17}
            active={started}
          />
          <HeroCard
            label="Kontaktet totale"
            value={currentDigital.leads}
            prevValue={prevDigitalRows.length > 0 ? prevDigital.leads : null}
            format={fmtNum}
            icon={Users}
            delay={0.24}
            active={started}
          />
        </div>

        {/* Spend bar chart */}
        <motion.div
          {...fadeUp(0.3)}
          className="mb-5 rounded-[18px] border border-[#e8e8ec] bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
        >
          <CardSectionHeader
            title="Shpenzimet sipas muajve"
            subtitle={`Shpenzimet e Facebook sipas muajve — ${filterYear}`}
            className="mb-5 border-b-0 px-0 py-0"
            right={<ChartYearSelect value={filterYear} onChange={setFilterYear} />}
          />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={22} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: "rgba(0,0,0,0.35)", fontWeight: 500 }} />
              <YAxis hide />
              <Tooltip content={<SpendTooltip />} cursor={{ fill: "rgba(0,56,131,0.04)", radius: 6 }} />
              <Bar dataKey="spend" name="Facebook" fill={FB_COLOR} radius={[5, 5, 0, 0]} fillOpacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: FB_COLOR }} />
            <span className="text-[11.5px] text-black/40">Facebook</span>
          </div>
        </motion.div>

        {/* Views / leads line chart */}
        <motion.div
          {...fadeUp(0.36)}
          className="mb-8 rounded-[18px] border border-[#e8e8ec] bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
        >
          <CardSectionHeader
            title="Shikimet dhe kontaktet sipas muajve"
            subtitle={`Shikimet dhe kontaktet sipas muajve — ${filterYear}`}
            className="mb-5 border-b-0 px-0 py-0"
            right={<ChartYearSelect value={filterYear} onChange={setFilterYear} />}
          />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false}
                interval={0}
                minTickGap={0}
                padding={{ left: 8, right: 8 }}
                tick={{ fontSize: 11, fill: "rgba(0,0,0,0.35)", fontWeight: 500 }} />
              <YAxis hide />
              <Tooltip content={<LineTooltip />} />
              <Line type="monotone" dataKey="views" name="Shikime"    stroke={VIEWS_COLOR} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="leads" name="Kontaktet"  stroke={LEADS_COLOR} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: VIEWS_COLOR }} />
              <span className="text-[11.5px] text-black/40">Shikime</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: LEADS_COLOR }} />
              <span className="text-[11.5px] text-black/40">Kontaktet</span>
            </div>
          </div>
        </motion.div>

        {/* Offline marketing log */}
        <motion.div
          {...fadeUp(0.42)}
          className="mb-8 rounded-[18px] border border-[#e8e8ec] bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
        >
          <CardSectionHeader
            title="Regjistri i marketingut offline"
            className="mb-4 border-b-0 px-0 py-0"
            right={
              <div className="flex items-center rounded-[10px] border border-[#e8e8ec] p-0.5">
                {OFFLINE_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className="rounded-[8px] px-3 py-1.5 text-[11.5px] transition"
                    style={{
                      background: logFilter === f ? NAVY : "transparent",
                      color: logFilter === f ? "white" : "rgba(0,0,0,0.45)",
                      fontWeight: logFilter === f ? 600 : 400,
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          />

          {filteredOfflineLog.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <p className="text-[13px] text-black/40" style={{ fontWeight: 500 }}>
                Nuk ka hyrje offline
              </p>
              <p className="mt-1 text-[12px] text-black/28">
                Shto hyrjen e parë duke klikuar butonin më sipër
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f0f0f4]">
                    {["Kanali", "Përshkrimi", "Shuma (€)", "Periudha", "Data", ""].map((h) => (
                      <th
                        key={h}
                        className="pb-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-black/35"
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
                          className="inline-flex items-center rounded-[7px] px-2.5 py-1 text-[11.5px]"
                          style={{
                            background: `${CHANNEL_COLOR[entry.channel] ?? "#6b7280"}18`,
                            color:       CHANNEL_COLOR[entry.channel] ?? "#6b7280",
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
                          className="inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11px]"
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
                          onClick={() => setDeleteTargetId(entry.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-[7px] text-black/25 transition hover:bg-[#fdf3f3] hover:text-[#b14b4b]"
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {showDigitalModal && (
          <DigitalModal
            defaultYear={filterYear}
            defaultMonth={defaultModalMonth}
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
            onCancel={() => setDeleteTargetId(null)}
            onConfirm={handleDeleteConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
