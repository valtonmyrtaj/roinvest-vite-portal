import { Trash2 } from "lucide-react";
import type { Payment } from "../hooks/usePayments";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { fmtDate, NAVY } from "./shared";
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
      <div className="border-b border-[#eef0f4] px-5 py-4">
        <p className="text-[13px] font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
          Lista e kësteve
        </p>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <SkeletonRows rows={3} className="px-5 py-4" />
        ) : payments.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-black/35">Asnjë këst i regjistruar.</p>
        ) : (
          <div className="min-w-[700px]">
            <div className="flex items-center border-b border-[#F3F4F6] px-5 py-2.5">
              <div className="w-[60px] shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-black/26">Kësti</div>
              <div className="w-[120px] shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-black/26">Shuma</div>
              <div className="w-[155px] shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-black/26">Skadon më</div>
              <div className="w-[155px] shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-black/26">Paguar më</div>
              <div className="w-[115px] shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-black/26">Statusi</div>
              <div className="flex-1" />
              <div className="w-[36px] shrink-0" />
            </div>

            {payments.map((payment) => (
              <div
                key={payment.id}
                className={`group flex items-center border-b border-[#F3F4F6] px-5 py-3.5 last:border-b-0 transition-colors duration-150 ${
                  payment.status !== "E paguar" ? "bg-[#FAFBFC]" : "bg-white"
                }`}
              >
                <div className="w-[60px] shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-black/75">
                  #{payment.installment_number}
                </div>

                <div className="w-[120px] shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-black/75">
                  {fmtEur(payment.amount)}
                </div>

                <div className="w-[155px] shrink-0 whitespace-nowrap text-[12.5px] text-black/55">
                  {fmtDate(payment.due_date)}
                </div>

                <div className="w-[155px] shrink-0 whitespace-nowrap text-[12.5px] text-black/55">
                  {fmtDate(payment.paid_date)}
                </div>

                <div className="w-[115px] shrink-0">
                  {payment.status === "E paguar" ? (
                    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-[10.5px] font-semibold text-[#166534]">
                      E paguar
                    </span>
                  ) : (
                    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-[10.5px] font-semibold text-[#92400E]">
                      {payment.status}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 items-center">
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
                </div>

                <div className="flex w-[36px] shrink-0 justify-center">
                  <button
                    type="button"
                    onClick={() => onRequestDelete(payment)}
                    className="rounded-[7px] p-[6px] opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:text-black/28 hover:bg-red-50 hover:text-red-400"
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
