import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, FileDown, X } from "lucide-react";
import type { Payment } from "../hooks/usePayments";
import type { Unit } from "../hooks/useUnits";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { NAVY } from "./shared";
import { ConfirmDeleteModal, EditPaymentModal, RegisterPaymentModal } from "./PaymentDrawerModals";
import { PaymentDrawerSummary } from "./PaymentDrawerSummary";
import { PaymentDrawerTimeline } from "./PaymentDrawerTimeline";
import { PaymentDrawerTable } from "./PaymentDrawerTable";
import { PaymentDrawerAddForm } from "./PaymentDrawerAddForm";
import { getUnitContractValue } from "../lib/unitFinancials";
import { exportPaymentStatementPdf } from "./paymentStatementExport";

/**
 * Centered drawer that surfaces the full payment plan for a single
 * sold unit. Acts as:
 *
 *   - the modal shell (backdrop + animated aside + header)
 *   - the orchestrator of the four sections (summary, timeline, table,
 *     add form) that share the same `payments` / `unit` snapshot
 *   - the owner of the modal-target state for the mark-paid / delete
 *     confirmation modals, which are rendered as siblings of the aside
 *     (not inside it) so their backdrop stacks above the drawer
 *
 * The public props shape is preserved verbatim: `SalesPage` drives the
 * data + mutation callbacks exactly as before.
 */
export function PaymentDrawer({
  unit,
  payments,
  loading,
  canManagePayments,
  onClose,
  onCreatePayment,
  onRegisterPayment,
  onUpdatePayment,
  onDeletePayment,
}: {
  unit: Unit;
  payments: Payment[];
  loading: boolean;
  canManagePayments: boolean;
  onClose: () => void;
  onCreatePayment: (data: {
    unit_id: string;
    installment_number: number;
    amount: number;
    due_date: string;
    notes?: string | null;
  }) => Promise<void>;
  onRegisterPayment: (
    payment: Payment,
    data: {
      amount: number;
      paidDate: string;
      notes?: string | null;
      remainderDueDate?: string | null;
    },
  ) => Promise<void>;
  onUpdatePayment: (
    payment: Payment,
    data: {
      dueDate: string;
      notes?: string | null;
    },
  ) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState<{
    key: number;
    title: string;
    detail: string;
  } | null>(null);
  const [registerPaymentTarget, setRegisterPaymentTarget] = useState<Payment | null>(null);
  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  useBodyScrollLock();

  const nextInstallmentNumber = useMemo(() => {
    if (payments.length === 0) return 1;
    return Math.max(...payments.map((payment) => payment.installment_number)) + 1;
  }, [payments]);

  const paidAmount = useMemo(
    () =>
      payments.reduce((sum, payment) => sum + payment.paid_amount, 0),
    [payments],
  );

  const finalPrice = getUnitContractValue(unit);

  const displayNumberByPaymentId = useMemo(
    () => new Map(payments.map((payment, index) => [payment.id, index + 1])),
    [payments],
  );

  const getDisplayNumber = (payment: Payment) =>
    displayNumberByPaymentId.get(payment.id) ?? payment.installment_number;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || registerPaymentTarget || editTarget || deleteTarget) return;
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteTarget, editTarget, registerPaymentTarget, onClose]);

  useEffect(() => {
    if (!feedback) return undefined;

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  const publishFeedback = (title: string, detail: string) => {
    setFeedback({
      key: Date.now(),
      title,
      detail,
    });
  };

  const handleCreatePayment = async (data: {
    unit_id: string;
    installment_number: number;
    amount: number;
    due_date: string;
    notes?: string | null;
  }) => {
    await onCreatePayment(data);
    publishFeedback(
      `Kësti #${data.installment_number} u shtua`,
      `Plani i pagesave për ${unit.unit_id} u përditësua me sukses.`,
    );
  };

  const handleRegisterPayment = async (
    payment: Payment,
    data: {
      amount: number;
      paidDate: string;
      notes?: string | null;
      remainderDueDate?: string | null;
    },
  ) => {
    await onRegisterPayment(payment, data);
    const isFullPayment = data.amount >= payment.remaining_amount;
    const displayNumber = getDisplayNumber(payment);
    publishFeedback(
      isFullPayment
        ? `Kësti #${displayNumber} u shënua si i paguar`
        : `Pagesa u regjistrua dhe kësti u nda`,
      isFullPayment
        ? "Bilanci i arkëtimeve u rifreskua."
        : "Mbetja u krijua si këst i ri me afat të ri.",
    );
  };

  const handleUpdatePayment = async (
    payment: Payment,
    data: {
      dueDate: string;
      notes?: string | null;
    },
  ) => {
    await onUpdatePayment(payment, data);
    publishFeedback(
      `Kësti #${getDisplayNumber(payment)} u përditësua`,
      "Plani i pagesave u rendit sipas afatit të ri.",
    );
  };

  const handleDeletePayment = async (payment: Payment) => {
    await onDeletePayment(payment.id);
    publishFeedback(
      `Kësti #${getDisplayNumber(payment)} u fshi`,
      "Lista e kësteve u përditësua.",
    );
  };

  const handleExportStatement = () => {
    const opened = exportPaymentStatementPdf({
      unit,
      payments,
      paidAmount,
    });

    publishFeedback(
      opened ? "Pasqyra e pagesave u përgatit" : "PDF nuk u hap",
      opened
        ? "Zgjidh Save as PDF në dritaren e printimit."
        : "Shfletuesi nuk e lejoi hapjen e dritares së printimit.",
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-[rgba(15,23,42,0.22)] backdrop-blur-[3px]"
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center px-4 py-4 sm:px-6 sm:py-8">
        <motion.aside
          initial={{ y: 18, opacity: 0, scale: 0.975 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.975 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-drawer-title"
          className="pointer-events-auto flex max-h-[calc(100vh-32px)] w-full max-w-[900px] flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-[#fbfbfc] shadow-[0_28px_90px_rgba(15,23,42,0.22),0_10px_28px_rgba(15,23,42,0.10)] sm:max-h-[calc(100vh-64px)] sm:rounded-[28px]"
        >
        <div className="flex items-start justify-between border-b border-[#eef0f4] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] px-6 py-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/30">
              Pagesat e njësisë
            </p>
            <p id="payment-drawer-title" className="mt-2 text-[20px] font-semibold tracking-[-0.03em]" style={{ color: NAVY }}>
              {unit.unit_id}
            </p>
            <p className="mt-1 truncate text-[13px] text-black/48">
              {unit.block} · {unit.type} · {unit.level} · {unit.size} m²
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportStatement}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#dbe3f2] bg-white px-4 text-[12px] font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-[#f7faff] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: NAVY }}
            >
              <FileDown size={14} />
              <span className="hidden sm:inline">Eksporto PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Mbyll"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white/90 text-black/35 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-white hover:text-black/58"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-[#fbfbfc] px-6 py-5">
          <AnimatePresence initial={false}>
            {feedback && (
              <motion.div
                key={feedback.key}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                role="status"
                aria-live="polite"
                className="mb-5 rounded-[16px] border border-[#dbe6f5] bg-[#f7faff] px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-[1px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(60,122,87,0.12)] text-[#3c7a57]">
                    <CheckCircle2 size={12} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-black/82">{feedback.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-black/48">{feedback.detail}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <PaymentDrawerSummary unit={unit} paidAmount={paidAmount} />

          <PaymentDrawerTimeline
            payments={payments}
            loading={loading}
            paidAmount={paidAmount}
            finalPrice={finalPrice}
          />

          <PaymentDrawerTable
            payments={payments}
            loading={loading}
            canManagePayments={canManagePayments}
            onRequestRegisterPayment={setRegisterPaymentTarget}
            onRequestEditPayment={setEditTarget}
            onRequestDelete={setDeleteTarget}
          />

          {canManagePayments && (
            <PaymentDrawerAddForm
              unitId={unit.id}
              nextInstallmentNumber={nextInstallmentNumber}
              onCreate={handleCreatePayment}
            />
          )}
        </div>
        </motion.aside>
      </div>

      <AnimatePresence>
        {registerPaymentTarget && (
          <RegisterPaymentModal
            payment={registerPaymentTarget}
            displayNumber={getDisplayNumber(registerPaymentTarget)}
            onClose={() => setRegisterPaymentTarget(null)}
            onConfirm={(data) => handleRegisterPayment(registerPaymentTarget, data)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editTarget && (
          <EditPaymentModal
            payment={editTarget}
            displayNumber={getDisplayNumber(editTarget)}
            onClose={() => setEditTarget(null)}
            onConfirm={(data) => handleUpdatePayment(editTarget, data)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDeleteModal
            title="Fshi këstin"
            description={`Kësti #${getDisplayNumber(deleteTarget)} do të hiqet nga plani i pagesave. Ky veprim nuk mund të kthehet.`}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => handleDeletePayment(deleteTarget)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
