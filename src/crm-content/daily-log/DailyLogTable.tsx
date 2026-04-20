import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import type { CreateDailyLogInput, DailyLogEntry } from "../../hooks/useCRM";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { Card } from "../primitives";
import { MONTH_LABELS, NAVY, SOFT_EASE, TODAY_ISO, fmtDate, toDateOnly } from "../shared";
import { SkeletonRows } from "../../components/SkeletonRows";

interface DraftLogRow {
  date: string;
  calls: number;
  contacts: number;
  showings: number;
  sales: number;
  comments: string;
}

function numericInput(
  value: number,
  onChange: (value: number) => void,
  className = "",
) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
      className={`h-9 w-full rounded-[9px] border border-black/10 bg-white px-2 text-center text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_2px_rgba(0,56,131,0.06)] ${className}`}
    />
  );
}

function emptyDraft(date = TODAY_ISO): DraftLogRow {
  return { date, calls: 0, contacts: 0, showings: 0, sales: 0, comments: "" };
}

export function DailyLogTable({
  loading,
  selectedMonth,
  selectedYear,
  filteredEntries,
  selectedEntryId,
  onSelectEntry,
  onCreate,
  onUpdate,
  onDelete,
}: {
  loading: boolean;
  selectedMonth: number;
  selectedYear: number;
  filteredEntries: DailyLogEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (id: string | null) => void;
  onCreate: (data: CreateDailyLogInput) => Promise<{ error?: string; data?: DailyLogEntry }>;
  onUpdate: (
    id: string,
    data: Partial<CreateDailyLogInput>,
  ) => Promise<{ error?: string; data?: DailyLogEntry }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
}) {
  const [addingRow, setAddingRow] = useState(false);
  const [draft, setDraft] = useState<DraftLogRow>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftLogRow>(emptyDraft());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingNew, setSavingNew] = useState(false);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightedEntryId) return;
    const timeout = window.setTimeout(() => setHighlightedEntryId(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [highlightedEntryId]);

  const handleSaveNew = async () => {
    setSavingNew(true);
    setSaveError("");
    const payload: CreateDailyLogInput = {
      date: toDateOnly(draft.date),
      calls: draft.calls,
      contacts: draft.contacts,
      showings: draft.showings,
      sales: draft.sales,
      comments: draft.comments || null,
    };

    try {
      const result = await onCreate(payload);
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      if (result.data?.id) {
        setHighlightedEntryId(result.data.id);
        onSelectEntry(result.data.id);
      }
      setAddingRow(false);
      setDraft(emptyDraft());
    } finally {
      setSavingNew(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    setSavingEditId(id);
    setSaveError("");
    const payload: Partial<CreateDailyLogInput> = {
      date: toDateOnly(editDraft.date),
      calls: editDraft.calls,
      contacts: editDraft.contacts,
      showings: editDraft.showings,
      sales: editDraft.sales,
      comments: editDraft.comments || null,
    };

    try {
      const result = await onUpdate(id, payload);
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      setEditingId(null);
      setHighlightedEntryId(id);
      onSelectEntry(id);
    } finally {
      setSavingEditId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    const result = await onDelete(deletingId);
    if (result.error) {
      setSaveError(result.error);
      return;
    }

    setDeletingId(null);
  };

  const thCls = "py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-black/35";
  const tdCls = "py-2.5 px-3 text-[13px] text-black/70 text-center";

  return (
    <>
      <AnimatePresence>
        {deletingId && (
          <ConfirmDeleteModal
            label="këtë hyrje"
            onClose={() => setDeletingId(null)}
            onConfirm={handleDeleteConfirm}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.38, ease: "easeOut" }}
      >
        {saveError && (
          <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-red-100 bg-red-50/70 px-3 py-2 text-[12px] text-red-600">
            <AlertTriangle size={14} />
            <span>{saveError}</span>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
              Regjistri ditor
            </p>
            <p className="mt-0.5 text-[12px] text-black/35">
              {MONTH_LABELS[selectedMonth]} {selectedYear} · {filteredEntries.length} ditë të regjistruara
            </p>
          </div>
          {!addingRow && (
            <button
              onClick={() => {
                setDraft(emptyDraft(TODAY_ISO));
                setAddingRow(true);
              }}
              className="flex h-[38px] items-center gap-2 rounded-[11px] px-4 text-[13px] font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: NAVY }}
            >
              <Plus size={14} strokeWidth={2.2} />
              Shto ditën
            </button>
          )}
        </div>

        <Card className="overflow-hidden p-0">
          {loading ? (
            <SkeletonRows rows={3} className="px-5 py-8" />
          ) : (
            <div className="max-h-[350px] overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 z-10 bg-[#f9f9fb]">
                  <tr>
                    <th className={`${thCls} pl-5 text-left`}>Data</th>
                    <th className={thCls}>Thirrje</th>
                    <th className={thCls}>Kontakte</th>
                    <th className={thCls}>Shfaqje</th>
                    <th className={thCls}>Shitje</th>
                    <th className={`${thCls} text-left`}>Komente</th>
                    <th className={`${thCls} pr-5`} />
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {addingRow && (
                      <motion.tr
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="border-t border-[#f0f0f2] bg-[#EAF0FA]/40"
                      >
                        <td className="py-2 pl-5 pr-2">
                          <input
                            type="date"
                            value={draft.date}
                            onChange={(event) => setDraft((prev) => ({ ...prev, date: event.target.value }))}
                            className="h-9 rounded-[9px] border border-black/10 bg-white px-2 text-[12px] text-black/70 outline-none focus:border-[#003883]/30"
                          />
                        </td>
                        <td className="px-2 py-2">
                          {numericInput(draft.calls, (value) => setDraft((prev) => ({ ...prev, calls: value })))}
                        </td>
                        <td className="px-2 py-2">
                          {numericInput(draft.contacts, (value) => setDraft((prev) => ({ ...prev, contacts: value })))}
                        </td>
                        <td className="px-2 py-2">
                          {numericInput(draft.showings, (value) => setDraft((prev) => ({ ...prev, showings: value })))}
                        </td>
                        <td className="px-2 py-2">
                          {numericInput(draft.sales, (value) => setDraft((prev) => ({ ...prev, sales: value })))}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={draft.comments}
                            onChange={(event) => setDraft((prev) => ({ ...prev, comments: event.target.value }))}
                            placeholder="Shënime..."
                            className="h-9 w-full rounded-[9px] border border-black/10 bg-white px-2 text-[12px] text-black/70 outline-none focus:border-[#003883]/30"
                          />
                        </td>
                        <td className="py-2 pl-2 pr-5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={handleSaveNew}
                              disabled={savingNew}
                              className="rounded-[8px] px-3 py-1.5 text-[11px] text-white transition hover:opacity-90 disabled:opacity-60"
                              style={{ backgroundColor: NAVY }}
                            >
                              {savingNew ? "..." : "Ruaj"}
                            </button>
                            <button
                              onClick={() => {
                                setAddingRow(false);
                                setDraft(emptyDraft());
                                setSaveError("");
                              }}
                              className="rounded-[8px] border border-black/10 px-2.5 py-1.5 text-[11px] text-black/50 transition hover:bg-black/[0.02]"
                            >
                              Anulo
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )}

                    {filteredEntries.length === 0 && !addingRow ? (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: SOFT_EASE }}
                      >
                        <td colSpan={7} className="py-10 text-center text-[12.5px] text-black/30">
                          Asnjë aktivitet i regjistruar
                        </td>
                      </motion.tr>
                    ) : (
                      filteredEntries.map((entry) => {
                        const isEditing = editingId === entry.id;
                        const isSavingThisRow = savingEditId === entry.id;
                        const isHighlighted = highlightedEntryId === entry.id;
                        const isSelected = selectedEntryId === entry.id;

                        return (
                          <motion.tr
                            key={entry.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              backgroundColor: isHighlighted
                                ? "rgba(234,240,250,0.65)"
                                : isSelected
                                  ? "rgba(234,240,250,0.34)"
                                  : "rgba(255,255,255,0)",
                              boxShadow:
                                isSelected || isHighlighted
                                  ? "inset 3px 0 0 #003883"
                                  : "inset 3px 0 0 transparent",
                            }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{
                              duration: 0.18,
                              ease: "easeOut",
                              backgroundColor: { duration: 0.15, ease: "easeOut" },
                              boxShadow: { duration: 0.15, ease: "easeOut" },
                            }}
                            onClick={isEditing ? undefined : () => onSelectEntry(entry.id)}
                            className={`border-t border-[#f0f0f2] transition hover:bg-[#fafafc] ${isEditing ? "" : "cursor-pointer"}`}
                          >
                            {isEditing ? (
                              <>
                                <td className="py-2 pl-5 pr-2">
                                  <input
                                    type="date"
                                    value={editDraft.date}
                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, date: event.target.value }))}
                                    className="h-9 rounded-[9px] border border-black/10 bg-white px-2 text-[12px] text-black/70 outline-none focus:border-[#003883]/30"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  {numericInput(editDraft.calls, (value) => setEditDraft((prev) => ({ ...prev, calls: value })))}
                                </td>
                                <td className="px-2 py-2">
                                  {numericInput(editDraft.contacts, (value) => setEditDraft((prev) => ({ ...prev, contacts: value })))}
                                </td>
                                <td className="px-2 py-2">
                                  {numericInput(editDraft.showings, (value) => setEditDraft((prev) => ({ ...prev, showings: value })))}
                                </td>
                                <td className="px-2 py-2">
                                  {numericInput(editDraft.sales, (value) => setEditDraft((prev) => ({ ...prev, sales: value })))}
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    value={editDraft.comments}
                                    onChange={(event) => setEditDraft((prev) => ({ ...prev, comments: event.target.value }))}
                                    placeholder="Shënime..."
                                    className="h-9 w-full rounded-[9px] border border-black/10 bg-white px-2 text-[12px] text-black/70 outline-none focus:border-[#003883]/30"
                                  />
                                </td>
                                <td className="py-2 pl-2 pr-5">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleSaveEdit(entry.id)}
                                      disabled={isSavingThisRow}
                                      className="rounded-[8px] px-3 py-1.5 text-[11px] text-white transition hover:opacity-90 disabled:opacity-60"
                                      style={{ backgroundColor: NAVY }}
                                    >
                                      {isSavingThisRow ? "..." : "Ruaj"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingId(null);
                                        setSaveError("");
                                      }}
                                      className="rounded-[8px] border border-black/10 px-2.5 py-1.5 text-[11px] text-black/50 transition hover:bg-black/[0.02]"
                                    >
                                      Anulo
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className={`${tdCls} pl-5 text-left font-medium text-black/60`}>
                                  {fmtDate(entry.date)}
                                </td>
                                <td className={tdCls}>{entry.calls ?? 0}</td>
                                <td className={tdCls}>{entry.contacts ?? 0}</td>
                                <td className={tdCls}>{entry.showings ?? 0}</td>
                                <td className={tdCls}>{entry.sales ?? 0}</td>
                                <td className={`${tdCls} text-left text-black/40`}>{entry.comments ?? "—"}</td>
                                <td className="py-2 pl-2 pr-5">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setEditingId(entry.id);
                                        setEditDraft({
                                          date: entry.date,
                                          calls: entry.calls ?? 0,
                                          contacts: entry.contacts ?? 0,
                                          showings: entry.showings ?? 0,
                                          sales: entry.sales ?? 0,
                                          comments: entry.comments ?? "",
                                        });
                                        setSaveError("");
                                      }}
                                      className="rounded-[8px] border border-[#e8e8ec] bg-white px-2.5 py-1 text-[11px] text-black/40 transition hover:border-[#003883] hover:text-[#003883]"
                                    >
                                      Ndrysho
                                    </button>
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setDeletingId(entry.id);
                                      }}
                                      className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-red-100 bg-white text-red-400 transition hover:bg-red-50"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </>
  );
}
