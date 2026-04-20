import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Save, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { CustomSelect } from "./CustomSelect";
import { useMarketing } from "../hooks/useMarketing";
import type { MarketingInput, MarketingRow, OfflineInput, OfflineEntry } from "../hooks/useMarketing";

const NAVY = "#003883";

const SQ_MONTHS = [
  "Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor",
  "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor",
];
const YEAR_OPTIONS = ["2026", "2027", "2028", "2029", "2030"] as const;
const YEARS = YEAR_OPTIONS.map(Number);
const CHANNELS = ["Billboard", "Fletushka", "Radio", "Evente", "Tjetër"] as const;

const CHANNEL_STYLE: Record<string, { bg: string; color: string }> = {
  Billboard: { bg: "#eaf0fa", color: "#003883" },
  Fletushka: { bg: "#fff8e8", color: "#b0892f" },
  Radio: { bg: "#edf7f1", color: "#3c7a57" },
  Evente: { bg: "#fbeeee", color: "#b14b4b" },
  Tjetër: { bg: "#f4f4f5", color: "rgba(0,0,0,0.5)" },
};

type OfflineFilter = "Të gjitha" | "Mujore" | "Vjetore";
const OFFLINE_FILTERS: OfflineFilter[] = ["Të gjitha", "Mujore", "Vjetore"];

function fmtEur(n: number) {
  return `€${n.toLocaleString("de-DE")}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("de-DE");
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  return `${String(d.getDate()).padStart(2, "0")} ${SQ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtMonthYear(month: number, year: number): string {
  return `${SQ_MONTHS[month - 1]} ${year}`;
}

function ModalNumberField({ label, value, onChange, prefix, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">{label}</span>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-[13px] text-black/40">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "0"}
          className="h-10 w-full rounded-[11px] border border-black/10 bg-white text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
          style={{ paddingLeft: prefix ? "1.75rem" : "0.75rem", paddingRight: "0.75rem" }}
        />
      </div>
    </label>
  );
}

function ModalTextField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
      />
    </label>
  );
}

function ModalDateField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
      />
    </label>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-black/[0.06]" />
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-black/30">{label}</span>
      <div className="h-px flex-1 bg-black/[0.06]" />
    </div>
  );
}

interface DigitalModalState {
  year: string;
  month: string;
  spend_facebook: string;
  views_facebook: string;
  views_tiktok: string;
  leads_facebook: string;
  leads_instagram: string;
  leads_tiktok: string;
}

const emptyDigital = (year: number, month: string): DigitalModalState => ({
  year: String(year),
  month,
  spend_facebook: "",
  views_facebook: "",
  views_tiktok: "",
  leads_facebook: "",
  leads_instagram: "",
  leads_tiktok: "",
});

const digitalFormFromEntry = (entry: MarketingRow): DigitalModalState => ({
  year: String(entry.year),
  month: SQ_MONTHS[entry.month - 1] ?? SQ_MONTHS[0],
  spend_facebook: String(entry.spend_facebook ?? ""),
  views_facebook: String(entry.views_facebook ?? ""),
  views_tiktok: String(entry.views_tiktok ?? ""),
  leads_facebook: String(entry.leads_facebook ?? ""),
  leads_instagram: String(entry.leads_instagram ?? ""),
  leads_tiktok: String(entry.leads_tiktok ?? ""),
});

function getCreateDigitalForm(
  year: number,
  month: string,
  existingData: Record<number, Record<number, MarketingRow>>,
): DigitalModalState {
  const monthIdx = SQ_MONTHS.indexOf(month) + 1;
  const existing = monthIdx > 0 ? existingData[year]?.[monthIdx] : undefined;
  return existing ? digitalFormFromEntry(existing) : emptyDigital(year, month);
}

function getInitialDigitalForm(
  editingEntry: MarketingRow | null,
  defaultYear: number,
  defaultMonth: string,
  existingData: Record<number, Record<number, MarketingRow>>,
): DigitalModalState {
  return editingEntry
    ? digitalFormFromEntry(editingEntry)
    : getCreateDigitalForm(defaultYear, defaultMonth, existingData);
}

function DigitalModal({
  open,
  onClose,
  onCreate,
  onUpdate,
  defaultYear,
  defaultMonth,
  existingData,
  editingEntry,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: MarketingInput) => Promise<{ error: Error | null }>;
  onUpdate: (id: string, input: MarketingInput) => Promise<{ error: Error | null }>;
  defaultYear: number;
  defaultMonth: string;
  existingData: Record<number, Record<number, MarketingRow>>;
  editingEntry: MarketingRow | null;
}) {
  const [form, setForm] = useState<DigitalModalState>(() =>
    getInitialDigitalForm(editingEntry, defaultYear, defaultMonth, existingData),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEditMode = !!editingEntry;

  const set = (key: keyof DigitalModalState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setCreatePeriodField =
    (key: "year" | "month") =>
    (value: string) => {
      setForm((prev) => {
        if (isEditMode) {
          return { ...prev, [key]: value };
        }

        const nextYear = key === "year" ? Number(value) : Number(prev.year);
        const nextMonth = key === "month" ? value : prev.month;
        return getCreateDigitalForm(nextYear, nextMonth, existingData);
      });
    };

  const handleSave = async () => {
    const monthIdx = SQ_MONTHS.indexOf(form.month) + 1;
    if (monthIdx === 0 || !form.year) {
      setErr("Zgjidh vitin dhe muajin.");
      return;
    }

    setSaving(true);
    setErr(null);
    const input = {
      year: Number(form.year),
      month: monthIdx,
      spend_facebook: Number(form.spend_facebook) || 0,
      views_facebook: Number(form.views_facebook) || 0,
      views_tiktok: Number(form.views_tiktok) || 0,
      leads_facebook: Number(form.leads_facebook) || 0,
      leads_instagram: Number(form.leads_instagram) || 0,
      leads_tiktok: Number(form.leads_tiktok) || 0,
    };
    const { error } = isEditMode && editingEntry
      ? await onUpdate(editingEntry.id, input)
      : await onCreate(input);
    setSaving(false);
    if (error) setErr(error.message);
    else onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[540px] rounded-[22px] border border-[#e8e8ec] bg-white p-7"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.14)" }}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-[17px] tracking-[-0.02em]" style={{ fontWeight: 700, color: NAVY }}>
                  {isEditMode ? "Ndrysho të dhënat digjitale" : "Shto të dhëna digjitale"}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-black/40">
                  {isEditMode
                    ? "Përditëso hyrjen ekzistuese të marketingut digjital."
                    : "Nëse ka të dhëna ekzistuese për muajin e zgjedhur, ato do të përditësohen."}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-black/35 transition hover:bg-black/5 hover:text-black/60"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Viti</span>
                <CustomSelect
                  size="md"
                  options={[...YEAR_OPTIONS]}
                  value={form.year}
                  onChange={setCreatePeriodField("year")}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Muaji</span>
                <CustomSelect
                  size="md"
                  options={SQ_MONTHS}
                  value={form.month}
                  onChange={setCreatePeriodField("month")}
                  placeholder="Zgjidh muajin"
                />
              </label>
            </div>

            <SectionDivider label="Facebook" />
            <div className="mb-5 grid grid-cols-3 gap-3">
              <ModalNumberField label="Shpenzimi" value={form.spend_facebook} onChange={set("spend_facebook")} prefix="€" />
              <ModalNumberField label="Shikime" value={form.views_facebook} onChange={set("views_facebook")} />
              <ModalNumberField label="Kontakte" value={form.leads_facebook} onChange={set("leads_facebook")} />
            </div>

            <SectionDivider label="TikTok" />
            <div className="mb-5 grid grid-cols-2 gap-3">
              <ModalNumberField label="Shikime" value={form.views_tiktok} onChange={set("views_tiktok")} />
              <ModalNumberField label="Kontakte" value={form.leads_tiktok} onChange={set("leads_tiktok")} />
            </div>

            <SectionDivider label="Instagram" />
            <div className="mb-6">
              <ModalNumberField label="Kontakte" value={form.leads_instagram} onChange={set("leads_instagram")} />
            </div>

            {err && <p className="mb-4 text-[12px] text-[#b14b4b]">{err}</p>}

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={onClose}
                className="h-10 rounded-[11px] border border-black/10 px-4 text-[13px] text-black/50 transition hover:bg-black/[0.02]"
              >
                Anulo
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-[11px] px-5 text-[13px] text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: NAVY }}
              >
                <Save size={14} strokeWidth={2} />
                {saving ? "Duke ruajtur..." : isEditMode ? "Përditëso" : "Ruaj të dhënat"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface OfflineFormState {
  channel: string;
  description: string;
  amount: string;
  period_type: string;
  year: string;
  month: string;
  date: string;
}

const emptyOffline = (year: number): OfflineFormState => ({
  channel: "",
  description: "",
  amount: "",
  period_type: "Mujore",
  year: String(year),
  month: "",
  date: "",
});

const offlineFormFromEntry = (entry: OfflineEntry): OfflineFormState => ({
  channel: entry.channel,
  description: entry.description ?? "",
  amount: String(entry.amount ?? ""),
  period_type: entry.period_type,
  year: String(entry.year),
  month: entry.month ? SQ_MONTHS[entry.month - 1] ?? "" : "",
  date: typeof entry.date === "string" ? entry.date.slice(0, 10) : "",
});

function getInitialOfflineForm(
  editingEntry: OfflineEntry | null,
  defaultYear: number,
): OfflineFormState {
  return editingEntry ? offlineFormFromEntry(editingEntry) : emptyOffline(defaultYear);
}

function OfflineModal({
  open,
  onClose,
  onCreate,
  onUpdate,
  defaultYear,
  editingEntry,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: OfflineInput) => Promise<{ error: Error | null }>;
  onUpdate: (id: string, input: OfflineInput) => Promise<{ error: Error | null }>;
  defaultYear: number;
  editingEntry: OfflineEntry | null;
}) {
  const [form, setForm] = useState<OfflineFormState>(() =>
    getInitialOfflineForm(editingEntry, defaultYear),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEditMode = !!editingEntry;

  const set = (key: keyof OfflineFormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.channel) {
      setErr("Zgjidh kanalin.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setErr("Shuma duhet të jetë më e madhe se 0.");
      return;
    }
    if (!form.year) {
      setErr("Fut vitin.");
      return;
    }
    if (!form.date) {
      setErr("Zgjidh datën.");
      return;
    }
    if (form.period_type === "Mujore" && !form.month) {
      setErr("Zgjidh muajin.");
      return;
    }

    setSaving(true);
    setErr(null);
    const monthIdx = form.period_type === "Mujore" ? SQ_MONTHS.indexOf(form.month) + 1 : null;
    const input = {
      channel: form.channel,
      description: form.description || null,
      amount: Number(form.amount),
      period_type: form.period_type as "Mujore" | "Vjetore",
      year: Number(form.year),
      month: monthIdx,
      date: form.date,
    };
    const { error } = isEditMode && editingEntry
      ? await onUpdate(editingEntry.id, input)
      : await onCreate(input);
    setSaving(false);
    if (error) setErr(error.message);
    else onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[500px] rounded-[22px] border border-[#e8e8ec] bg-white p-7"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.14)" }}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-[17px] tracking-[-0.02em]" style={{ fontWeight: 700, color: NAVY }}>
                  {isEditMode ? "Ndrysho të dhënat offline" : "Shto të dhëna offline"}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-black/40">
                  {isEditMode
                    ? "Përditëso hyrjen ekzistuese të marketingut offline."
                    : "Regjistro një shpenzim marketingu jashtë rrjetit."}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-black/35 transition hover:bg-black/5 hover:text-black/60"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Kanali</span>
                <CustomSelect size="md" options={[...CHANNELS]} value={form.channel} onChange={set("channel")} placeholder="Zgjidh kanalin" />
              </label>

              <ModalTextField label="Përshkrimi (opsional)" value={form.description} onChange={set("description")} placeholder="p.sh. Billboardi tek qendra tregtare" />

              <ModalNumberField label="Shuma (€)" value={form.amount} onChange={set("amount")} prefix="€" placeholder="0" />

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Periudha</span>
                <CustomSelect size="md" options={["Mujore", "Vjetore"]} value={form.period_type} onChange={set("period_type")} />
              </label>

              <div className={`grid gap-3 ${form.period_type === "Mujore" ? "grid-cols-2" : "grid-cols-1"}`}>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Viti</span>
                  <CustomSelect size="md" options={[...YEAR_OPTIONS]} value={form.year} onChange={set("year")} />
                </label>
                {form.period_type === "Mujore" && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Muaji</span>
                    <CustomSelect size="md" options={SQ_MONTHS} value={form.month} onChange={set("month")} placeholder="Zgjidh muajin" />
                  </label>
                )}
              </div>

              <ModalDateField label="Data" value={form.date} onChange={set("date")} />
            </div>

            {err && <p className="mt-4 text-[12px] text-[#b14b4b]">{err}</p>}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={onClose}
                className="h-10 rounded-[11px] border border-black/10 px-4 text-[13px] text-black/50 transition hover:bg-black/[0.02]"
              >
                Anulo
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-[11px] px-5 text-[13px] text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: NAVY }}
              >
                <Plus size={14} strokeWidth={2.2} />
                {saving ? "Duke ruajtur..." : isEditMode ? "Përditëso" : "Shto të dhënat"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  deleting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[360px] rounded-[20px] border border-[#e8e8ec] bg-white p-6"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.14)" }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#fbeeee]">
              <AlertTriangle size={18} style={{ color: "#b14b4b" }} strokeWidth={2} />
            </div>
            <h3 className="text-[15px] text-black/88" style={{ fontWeight: 700 }}>
              Konfirmo fshirjen
            </h3>
            <p className="mt-1.5 text-[13px] text-black/45">
              A jeni i sigurt që dëshironi ta fshini këtë hyrje?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={onClose}
                className="h-9 rounded-[10px] border border-black/10 px-4 text-[13px] text-black/50 transition hover:bg-black/[0.02]"
              >
                Anulo
              </button>
              <button
                onClick={onConfirm}
                disabled={deleting}
                className="h-9 rounded-[10px] px-4 text-[13px] text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#b14b4b" }}
              >
                {deleting ? "Duke fshirë..." : "Fshi"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function MarketingDataWorkspace() {
  const {
    marketingData,
    offlineEntries,
    loading,
    saveMonthlyData,
    updateDigitalEntry,
    createOfflineEntry,
    updateOfflineEntry,
    deleteDigitalEntry,
    deleteOfflineEntry,
  } = useMarketing();

  const now = new Date();
  const [digitalOpen, setDigitalOpen] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [editingDigitalEntry, setEditingDigitalEntry] = useState<MarketingRow | null>(null);
  const [editingOfflineEntry, setEditingOfflineEntry] = useState<OfflineEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "digital" | "offline" } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterYear, setFilterYear] = useState(
    YEARS.includes(now.getFullYear()) ? now.getFullYear() : YEARS[0]
  );
  const [filterMonth, setFilterMonth] = useState<number | "all">(now.getMonth() + 1);
  const [offlineFilter, setOfflineFilter] = useState<OfflineFilter>("Të gjitha");

  const existingData = useMemo(() => {
    const map: Record<number, Record<number, MarketingRow>> = {};
    for (const row of marketingData) {
      if (!map[row.year]) map[row.year] = {};
      map[row.year][row.month] = row;
    }
    return map;
  }, [marketingData]);

  const filteredDigitalEntries = useMemo(
    () =>
      marketingData.filter((entry) => {
        if (entry.year !== filterYear) return false;
        if (filterMonth !== "all" && entry.month !== filterMonth) return false;
        return true;
      }),
    [marketingData, filterYear, filterMonth]
  );

  const filteredOffline = useMemo(() => {
    if (offlineFilter === "Të gjitha") return offlineEntries;
    return offlineEntries.filter((entry) => entry.period_type === offlineFilter);
  }, [offlineEntries, offlineFilter]);

  const defaultModalMonth =
    filterMonth === "all" ? SQ_MONTHS[now.getMonth()] : SQ_MONTHS[(filterMonth as number) - 1];

  const digitalModalKey = editingDigitalEntry
    ? `digital-edit-${editingDigitalEntry.id}`
    : digitalOpen
      ? `digital-create-${filterYear}-${defaultModalMonth}`
      : "digital-closed";
  const offlineModalKey = editingOfflineEntry
    ? `offline-edit-${editingOfflineEntry.id}`
    : offlineOpen
      ? `offline-create-${filterYear}`
      : "offline-closed";

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = deleteTarget.type === "digital"
      ? await deleteDigitalEntry(deleteTarget.id)
      : await deleteOfflineEntry(deleteTarget.id);
    setDeleting(false);
    if (!result.error) setDeleteTarget(null);
  };

  const openCreateDigital = () => {
    setEditingDigitalEntry(null);
    setDigitalOpen(true);
  };

  const closeDigitalModal = () => {
    setDigitalOpen(false);
    setEditingDigitalEntry(null);
  };

  const openCreateOffline = () => {
    setEditingOfflineEntry(null);
    setOfflineOpen(true);
  };

  const closeOfflineModal = () => {
    setOfflineOpen(false);
    setEditingOfflineEntry(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-black/90">Marketingu</h2>
          <p className="mt-1 text-[13px] text-black/45">
            Shto, korrigjo dhe menaxho hyrjet digjitale dhe offline të marketingut.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openCreateOffline}
            className="flex h-[38px] items-center gap-2 rounded-[11px] border border-[#003883]/30 px-4 text-[13px] transition hover:bg-[#003883]/05"
            style={{ color: NAVY }}
          >
            <Plus size={14} strokeWidth={2.2} />
            Shto të dhëna offline
          </button>
          <button
            onClick={openCreateDigital}
            className="flex h-[38px] items-center gap-2 rounded-[11px] px-4 text-[13px] text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Plus size={14} strokeWidth={2.2} />
            Shto të dhëna digjitale
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-[18px] border border-[#e8e8ec] bg-white p-4">
        <label className="flex min-w-[110px] flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Viti</span>
          <CustomSelect size="sm" options={[...YEAR_OPTIONS]} value={String(filterYear)} onChange={(v) => setFilterYear(Number(v))} />
        </label>
        <label className="flex min-w-[170px] flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Muaji</span>
          <CustomSelect
            size="sm"
            options={SQ_MONTHS}
            value={filterMonth === "all" ? "" : SQ_MONTHS[(filterMonth as number) - 1]}
            placeholder="Të gjithë muajt"
            onChange={(v) => setFilterMonth(v === "" ? "all" : SQ_MONTHS.indexOf(v) + 1)}
          />
        </label>
      </div>

      <div className="rounded-[22px] border border-[#e8e8ec] bg-white p-6" style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
        <div className="mb-4">
          <p className="text-[13px] font-semibold text-black/70">Regjistri i të dhënave digjitale</p>
          <p className="mt-0.5 text-[12px] text-black/35">
            Hyrjet mujore të marketingut digjital për vitin dhe muajin e zgjedhur
          </p>
        </div>

        {loading ? (
          <div className="rounded-[16px] border border-dashed border-[#e8e8ec] py-10 text-center text-[12px] text-black/35">
            Duke ngarkuar të dhënat...
          </div>
        ) : filteredDigitalEntries.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#e8e8ec] py-10 text-center">
            <p className="text-[13.5px] text-black/30" style={{ fontWeight: 500 }}>
                Nuk ka të dhëna për t’u shfaqur.
              </p>
              <p className="mt-1 text-[12px] text-black/22">
                Shtyp "Shto të dhëna digjitale" për të regjistruar hyrjet mujore.
              </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-[#e8e8ec] bg-white">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[#f0f0f2] bg-[#f9f9fb]">
                  {["Periudha", "Shpenzimi", "Shikime", "Kontaktet", "Veprime"].map((h, i) => (
                    <th
                      key={h}
                      className={`py-3 text-[11px] font-semibold uppercase tracking-wide text-black/35 ${
                        i === 1 || i === 2 || i === 3 ? "px-3 text-right" :
                        i === 4 ? "pl-3 pr-5 text-center" :
                        "pl-6 pr-3 text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDigitalEntries.map((entry) => {
                  const views = entry.views_facebook + entry.views_tiktok;
                  const contacts = entry.leads_facebook + entry.leads_instagram + entry.leads_tiktok;

                  return (
                    <tr key={entry.id} className="border-t border-[#f0f0f2] transition hover:bg-[#fafafc]">
                      <td className="py-3 pl-6 pr-3 text-black/60">{fmtMonthYear(entry.month, entry.year)}</td>
                      <td className="px-3 py-3 text-right text-black/80" style={{ fontWeight: 600 }}>
                        {fmtEur(entry.spend_facebook)}
                      </td>
                      <td className="px-3 py-3 text-right text-black/60">{fmtNum(views)}</td>
                      <td className="px-3 py-3 text-right text-black/60">{fmtNum(contacts)}</td>
                      <td className="py-3 pl-3 pr-5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setDigitalOpen(false); setEditingDigitalEntry(entry); }}
                            className="inline-flex items-center gap-1 rounded-[8px] border border-[#d8e1f0] bg-white px-2.5 py-1 text-[11px] text-[#003883] transition hover:bg-[#f5f8fd]"
                          >
                            <Pencil size={11} strokeWidth={2} /> Edito
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: entry.id, type: "digital" })}
                            className="inline-flex items-center gap-1 rounded-[8px] border border-red-100 bg-white px-2.5 py-1 text-[11px] text-red-400 transition hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash2 size={11} strokeWidth={1.9} /> Fshi
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-[22px] border border-[#e8e8ec] bg-white p-6" style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
          <p className="text-[13px] font-semibold text-black/70">Regjistri i të dhënave offline</p>
          <p className="mt-0.5 text-[12px] text-black/35">
              Hyrjet operative për billboard, radio, evente dhe kanale të tjera
          </p>
          </div>
          <div className="flex items-center gap-1 rounded-[12px] border border-[#e8e8ec] bg-white p-1">
            {OFFLINE_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setOfflineFilter(filter)}
                className="rounded-[9px] px-3 py-1.5 text-[12px] transition"
                style={{
                  backgroundColor: offlineFilter === filter ? "#eaf0fa" : "transparent",
                  color: offlineFilter === filter ? NAVY : "rgba(0,0,0,0.45)",
                  fontWeight: offlineFilter === filter ? 600 : 400,
                }}
              >
                {filter === "Të gjitha" ? "Të gjitha" : filter}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-[16px] border border-dashed border-[#e8e8ec] py-10 text-center text-[12px] text-black/35">
            Duke ngarkuar të dhënat...
          </div>
        ) : filteredOffline.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#e8e8ec] py-10 text-center">
            <p className="text-[13.5px] text-black/30" style={{ fontWeight: 500 }}>
                Nuk ka të dhëna për t’u shfaqur.
              </p>
              <p className="mt-1 text-[12px] text-black/22">
                Shtyp "Shto të dhëna offline" për të regjistruar shpenzimet jashtë rrjetit.
              </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-[#e8e8ec] bg-white">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[#f0f0f2] bg-[#f9f9fb]">
                  {["Kanali", "Përshkrimi", "Shuma", "Periudha", "Data", "Veprime"].map((h, i) => (
                    <th
                      key={h}
                      className={`py-3 text-[11px] font-semibold uppercase tracking-wide text-black/35 ${
                        i === 0 ? "pl-6 pr-3 text-left" :
                        i === 2 ? "px-3 text-right" :
                        i === 5 ? "pl-3 pr-5 text-center" :
                        "px-3 text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOffline.map((entry) => {
                  const chStyle = CHANNEL_STYLE[entry.channel] ?? CHANNEL_STYLE["Tjetër"];
                  const periudha = entry.period_type === "Mujore" && entry.month !== null
                    ? `${SQ_MONTHS[entry.month - 1]} ${entry.year}`
                    : `${entry.year} · Vjetore`;

                  return (
                    <tr key={entry.id} className="border-t border-[#f0f0f2] transition hover:bg-[#fafafc]">
                      <td className="py-3 pl-6 pr-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px]"
                          style={{ background: chStyle.bg, color: chStyle.color, fontWeight: 600 }}
                        >
                          {entry.channel}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-black/50">
                        {entry.description || <span className="text-black/22">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-black/80" style={{ fontWeight: 600 }}>
                        {fmtEur(entry.amount)}
                      </td>
                      <td className="px-3 py-3 text-black/50">{periudha}</td>
                      <td className="px-3 py-3 text-black/40">{fmtDate(entry.date)}</td>
                      <td className="py-3 pl-3 pr-5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setOfflineOpen(false); setEditingOfflineEntry(entry); }}
                            className="inline-flex items-center gap-1 rounded-[8px] border border-[#d8e1f0] bg-white px-2.5 py-1 text-[11px] text-[#003883] transition hover:bg-[#f5f8fd]"
                          >
                            <Pencil size={11} strokeWidth={2} /> Edito
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: entry.id, type: "offline" })}
                            className="inline-flex items-center gap-1 rounded-[8px] border border-red-100 bg-white px-2.5 py-1 text-[11px] text-red-400 transition hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash2 size={11} strokeWidth={1.9} /> Fshi
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DigitalModal
        key={digitalModalKey}
        open={digitalOpen || !!editingDigitalEntry}
        onClose={closeDigitalModal}
        onCreate={saveMonthlyData}
        onUpdate={updateDigitalEntry}
        defaultYear={filterYear}
        defaultMonth={defaultModalMonth}
        existingData={existingData}
        editingEntry={editingDigitalEntry}
      />
      <OfflineModal
        key={offlineModalKey}
        open={offlineOpen || !!editingOfflineEntry}
        onClose={closeOfflineModal}
        onCreate={createOfflineEntry}
        onUpdate={updateOfflineEntry}
        defaultYear={filterYear}
        editingEntry={editingOfflineEntry}
      />
      <DeleteConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
