import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Save, Copy, Trash2, AlertCircle } from "lucide-react";
import { CustomSelect } from "./components/CustomSelect";
import { useUnits } from "./hooks/useUnits";
import type { CreateUnitInput, Unit, OwnerCategory, UnitStatus, Block, Level, UnitType } from "./hooks/useUnits";

const ACCENT = "#003883";

const BLOCKS: Block[] = ["Blloku A", "Blloku B", "Blloku C"];
const TYPES: UnitType[] = ["Banesë", "Lokal", "Garazhë"];
const LEVELS: Level[] = ["Garazhë", "Përdhesa", "Kati 1", "Kati 2", "Kati 3", "Kati 4", "Kati 5", "Kati 6", "Penthouse"];
const STATUSES: UnitStatus[] = ["Në dispozicion", "E rezervuar", "E shitur"];
const OWNER_CATEGORIES: OwnerCategory[] = ["Investitor", "Pronarët e tokës", "Kompani ndërtimore"];

const OWNER_NAMES: Record<OwnerCategory, string[]> = {
  "Investitor": ["UF Partners"],
  "Pronarët e tokës": ["Filan Selmani", "Besian Selmani", "Doktor Selmani", "Fistek Selmani"],
  "Kompani ndërtimore": ["Ndertimi Company", "Molerat Company", "Rryma Company"],
};

const OWNER_COLORS: Record<OwnerCategory, { color: string; bg: string; border: string }> = {
  "Investitor": { color: "#003883", bg: "#EAF0FA", border: "#00388322" },
  "Pronarët e tokës": { color: "#335792", bg: "#F2F5FA", border: "#33579222" },
  "Kompani ndërtimore": { color: "#5D7298", bg: "#F5F7FB", border: "#5D729822" },
};

const STATUS_COLORS: Record<UnitStatus, { color: string; bg: string }> = {
  "Në dispozicion": { color: "#3c7a57", bg: "#edf7f1" },
  "E rezervuar": { color: "#b0892f", bg: "#fff8e8" },
  "E shitur": { color: "#b14b4b", bg: "#fbeeee" },
};

const DEFAULT_OWNER_CATEGORY: OwnerCategory = "Investitor";
const FALLBACK_STATUS_STYLE = { color: "rgba(0,0,0,0.45)", bg: "#f2f2f4" };

function getOwnerOptions(ownerCategory: unknown): string[] {
  if (typeof ownerCategory !== "string") return OWNER_NAMES[DEFAULT_OWNER_CATEGORY];
  return OWNER_NAMES[ownerCategory as OwnerCategory] ?? OWNER_NAMES[DEFAULT_OWNER_CATEGORY];
}

function getStatusStyle(status: unknown): { color: string; bg: string } {
  if (typeof status !== "string") return FALLBACK_STATUS_STYLE;
  return STATUS_COLORS[status as UnitStatus] ?? FALLBACK_STATUS_STYLE;
}

type DraftUnit = Partial<CreateUnitInput> & { _key: string };

function emptyDraft(ownerCategory: OwnerCategory): DraftUnit {
  return {
    _key: crypto.randomUUID(),
    owner_category: ownerCategory,
    owner_name: OWNER_NAMES[ownerCategory][0],
    status: "Në dispozicion",
    block: undefined,
    type: undefined,
    level: undefined,
    size: undefined,
    price: undefined,
    unit_id: "",
    reservation_expires_at: null,
    sale_date: null,
    notes: "",
  };
}

function SelectField({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">{label}</span>
      <CustomSelect value={value ?? ""} onChange={onChange} options={options} placeholder={placeholder} size="md" />
    </div>
  );
}

function NumberField({ label, value, onChange, placeholder }: {
  label: string; value: number | undefined; onChange: (v: number) => void; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">{label}</span>
      <input type="number" value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))}
        placeholder={placeholder ?? ""}
        className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]" />
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">{label}</span>
      <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]" />
    </label>
  );
}

function DateField({ label, value, onChange }: {
  label: string; value: string | null | undefined; onChange: (v: string | null) => void;
}) {
  const normalizedValue = typeof value === "string" ? value.slice(0, 10) : "";

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">{label}</span>
      <input
        type="date"
        value={normalizedValue}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
      />
    </label>
  );
}

function isDraftValid(d: DraftUnit): boolean {
  const hasCoreFields = !!(d.unit_id && d.block && d.type && d.level && d.size && d.price && d.owner_name && d.status);
  if (!hasCoreFields) return false;

  if (d.status === "E shitur" && !d.sale_date) return false;
  if (d.status === "E rezervuar" && !d.reservation_expires_at) return false;

  return true;
}

function UnitForm({ draft, onChange, onRemove, onDuplicate, index }: {
  draft: DraftUnit; onChange: (d: DraftUnit) => void;
  onRemove: () => void; onDuplicate: () => void; index: number;
}) {
  const [pricePerM2, setPricePerM2] = useState<number | undefined>(undefined);

  const set = (field: keyof DraftUnit, value: unknown) => onChange({ ...draft, [field]: value });

  const handleSizeChange = (v: number) => {
    onChange({ ...draft, size: v, price: pricePerM2 && v ? Math.round(v * pricePerM2) : draft.price });
  };

  const handlePricePerM2Change = (v: number) => {
    setPricePerM2(v);
    if (draft.size && v) onChange({ ...draft, price: Math.round(draft.size * v) });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
      className="rounded-[14px] border border-black/[0.07] bg-[#fafafa] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-black/40">Njësia #{index + 1}</span>
        <div className="flex items-center gap-2">
          <button onClick={onDuplicate}
            className="flex items-center gap-1.5 rounded-[8px] border border-black/08 bg-white px-2.5 py-1 text-[11px] text-black/40 transition hover:text-black/70">
            <Copy size={11} /> Duplikim
          </button>
          <button onClick={onRemove}
            className="flex items-center gap-1.5 rounded-[8px] border border-red-100 bg-white px-2.5 py-1 text-[11px] text-red-400 transition hover:bg-red-50">
            <Trash2 size={11} /> Fshi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TextField label="ID e njësisë" value={draft.unit_id ?? ""} onChange={(v) => set("unit_id", v)} placeholder="p.sh. BA-01" />
        <SelectField label="Blloku" value={draft.block ?? ""} onChange={(v) => set("block", v)} options={BLOCKS} placeholder="Zgjidh bllokun" />
        <SelectField label="Lloji" value={draft.type ?? ""} onChange={(v) => set("type", v)} options={TYPES} placeholder="Zgjidh llojin" />
        <SelectField label="Niveli" value={draft.level ?? ""} onChange={(v) => set("level", v)} options={LEVELS} placeholder="Zgjidh nivelin" />
        <NumberField label="Sipërfaqja (m²)" value={draft.size} onChange={handleSizeChange} placeholder="p.sh. 90" />
        <NumberField label="Çmimi për m² (€/m²)" value={pricePerM2} onChange={handlePricePerM2Change} placeholder="p.sh. 2000" />
        <NumberField label="Çmimi (€)" value={draft.price} onChange={(v) => set("price", v)} placeholder="p.sh. 180000" />
        <SelectField label="Pronari" value={draft.owner_name ?? ""}
          onChange={(v) => set("owner_name", v)}
          options={getOwnerOptions(draft.owner_category)}
          placeholder="Zgjidh pronarin" />
        <SelectField label="Statusi" value={draft.status ?? ""}
          onChange={(v) => set("status", v as UnitStatus)}
          options={STATUSES} placeholder="Zgjidh statusin" />
        {draft.status === "E rezervuar" && (
          <DateField
            label="Skadon më"
            value={draft.reservation_expires_at}
            onChange={(v) => set("reservation_expires_at", v)}
          />
        )}
        {draft.status === "E shitur" && (
          <DateField
            label="Data e shitjes"
            value={draft.sale_date}
            onChange={(v) => set("sale_date", v)}
          />
        )}
        <label className="col-span-3 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Shënime</span>
          <input type="text" value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)}
            placeholder="Shënime opsionale..."
            className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]" />
        </label>
      </div>
    </motion.div>
  );
}

function DeleteModal({ unit, onClose, onConfirm }: {
  unit: Unit; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-[420px] rounded-[20px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#fbeeee]">
          <Trash2 size={18} style={{ color: "#b14b4b" }} />
        </div>
        <p className="mt-4 text-[16px] font-semibold tracking-[-0.02em] text-black/90">
          Fshi njësinën
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-black/45">
          A jeni i sigurt që doni të fshini njësinë{" "}
          <span className="font-semibold text-black/70">{unit.unit_id}</span>?
          Ky veprim nuk mund të kthehet.
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="rounded-[11px] border border-black/10 px-4 py-2 text-[13px] text-black/60 transition hover:bg-black/[0.02]"
          >
            Anulo
          </button>
          <button
            onClick={onConfirm}
            className="rounded-[11px] px-4 py-2 text-[13px] text-white transition hover:opacity-90"
            style={{ backgroundColor: "#b14b4b" }}
          >
            Fshi njësinën
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EditModal({ unit, onClose, onSave }: {
  unit: Unit; onClose: () => void;
  onSave: (changes: Partial<CreateUnitInput>, reason: string) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<CreateUnitInput>>({
    unit_id: unit.unit_id,
    block: unit.block,
    type: unit.type,
    level: unit.level,
    size: unit.size,
    price: unit.price,
    status: unit.status,
    owner_category: unit.owner_category,
    owner_name: unit.owner_name,
    reservation_expires_at: unit.reservation_expires_at,
    sale_date: unit.sale_date,
    notes: unit.notes ?? "",
  });
  const [pricePerM2, setPricePerM2] = useState<number | undefined>(
    unit.size && unit.price ? Math.round(unit.price / unit.size) : undefined
  );
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof CreateUnitInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSizeChange = (v: number) => {
    setForm((prev) => ({ ...prev, size: v, price: pricePerM2 && v ? Math.round(v * pricePerM2) : prev.price }));
  };

  const handlePricePerM2Change = (v: number) => {
    setPricePerM2(v);
    setForm((prev) => ({ ...prev, price: prev.size && v ? Math.round(prev.size * v) : prev.price }));
  };

  const handleSave = async () => {
    if (!reason.trim()) { setError("Ju lutem shkruani arsyen e ndryshimit."); return; }
    setSaving(true);
    await onSave(form, reason.trim());
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-[640px] rounded-[20px] bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <p className="text-[16px] font-semibold tracking-[-0.02em] text-black/90">Ndrysho njësinë</p>
          <p className="mt-0.5 text-[12px] text-black/40">{unit.unit_id} · {unit.block}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <TextField label="ID e njësisë" value={form.unit_id ?? ""} onChange={(v) => set("unit_id", v)} />
          <SelectField label="Blloku" value={form.block ?? ""} onChange={(v) => set("block", v as Block)} options={BLOCKS} placeholder="Zgjidh" />
          <SelectField label="Lloji" value={form.type ?? ""} onChange={(v) => set("type", v as UnitType)} options={TYPES} placeholder="Zgjidh" />
          <SelectField label="Niveli" value={form.level ?? ""} onChange={(v) => set("level", v as Level)} options={LEVELS} placeholder="Zgjidh" />
          <NumberField label="Sipërfaqja (m²)" value={form.size} onChange={handleSizeChange} />
          <NumberField label="Çmimi për m² (€/m²)" value={pricePerM2} onChange={handlePricePerM2Change} placeholder="p.sh. 2000" />
          <NumberField label="Çmimi (€)" value={form.price} onChange={(v) => set("price", v)} />
          <SelectField label="Kategoria" value={form.owner_category ?? ""}
            onChange={(v) => { set("owner_category", v as OwnerCategory); set("owner_name", getOwnerOptions(v)[0] ?? ""); }}
            options={OWNER_CATEGORIES} placeholder="Zgjidh" />
          <SelectField label="Pronari" value={form.owner_name ?? ""}
            onChange={(v) => set("owner_name", v)}
            options={getOwnerOptions(form.owner_category)}
            placeholder="Zgjidh" />
          <SelectField label="Statusi" value={form.status ?? ""}
            onChange={(v) => set("status", v as UnitStatus)}
            options={STATUSES} placeholder="Zgjidh" />
          {form.status === "E rezervuar" && (
            <DateField
              label="Skadon më"
              value={form.reservation_expires_at}
              onChange={(v) => set("reservation_expires_at", v)}
            />
          )}
          {form.status === "E shitur" && (
            <DateField
              label="Data e shitjes"
              value={form.sale_date}
              onChange={(v) => set("sale_date", v)}
            />
          )}
          <label className="col-span-3 flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">Shënime</span>
            <input type="text" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)}
              className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] outline-none transition focus:border-[#003883]/30" />
          </label>
        </div>

        <div className="mt-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Arsyeja e ndryshimit <span className="text-red-400">*</span>
            </span>
            <input type="text" value={reason}
              onChange={(e) => { setReason(e.target.value); setError(""); }}
              placeholder="p.sh. Klienti kërkoi ndryshim të sipërfaqes"
              className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]" />
          </label>
          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-red-500">
              <AlertCircle size={12} /> {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2.5">
          <button onClick={onClose}
            className="rounded-[11px] border border-black/10 px-4 py-2 text-[13px] text-black/60 transition hover:bg-black/[0.02]">
            Anulo
          </button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-[11px] px-4 py-2 text-[13px] text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}>
            {saving ? "Duke ruajtur..." : "Ruaj ndryshimet"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function DataInputPage() {
  const { units, createUnit, updateUnit, deleteUnit, fetchUnits } = useUnits();
  const [activeCategory, setActiveCategory] = useState<OwnerCategory>("Investitor");
  const [drafts, setDrafts] = useState<DraftUnit[]>([emptyDraft("Investitor")]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<Unit | null>(null);

  useEffect(() => {
    setDrafts([emptyDraft(activeCategory)]);
  }, [activeCategory]);

  const addDraft = () => setDrafts((prev) => [...prev, emptyDraft(activeCategory)]);

  const removeDraft = (key: string) =>
    setDrafts((prev) => prev.length === 1 ? prev : prev.filter((d) => d._key !== key));

  const duplicateDraft = (key: string) => {
    const idx = drafts.findIndex((d) => d._key === key);
    if (idx === -1) return;
    const clone = { ...drafts[idx], _key: crypto.randomUUID(), unit_id: "" };
    setDrafts((prev) => [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]);
  };

  const updateDraft = (key: string, updated: DraftUnit) =>
    setDrafts((prev) => prev.map((d) => d._key === key ? updated : d));

  const handleSave = async () => {
    console.log("handleSave: START");
    const valid = drafts.filter(isDraftValid);
    console.log("handleSave: valid drafts =", valid.length);
    if (valid.length === 0) { setSaveError("Plotëso të paktën një njësi të plotë."); return; }
    setSaving(true);
    setSaveError(null);
    let hasError = false;
    for (const d of valid) {
      // Remove the draft-only _key field — it is not a database column
      const { _key, ...input } = d;
      void _key;
      console.log("handleSave: sending to createUnit:", JSON.stringify(input));
      const result = await createUnit(input as CreateUnitInput);
      console.log("handleSave: createUnit returned:", JSON.stringify(result));
      if (result.error) { hasError = true; setSaveError(`Gabim: ${result.error}`); break; }
    }
    setSaving(false);
    if (hasError) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setDrafts([emptyDraft(activeCategory)]);
    fetchUnits();
  };

  const handleUpdate = async (changes: Partial<CreateUnitInput>, reason: string) => {
    if (!editUnit) return;
    await updateUnit(editUnit.id, changes, reason);
    fetchUnits();
  };

  const categoryUnits = units.filter((u) => u.owner_category === activeCategory);
  const c = OWNER_COLORS[activeCategory];

  return (
    <div className="flex-1 overflow-auto bg-[#f8f8fa]">
      {deleteUnitTarget && (
        <DeleteModal
          unit={deleteUnitTarget}
          onClose={() => setDeleteUnitTarget(null)}
          onConfirm={() => { deleteUnit(deleteUnitTarget.id); setDeleteUnitTarget(null); }}
        />
      )}
      {editUnit && (
        <EditModal unit={editUnit} onClose={() => setEditUnit(null)} onSave={handleUpdate} />
      )}

      <div className="mx-auto max-w-[1280px] px-10 py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }} className="mb-8">
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-black/90">Data Input</h1>
          <p className="mt-1 text-[13px] text-black/40">Shto dhe menaxho njësitë sipas kategorisë së pronësisë</p>
        </motion.div>

        {/* Category Tabs */}
        <div className="mb-6 inline-flex rounded-[16px] border border-[#e8e8ec] bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
          {OWNER_CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            const cc = OWNER_COLORS[cat];
            const count = units.filter((u) => u.owner_category === cat).length;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="relative flex items-center gap-2 rounded-[12px] px-5 py-2.5 text-[13px] transition-all duration-200"
                style={{
                  backgroundColor: active ? cc.bg : "transparent",
                  color: active ? cc.color : "rgba(0,0,0,0.45)",
                  fontWeight: active ? 600 : 450,
                }}>
                {cat}
                <span className="rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{
                    background: active ? cc.color : "#f0f0f2",
                    color: active ? "#fff" : "rgba(0,0,0,0.4)",
                    fontWeight: 600,
                  }}>
                  {count}
                </span>
                {active && (
                  <motion.span layoutId="cat-indicator" className="absolute inset-0 rounded-[12px]"
                    style={{ border: `1.5px solid ${cc.border}` }}
                    transition={{ duration: 0.18 }} />
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left — Add Units */}
          <div className="col-span-7">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-black/70">
                Shto njësi të reja —{" "}
                <span style={{ color: c.color }}>{activeCategory}</span>
              </p>
              <button onClick={addDraft}
                className="flex items-center gap-1.5 rounded-[10px] border border-black/10 bg-white px-3 py-1.5 text-[12px] text-black/60 transition hover:border-black/20 hover:text-black/80">
                <Plus size={13} /> Shto njësi
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {drafts.map((d, i) => (
                  <UnitForm key={d._key} draft={d} index={i}
                    onChange={(updated) => updateDraft(d._key, updated)}
                    onRemove={() => removeDraft(d._key)}
                    onDuplicate={() => duplicateDraft(d._key)} />
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 rounded-[11px] px-5 py-2.5 text-[13px] text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}>
                <Save size={14} />
                {saving ? "Duke ruajtur..." : `Ruaj ${drafts.filter(isDraftValid).length} njësi`}
              </button>

              {saved && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[12px] text-[#3c7a57]">
                  ✓ Njësitë u ruajtën me sukses
                </motion.span>
              )}
              {saveError && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-1 text-[12px] text-red-500">
                  <AlertCircle size={12} /> {saveError}
                </motion.span>
              )}
            </div>
          </div>

          {/* Right — Existing Units */}
          <div className="col-span-5">
            <p className="mb-3 text-[13px] font-semibold text-black/70">
              Njësitë ekzistuese
              <span className="ml-2 text-[11px] font-normal text-black/35">
                ({categoryUnits.length} gjithsej)
              </span>
            </p>

            <div className="flex max-h-[680px] flex-col gap-2 overflow-y-auto pr-1">
              {categoryUnits.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-black/10 py-10 text-center text-[12px] text-black/30">
                  Asnjë njësi ende për {activeCategory}
                </div>
              ) : (
                categoryUnits.map((u) => {
                  const sc = getStatusStyle(u.status);
                  return (
                    <div key={u.id}
                      className="rounded-[13px] border border-[#f0f0f2] bg-white p-3.5 transition hover:border-[#e0e0e8]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[13px] font-semibold text-black/80">{u.unit_id}</p>
                          <p className="mt-0.5 text-[11.5px] text-black/40">
                            {u.block} · {u.level} · {u.size} m²
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                            style={{ background: sc.bg, color: sc.color }}>
                            {u.status}
                          </span>
                          <button onClick={() => setEditUnit(u)}
                            className="rounded-[8px] border border-[#e8e8ec] bg-white px-2.5 py-1 text-[11px] text-black/40 transition hover:border-[#003883] hover:text-[#003883]">
                            Ndrysho
                          </button>
                          <button
                            onClick={() => setDeleteUnitTarget(u)}
                            className="rounded-[8px] border border-red-100 bg-white px-2.5 py-1 text-[11px] text-red-400 transition hover:bg-red-50 hover:border-red-300">
                            Fshi
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11.5px] text-black/50">{u.owner_name}</span>
                        <span className="text-[12px] font-semibold text-black/70">
                          €{u.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
