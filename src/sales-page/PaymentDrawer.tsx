import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import type { Payment } from "../hooks/usePayments";
import type { Unit } from "../hooks/useUnits";
import { NAVY } from "./shared";
import { ConfirmDeleteModal, MarkPaidModal } from "./PaymentDrawerModals";
import { PaymentDrawerSummary } from "./PaymentDrawerSummary";
import { PaymentDrawerTimeline } from "./PaymentDrawerTimeline";
import { PaymentDrawerTable } from "./PaymentDrawerTable";
import { PaymentDrawerAddForm } from "./PaymentDrawerAddForm";
import { getUnitContractValue } from "../lib/unitFinancials";

/**
 * Right-side drawer that surfaces the full payment plan for a single
 * sold unit. Acts as:
 *
 *   - the drawer shell (backdrop + animated aside + header)
 *   - the orchestrator of the four sections (summary, timeline, table,
 *     add form) that share the same `payments` / `unit` snapshot
 *   - the owner of the modal-target state for the mark-paid / delete
 *     confirmation modals, which are rendered as siblings of the aside
 *     (not inside it) so their backdrop stacks above the drawer
 *
 * The public props shape is preserved verbatim: `SalesPage` drives the
 * data + the three mutation callbacks (`onCreatePayment`, `onMarkPaid`,
 * `onDeletePayment`) exactly as before.
 */
export function PaymentDrawer({
  unit,
  payments,
  loading,
  onClose,
  onCreatePayment,
  onMarkPaid,
  onDeletePayment,
}: {
  unit: Unit;
  payments: Payment[];
  loading: boolean;
  onClose: () => void;
  onCreatePayment: (data: {
    unit_id: string;
    installment_number: number;
    amount: number;
    due_date: string;
    notes?: string | null;
  }) => Promise<void>;
  onMarkPaid: (payment: Payment, paidDate: string) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState<{
    key: number;
    title: string;
    detail: string;
  } | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  const nextInstallmentNumber = useMemo(() => {
    if (payments.length === 0) return 1;
    return Math.max(...payments.map((payment) => payment.installment_number)) + 1;
  }, [payments]);

  const paidAmount = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "E paguar")
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  const finalPrice = getUnitContractValue(unit);

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

  const handleMarkPaid = async (payment: Payment, paidDate: string) => {
    await onMarkPaid(payment, paidDate);
    publishFeedback(
      `Kësti #${payment.installment_number} u shënua si i paguar`,
      "Bilanci i arkëtimeve u rifreskua.",
    );
  };

  const handleDeletePayment = async (payment: Payment) => {
    await onDeletePayment(payment.id);
    publishFeedback(
      `Kësti #${payment.installment_number} u fshi`,
      "Lista e kësteve u përditësua.",
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

      <motion.aside
        initial={{ x: 48, opacity: 0, scale: 0.985 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 48, opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-3 left-3 right-3 top-3 z-[80] flex flex-col overflow-hidden rounded-[28px] border border-black/[0.06] bg-[#fbfbfc] shadow-[-12px_28px_80px_rgba(15,23,42,0.18),0_10px_28px_rgba(15,23,42,0.08)] sm:bottom-5 sm:left-auto sm:right-5 sm:top-5 sm:w-[760px] sm:rounded-[32px]"
      >
        <div className="flex items-start justify-between border-b border-[#eef0f4] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/30">
              Pagesat e njësisë
            </p>
            <p className="mt-2 text-[20px] font-semibold tracking-[-0.03em]" style={{ color: NAVY }}>
              {unit.unit_id}
            </p>
            <p className="mt-1 text-[13px] text-black/48">
              {unit.block} · {unit.type} · {unit.level} · {unit.size} m²
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white/90 text-black/35 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-white hover:text-black/58"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#fbfbfc] px-6 py-5">
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
            onRequestMarkPaid={setMarkPaidTarget}
            onRequestDelete={setDeleteTarget}
          />

          <PaymentDrawerAddForm
            unitId={unit.id}
            nextInstallmentNumber={nextInstallmentNumber}
            onCreate={handleCreatePayment}
          />
        </div>
      </motion.aside>

      <AnimatePresence>
        {markPaidTarget && (
          <MarkPaidModal
            payment={markPaidTarget}
            onClose={() => setMarkPaidTarget(null)}
            onConfirm={(paidDate) => handleMarkPaid(markPaidTarget, paidDate)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDeleteModal
            title="Fshi këstin"
            description={`Kësti #${deleteTarget.installment_number} do të hiqet nga plani i pagesave. Ky veprim nuk mund të kthehet.`}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => handleDeletePayment(deleteTarget)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
