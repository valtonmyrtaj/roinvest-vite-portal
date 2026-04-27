import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DatePickerField } from "../components/ui/DatePickerField";
import type { Payment } from "../hooks/usePayments";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { GREEN, NAVY, RED } from "./shared";

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Generic destructive-confirm modal used for the "Fshi këstin" flow.
 * Kept local to the drawer because its layout (z-index 90, the drawer
 * backdrop sitting at z-index 70) is specifically tuned to stack over
 * the payment drawer.
 */
export function ConfirmDeleteModal({
  title,
  description,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  const handleConfirm = async () => {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      await onConfirm();
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Kësti nuk u fshi. Provoni përsëri.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]"
      onClick={saving ? undefined : onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-payment-title"
        className="w-full max-w-[420px] rounded-[20px] border border-[#e8e8ec] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="delete-payment-title" className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
          {title}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-black/48">{description}</p>
        {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-[10px] border border-[#e8e8ec] px-3.5 py-2 text-[12px] text-black/55 transition hover:bg-[#f6f6f8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anulo
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={saving}
            className="rounded-[10px] px-3.5 py-2 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: RED }}
          >
            {saving ? "Duke fshirë..." : "Fshi"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Register an actual receipt against a scheduled installment. The
 * installment remains the obligation; this modal records money received.
 */
export function RegisterPaymentModal({
  payment,
  onClose,
  onConfirm,
}: {
  payment: Payment;
  onClose: () => void;
  onConfirm: (data: { amount: number; paidDate: string; notes?: string | null }) => Promise<void>;
}) {
  const remainingAmount = Math.max(payment.remaining_amount, 0);
  const [paidDate, setPaidDate] = useState(() => todayIso());
  const [amount, setAmount] = useState(() => (remainingAmount > 0 ? String(remainingAmount) : ""));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  const handleSubmit = async () => {
    if (saving) return;

    setError("");

    const today = todayIso();

    if (!paidDate) {
      setError("Plotëso datën e pagesës.");
      return;
    }

    if (paidDate > today) {
      setError("Data e pagesës nuk mund të jetë në të ardhmen.");
      return;
    }

    const trimmedAmount = amount.trim();
    const parsedAmount = Number(trimmedAmount);

    if (!trimmedAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Shuma duhet të jetë më e madhe se 0.");
      return;
    }

    if (parsedAmount > remainingAmount) {
      setError(`Shuma nuk mund të tejkalojë ${fmtEur(remainingAmount)}.`);
      return;
    }

    setSaving(true);

    try {
      await onConfirm({
        amount: parsedAmount,
        paidDate,
        notes: notes.trim() ? notes.trim() : null,
      });
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Pagesa nuk u regjistrua. Provoni përsëri.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]"
      onClick={saving ? undefined : onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-paid-title"
        className="w-full max-w-[420px] rounded-[20px] border border-[#e8e8ec] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="mark-paid-title" className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
          Regjistro pagesë
        </p>
        <p className="mt-2 text-[13px] text-black/48">
          Kësti #{payment.installment_number} ka {fmtEur(remainingAmount)} të mbetura nga {fmtEur(payment.amount)}.
        </p>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/32">
            Shuma (€)
          </span>
          <input
            type="number"
            min={0.01}
            max={remainingAmount}
            step={0.01}
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError("");
            }}
            className="h-10 rounded-[11px] border border-[#e8e8ec] bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#c8d3e8] focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
          />
        </label>

        <DatePickerField
          className="mt-5"
          label="Data e pagesës"
          max={todayIso()}
          value={paidDate}
          onChange={(next) => {
            setPaidDate(next ?? "");
            setError("");
          }}
          required
          labelClassName="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/32"
        />

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/32">
            Shënime
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="p.sh. pagesë e pjesshme"
            className="rounded-[11px] border border-[#e8e8ec] bg-white px-3 py-2.5 text-[13px] text-black/80 outline-none transition focus:border-[#c8d3e8] focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
          />
        </label>
        {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-[10px] border border-[#e8e8ec] px-3.5 py-2 text-[12px] text-black/55 transition hover:bg-[#f6f6f8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anulo
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={saving}
            className="rounded-[10px] px-3.5 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: GREEN }}
          >
            {saving ? "Duke ruajtur..." : "Ruaj pagesën"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
