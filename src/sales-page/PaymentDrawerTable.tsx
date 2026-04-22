import { Trash2 } from "lucide-react";
import type { Payment } from "../hooks/usePayments";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import {
  TABULAR_HEADER_LABEL_CLASS,
  TABULAR_HEADER_ROW_CLASS,
} from "../components/ui/tabularHeader";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { fmtDate, NAVY } from "./shared";
import { PaymentStatusBadge } from "./primitives";
import { SkeletonRows } from "../components/SkeletonRows";

/**
 * "Lista e kësteve" — the detailed installment table. Triggers the
 * mark-paid and delete modals through parent-owned callbacks; the
 * modals themselves live in `PaymentDrawer` so that their
 * `AnimatePresence` lifecycle sits alongside the drawer aside.
 */
export function PaymentDrawerTable({
  payments,
  loading,
  onRequestMarkPaid,
  onRequestDelete,
}: {
  payments: Payment[];
  loading: boolean;
  onRequestMarkPaid: (payment: Payment) => void;
  onRequestDelete: (payment: Payment) => void;
}) {
  return (
    <div className="mt-6 rounded-[22px] border border-[#ececf1] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <CardSectionHeader
        title="Lista e kësteve"
        subtitle="Shëno këstet e paguara dhe të papaguara"
        className="px-5 py-4"
        bodyClassName="max-w-[420px]"
        right={
          <span
            className="inline-flex items-center rounded-full border border-[#d8e1ee] bg-[#f7faff] px-2.5 py-1 text-[10.5px] font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
            style={{ color: NAVY }}
          >
            {loading ? "Duke u ngarkuar" : `${payments.length} këste`}
          </span>
        }
      />

      <div className="overflow-x-auto">
        {loading ? (
          <SkeletonRows rows={3} className="px-5 py-4" />
        ) : payments.length === 0 ? (
          <div className="px-5 py-5 text-center">
            <p className="text-[13px] font-medium text-black/40">
              Plani i pagesave nuk ka këste të regjistruara ende
            </p>
            <p className="mt-1 text-[11.5px] text-black/28">
              Përdor bllokun më poshtë për të shtuar këstin e parë.
            </p>
          </div>
        ) : (
          <div className="min-w-[600px] sm:min-w-0">
            <div className={`flex items-center px-3 py-2.5 ${TABULAR_HEADER_ROW_CLASS}`}>
              <div className={`w-[48px] shrink-0 whitespace-nowrap ${TABULAR_HEADER_LABEL_CLASS}`}>Kësti</div>
              <div className={`w-[96px] shrink-0 whitespace-nowrap ${TABULAR_HEADER_LABEL_CLASS}`}>Shuma</div>
              <div className={`w-[112px] shrink-0 whitespace-nowrap ${TABULAR_HEADER_LABEL_CLASS}`}>Skadon më</div>
              <div className={`w-[112px] shrink-0 whitespace-nowrap ${TABULAR_HEADER_LABEL_CLASS}`}>Paguar më</div>
              <div className={`w-[104px] shrink-0 whitespace-nowrap ${TABULAR_HEADER_LABEL_CLASS}`}>Statusi</div>
              <div className="min-w-[156px] flex-1" />
            </div>

            {payments.map((payment) => (
              <div
                key={payment.id}
                className={`group flex items-center border-b border-[#F3F4F6] px-3 py-3.5 last:border-b-0 transition-colors duration-150 ${
                  payment.status === "E vonuar"
                    ? "bg-[#fdf8f8]"
                    : payment.status !== "E paguar"
                      ? "bg-[#FAFBFC]"
                      : "bg-white"
                }`}
              >
                <div className="w-[48px] shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-black/75">
                  #{payment.installment_number}
                </div>

                <div className="w-[96px] shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-black/75">
                  {fmtEur(payment.amount)}
                </div>

                <div className="w-[112px] shrink-0 whitespace-nowrap text-[12.5px] text-black/55">
                  {fmtDate(payment.due_date)}
                </div>

                <div className="w-[112px] shrink-0 whitespace-nowrap text-[12.5px] text-black/55">
                  {fmtDate(payment.paid_date)}
                </div>

                <div className="w-[104px] shrink-0">
                  <PaymentStatusBadge status={payment.status} />
                </div>

                <div className="flex min-w-[156px] flex-1 items-center justify-end gap-2">
                  {payment.status !== "E paguar" && (
                    <button
                      type="button"
                      onClick={() => onRequestMarkPaid(payment)}
                      className="whitespace-nowrap rounded-[8px] border border-[#dbe3f2] px-3 py-1.5 text-[11px] font-semibold transition hover:bg-[#f0f5ff]"
                      style={{ color: NAVY }}
                    >
                      Shëno si të paguar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRequestDelete(payment)}
                    aria-label={`Fshi këstin #${payment.installment_number}`}
                    className="rounded-[7px] p-[6px] text-black/24 opacity-55 transition-all duration-150 group-hover:opacity-100 group-hover:text-black/30 hover:bg-red-50 hover:text-red-400 focus-visible:opacity-100 focus-visible:outline-none"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
