import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { NAVY } from "./shared";

/**
 * "Shto këst" card — the collapsed add-installment form. Owns every
 * scrap of its own state (show/hide, amount, due date, notes, saving)
 * because the parent drawer has no reason to know about an in-progress
 * draft. The parent only receives the final persisted payload via
 * `onCreate`; validation (`!amount || !dueDate || saving`) and the
 * post-success reset are kept exactly as the pre-decomposition flow.
 */
export function PaymentDrawerAddForm({
  unitId,
  nextInstallmentNumber,
  onCreate,
}: {
  unitId: string;
  nextInstallmentNumber: number;
  onCreate: (data: {
    unit_id: string;
    installment_number: number;
    amount: number;
    due_date: string;
    notes?: string | null;
  }) => Promise<void>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!amount || !dueDate || saving) return;

    setSaving(true);
    setError("");

    try {
      await onCreate({
        unit_id: unitId,
        installment_number: nextInstallmentNumber,
        amount: Number(amount),
        due_date: dueDate,
        notes: notes.trim() ? notes.trim() : null,
      });
      setAmount("");
      setDueDate("");
      setNotes("");
      setShowAddForm(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Kësti nuk u ruajt. Kontrolloni të dhënat dhe provoni përsëri.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 rounded-[22px] border border-[#ececf1] bg-[linear-gradient(180deg,#fcfcfd_0%,#f9fafc_100%)] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
            Shto këst
          </p>
          <p className="mt-1 text-[12px] text-black/42">
            Shto këstin e ardhshëm ose plotëso planin ekzistues të pagesave.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddForm((value) => !value);
            setError("");
          }}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#dbe3f2] bg-white px-3 py-2 text-[12px] font-semibold transition hover:bg-[#f8fbff]"
          style={{ color: NAVY }}
        >
          <Plus size={14} />
          {showAddForm ? "Mbyll" : "Shto këst"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/32">
                Kësti #
              </span>
              <div className="flex h-10 items-center rounded-[11px] border border-[#e8e8ec] bg-white px-3 text-[13px] font-semibold text-black/75">
                {nextInstallmentNumber}
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/32">
                Shuma (€)
              </span>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-10 rounded-[11px] border border-[#e8e8ec] bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#c8d3e8] focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/32">
                Data e skadimit
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-10 rounded-[11px] border border-[#e8e8ec] bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#c8d3e8] focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
              />
            </label>

            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/32">
                Shënime
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Detaje operative, nëse duhen"
                className="rounded-[11px] border border-[#e8e8ec] bg-white px-3 py-2.5 text-[13px] text-black/80 outline-none transition focus:border-[#c8d3e8] focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
              />
            </label>

            <div className="flex justify-end md:col-span-2">
              <button
                type="button"
                onClick={() => {
                  void handleCreate();
                }}
                disabled={saving}
                className="rounded-[10px] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: NAVY }}
              >
                {saving ? "Duke ruajtur..." : "Ruaj këstin"}
              </button>
            </div>
            {error && <p className="md:col-span-2 text-[12px] text-red-500">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
