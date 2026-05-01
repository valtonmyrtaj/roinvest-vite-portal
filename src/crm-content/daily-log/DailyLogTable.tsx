import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { CreateDailyLogInput, DailyLogEntry } from "../../hooks/useCRM";
import { CustomSelect } from "../../components/CustomSelect";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { Card } from "../primitives";
import { CardSectionHeader } from "../../components/ui/CardSectionHeader";
import {
  TABULAR_HEADER_LABEL_CLASS,
  TABULAR_HEADER_ROW_CLASS,
} from "../../components/ui/tabularHeader";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { MONTH_LABELS, NAVY, TODAY_ISO, fmtDate, toDateOnly } from "../shared";
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

function isoForDay(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function DailyLogTable({
  loading,
  selectedMonth,
  selectedYear,
  yearOptions,
  filteredEntries,
  selectedEntryId,
  onMonthChange,
  onYearChange,
  onSelectEntry,
  onCreate,
  onUpdate,
  onDelete,
}: {
  loading: boolean;
  selectedMonth: number;
  selectedYear: number;
  yearOptions: string[];
  filteredEntries: DailyLogEntry[];
  selectedEntryId: string | null;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onSelectEntry: (id: string | null) => void;
  onCreate: (data: CreateDailyLogInput) => Promise<{ error?: string; data?: DailyLogEntry }>;
  onUpdate: (
    id: string,
    data: Partial<CreateDailyLogInput>,
  ) => Promise<{ error?: string; data?: DailyLogEntry }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
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

  const entriesByDate = new Map(
    filteredEntries.map((entry) => [toDateOnly(entry.date), entry]),
  );

  const calendarRows = Array.from(
    { length: getDaysInMonth(selectedYear, selectedMonth) },
    (_, index) => {
      const date = isoForDay(selectedYear, selectedMonth, index + 1);
      return {
        date,
        entry: entriesByDate.get(date) ?? null,
      };
    },
  );

  const beginCreateForDate = (date: string) => {
    setEditingId(null);
    setEditingDate(date);
    setEditDraft(emptyDraft(date));
    setSaveError("");
  };

  const handleSaveNew = async (rowDraft: DraftLogRow) => {
    setSavingNew(true);
    setSaveError("");
    const payload: CreateDailyLogInput = {
      date: toDateOnly(rowDraft.date),
      calls: rowDraft.calls,
      contacts: rowDraft.contacts,
      showings: rowDraft.showings,
      sales: rowDraft.sales,
      comments: rowDraft.comments || null,
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
      setEditingDate(null);
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
      setEditingDate(null);
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

  const thCls = `py-2.5 px-3 text-left ${TABULAR_HEADER_LABEL_CLASS}`;
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
        <Card className="p-0">
          <CardSectionHeader
            title="Regjistri ditor"
            subtitle={`${MONTH_LABELS[selectedMonth]} ${selectedYear}`}
            right={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="w-[132px]">
                  <CustomSelect
                    value={MONTH_LABELS[selectedMonth]}
                    onChange={(value) => {
                      const nextMonth = MONTH_LABELS.indexOf(value);
                      if (nextMonth >= 0) onMonthChange(nextMonth);
                    }}
                    options={MONTH_LABELS}
                    size="sm"
                  />
                </div>
                <div className="w-[118px]">
                  <CustomSelect
                    value={String(selectedYear)}
                    onChange={(value) => {
                      const nextYear = Number(value);
                      if (Number.isFinite(nextYear)) onYearChange(nextYear);
                    }}
                    options={yearOptions}
                    size="sm"
                  />
                </div>
              </div>
            }
          />

          {saveError && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-[12px] border border-red-100 bg-red-50/70 px-3 py-2 text-[12px] text-red-600">
              <AlertTriangle size={14} />
              <span>{saveError}</span>
            </div>
          )}

          <div className="mx-5 mb-5 mt-5 overflow-hidden rounded-[16px] border border-[#edf0f5] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f9ff_100%)] shadow-[0_8px_18px_rgba(0,56,131,0.025)]">
            {loading ? (
              <SkeletonRows rows={3} className="px-5 py-8" />
            ) : (
              <div className="max-h-[350px] overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 z-10">
                    <tr
                      className={`${TABULAR_HEADER_ROW_CLASS} !bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f9ff_100%)]`}
                    >
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
                      {calendarRows.map(({ date, entry }) => {
                      const isExistingEntry = Boolean(entry);
                      const isEditing = entry ? editingId === entry.id : editingDate === date;
                      const isSavingThisRow = entry ? savingEditId === entry.id : savingNew && editingDate === date;
                      const isHighlighted = entry ? highlightedEntryId === entry.id : false;
                      const isSelected = entry ? selectedEntryId === entry.id : false;
                      const rowKey = entry?.id ?? date;
                      const rowCalls = entry?.calls ?? 0;
                      const rowContacts = entry?.contacts ?? 0;
                      const rowShowings = entry?.showings ?? 0;
                      const rowSales = entry?.sales ?? 0;

                      return (
                        <motion.tr
                          key={rowKey}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            backgroundColor: isHighlighted
                              ? "rgba(234,240,250,0.65)"
                              : isSelected
                                ? "rgba(234,240,250,0.34)"
                                : !isExistingEntry
                                  ? "rgba(246,249,255,0.52)"
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
                          onClick={
                            isEditing
                              ? undefined
                              : entry
                                ? () => onSelectEntry(entry.id)
                                : () => beginCreateForDate(date)
                          }
                          className={`border-t border-[#f0f0f2] transition hover:bg-[#fafafc] ${isEditing ? "" : "cursor-pointer"}`}
                        >
                          {isEditing ? (
                            <>
                              <td className="py-2 pl-5 pr-2">
                                <DatePickerField
                                  value={editDraft.date}
                                  onChange={(next) => setEditDraft((prev) => ({ ...prev, date: next ?? "" }))}
                                  size="sm"
                                  required
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
                                  placeholder="Shënime operative, nëse duhen"
                                  className="h-9 w-full rounded-[9px] border border-black/10 bg-white px-2 text-[12px] text-black/70 outline-none focus:border-[#003883]/30"
                                />
                              </td>
                              <td className="py-2 pl-2 pr-5">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      entry
                                        ? handleSaveEdit(entry.id)
                                        : handleSaveNew(editDraft)
                                    }
                                    disabled={isSavingThisRow}
                                    className="rounded-[8px] px-3 py-1.5 text-[11px] text-white transition hover:opacity-90 disabled:opacity-60"
                                    style={{ backgroundColor: NAVY }}
                                  >
                                    {isSavingThisRow ? "..." : "Ruaj"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditingDate(null);
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
                                {fmtDate(date)}
                              </td>
                              <td className={`${tdCls} ${isExistingEntry ? "" : "text-black/[0.24]"}`}>{rowCalls}</td>
                              <td className={`${tdCls} ${isExistingEntry ? "" : "text-black/[0.24]"}`}>{rowContacts}</td>
                              <td className={`${tdCls} ${isExistingEntry ? "" : "text-black/[0.24]"}`}>{rowShowings}</td>
                              <td className={`${tdCls} ${isExistingEntry ? "" : "text-black/[0.24]"}`}>{rowSales}</td>
                              <td className={`${tdCls} text-left ${isExistingEntry ? "text-black/40" : "text-black/[0.24]"}`}>
                                {entry?.comments ?? "—"}
                              </td>
                              <td className="py-2 pl-2 pr-5">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (entry) {
                                        setEditingId(entry.id);
                                        setEditingDate(null);
                                        setEditDraft({
                                          date: entry.date,
                                          calls: entry.calls ?? 0,
                                          contacts: entry.contacts ?? 0,
                                          showings: entry.showings ?? 0,
                                          sales: entry.sales ?? 0,
                                          comments: entry.comments ?? "",
                                        });
                                      } else {
                                        beginCreateForDate(date);
                                      }
                                      setSaveError("");
                                    }}
                                    className="rounded-[8px] border border-[#e8e8ec] bg-white px-2.5 py-1 text-[11px] text-black/40 transition hover:border-[#003883] hover:text-[#003883]"
                                  >
                                    {entry ? "Ndrysho" : "Regjistro"}
                                  </button>
                                  {entry ? (
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setDeletingId(entry.id);
                                      }}
                                      className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-red-100 bg-white text-red-400 transition hover:bg-red-50"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </>
                          )}
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </>
  );
}
