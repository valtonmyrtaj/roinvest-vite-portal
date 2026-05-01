import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Plus, X } from "lucide-react";
import type { OwnerCategory, Unit } from "../hooks/useUnits";
import type {
  OwnerEntitiesByCategory,
  OwnerEntityRowsByCategory,
} from "../hooks/useOwnerEntities";
import type { OwnerEntityRow } from "../lib/api/ownerEntities";
import { formatContactPhone } from "../lib/phoneFormat";
import { FIELD_LABEL_CLASS } from "./fields";

const CONTACT_CATEGORIES: OwnerCategory[] = [
  "Pronarët e tokës",
  "Kompani ndërtimore",
];

type OwnerContactSavePayload = {
  category: OwnerCategory;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  notes: string | null;
};

type ContactRow = {
  name: string;
  unitCount: number;
  storedRow: OwnerEntityRow | null;
  contactPerson: string | null;
  phone: string | null;
  notes: string | null;
};

type DraftContact = {
  name: string;
  phone: string;
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function nameKey(value: string): string {
  return normalizeName(value).toLocaleLowerCase("sq");
}

function createEmptyDraft(): DraftContact {
  return { name: "", phone: "" };
}

function rowToDraft(row: ContactRow): DraftContact {
  return {
    name: row.name,
    phone: row.phone ?? "",
  };
}

function getCategoryCopy(category: OwnerCategory) {
  if (category === "Kompani ndërtimore") {
    return {
      entityLabel: "Kompania",
    };
  }

  return {
    entityLabel: "Pronari",
  };
}

export function OwnerContactsSection({
  units,
  ownerEntities,
  storedEntityRowsByCategory,
  onSave,
}: {
  units: Unit[];
  ownerEntities: OwnerEntitiesByCategory;
  storedEntityRowsByCategory: OwnerEntityRowsByCategory;
  onSave: (payload: OwnerContactSavePayload) => Promise<{ error?: string }>;
}) {
  const [activeCategory, setActiveCategory] =
    useState<OwnerCategory>("Pronarët e tokës");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftContact>(createEmptyDraft);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const copy = getCategoryCopy(activeCategory);

  const rows = useMemo<ContactRow[]>(() => {
    const counts = new Map<string, number>();
    units.forEach((unit) => {
      if (unit.owner_category !== activeCategory) return;
      const key = nameKey(unit.owner_name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const storedByName = new Map<string, OwnerEntityRow>();
    storedEntityRowsByCategory[activeCategory].forEach((row) => {
      storedByName.set(nameKey(row.name), row);
    });

    return ownerEntities[activeCategory]
      .map((name) => {
        const storedRow = storedByName.get(nameKey(name)) ?? null;
        return {
          name,
          unitCount: counts.get(nameKey(name)) ?? 0,
          storedRow,
          contactPerson: storedRow?.contact_person ?? null,
          phone: storedRow?.phone ?? null,
          notes: storedRow?.notes ?? null,
        };
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, "sq", { sensitivity: "base" }),
      );
  }, [activeCategory, ownerEntities, storedEntityRowsByCategory, units]);

  const selectedRow = useMemo(
    () =>
      editingName
        ? rows.find((row) => nameKey(row.name) === nameKey(editingName)) ?? null
        : null,
    [editingName, rows],
  );

  useEffect(() => {
    if (!dialogOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialogOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dialogOpen]);

  useEffect(() => {
    if (message?.type !== "success") return;

    const timeout = window.setTimeout(() => {
      setMessage((current) => (current?.type === "success" ? null : current));
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [message]);

  const changeCategory = (category: OwnerCategory) => {
    if (category === activeCategory) return;
    setActiveCategory(category);
    setEditingName(null);
    setDraft(createEmptyDraft());
    setDialogOpen(false);
    setMessage(null);
  };

  const startCreate = () => {
    setEditingName(null);
    setDraft(createEmptyDraft());
    setMessage(null);
    setDialogOpen(true);
  };

  const startEdit = (row: ContactRow) => {
    setEditingName(row.name);
    setDraft(rowToDraft(row));
    setMessage(null);
    setDialogOpen(true);
  };

  const submit = async () => {
    const name = normalizeName(draft.name);
    const phone = formatContactPhone(draft.phone);

    if (!name) {
      setMessage({ type: "error", text: "Shkruani emrin para ruajtjes." });
      return;
    }

    if (
      !selectedRow &&
      rows.some((row) => nameKey(row.name) === nameKey(name))
    ) {
      setMessage({ type: "error", text: "Ky entitet ekziston tashmë." });
      return;
    }

    setSaving(true);
    setMessage(null);

    const result = await onSave({
      category: activeCategory,
      name,
      contactPerson: selectedRow?.contactPerson ?? null,
      phone: phone || null,
      notes: selectedRow?.notes ?? null,
    });

    setSaving(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    setDialogOpen(false);
    setDraft({ name, phone });
    setEditingName(name);
    setMessage({ type: "success", text: "Kontakti u ruajt." });
  };

  return (
    <section className="overflow-hidden rounded-[20px] border border-black/[0.08] bg-white shadow-[0_16px_38px_rgba(16,24,40,0.04)]">
      <div className="border-b border-[#eef0f4] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f9ff_100%)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/30">
              Kontaktet e pronësisë
            </p>
            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#003883]">
              Pronarët dhe kompanitë ndërtimore
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[13px] bg-[#f6f7fa] p-1 shadow-[inset_0_0_0_1px_rgba(16,24,40,0.05)]">
              {CONTACT_CATEGORIES.map((category) => {
                const active = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => changeCategory(category)}
                    className={`rounded-[9px] px-3.5 py-2 text-[12px] font-semibold transition ${
                      active
                        ? "bg-white text-[#003883] shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
                        : "text-black/45 hover:text-black/65"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={startCreate}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#dfe7f5] bg-white px-3 text-[12px] font-semibold text-[#003883] shadow-[0_5px_12px_rgba(0,56,131,0.035)] transition hover:border-[#cbd9ef]"
            >
              <Plus size={13} /> I ri
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="overflow-hidden rounded-[14px] border border-[#edf0f5]">
          <div className="grid grid-cols-[minmax(180px,1fr)_minmax(132px,0.55fr)_72px] bg-[#fbfcfe] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/30">
            <span>{copy.entityLabel}</span>
            <span>Telefoni</span>
            <span className="text-right">Njësi</span>
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-black/38">
              Nuk ka kontakte në këtë kategori.
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {rows.map((row) => (
                <button
                  key={`${activeCategory}-${row.name}`}
                  type="button"
                  onClick={() => startEdit(row)}
                  className="grid w-full grid-cols-[minmax(180px,1fr)_minmax(132px,0.55fr)_72px] items-center px-4 py-3 text-left transition hover:bg-[#fbfcfe]"
                >
                  <span className="truncate text-[13px] font-semibold text-[#003883]">
                    {row.name}
                  </span>
                  <span className="truncate text-[12px] font-semibold text-black/56">
                    {row.phone || "—"}
                  </span>
                  <span className="text-right">
                    <span className="inline-flex min-w-8 justify-center rounded-full border border-[#edf0f5] bg-[#fbfcfe] px-2 py-1 text-[11px] font-semibold text-black/45">
                      {row.unitCount}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {message && (
          <div
            className={`mt-3 inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12px] ${
              message.type === "success"
                ? "border border-[#dcefe4] bg-[#f3fbf6] text-[#32764f]"
                : "border border-red-100 bg-red-50 text-red-500"
            }`}
          >
            {message.type === "success" ? <Check size={13} /> : <AlertCircle size={13} />}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {dialogOpen && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/24 px-4 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-[440px] overflow-hidden rounded-[20px] border border-black/[0.08] bg-white shadow-[0_28px_72px_rgba(15,23,42,0.22)]"
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-black/[0.06] px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/30">
                    {selectedRow ? "Ndrysho kontaktin" : "Kontakt i ri"}
                  </p>
                  <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#003883]">
                    {selectedRow ? selectedRow.name : activeCategory}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/42 transition hover:text-black/65"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 px-5 py-5">
                <label className="block">
                  <span className={FIELD_LABEL_CLASS}>{copy.entityLabel}</span>
                  <input
                    value={draft.name}
                    disabled={Boolean(selectedRow)}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="mt-1.5 h-10 w-full rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)] disabled:bg-black/[0.03] disabled:text-black/48"
                  />
                </label>

                <label className="block">
                  <span className={FIELD_LABEL_CLASS}>Telefoni</span>
                  <input
                    value={draft.phone}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    onBlur={() =>
                      setDraft((prev) => ({ ...prev, phone: formatContactPhone(prev.phone) }))
                    }
                    className="mt-1.5 h-10 w-full rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
                  />
                </label>

                {message?.type === "error" && (
                  <div className="flex items-center gap-2 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-500">
                    <AlertCircle size={13} />
                    <span>{message.text}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-black/[0.06] bg-[#fbfbfc] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="h-10 rounded-[11px] border border-black/[0.08] bg-white px-4 text-[13px] font-semibold text-black/50 transition hover:text-black/70"
                >
                  Anulo
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving}
                  className="h-10 rounded-[11px] bg-[#003883] px-5 text-[13px] font-semibold text-white transition hover:bg-[#003074] disabled:cursor-not-allowed disabled:bg-[#d8dde7] disabled:text-black/38"
                >
                  {saving ? "Duke ruajtur..." : "Ruaj"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
