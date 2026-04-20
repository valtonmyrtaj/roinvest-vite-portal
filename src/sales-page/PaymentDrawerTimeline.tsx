import { useState } from "react";
import { motion } from "framer-motion";
import type { Payment } from "../hooks/usePayments";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { fmtDateCompact, GREEN, NAVY, RED } from "./shared";

/**
 * "Plani i pagesave" card — horizontal installment timeline plus a
 * collection progress bar. Owns the hover state for the timeline nodes;
 * everything else flows in via props. Derives the paid percentage
 * locally so the parent is not responsible for a second ratio.
 */
export function PaymentDrawerTimeline({
  payments,
  loading,
  paidAmount,
  finalPrice,
}: {
  payments: Payment[];
  loading: boolean;
  paidAmount: number;
  finalPrice: number;
}) {
  const [hoveredInstallmentId, setHoveredInstallmentId] = useState<string | null>(null);

  const paidPct = finalPrice > 0 ? Math.min((paidAmount / finalPrice) * 100, 100) : 0;
  const remainingAmount = Math.max(finalPrice - paidAmount, 0);

  return (
    <div className="mt-6 rounded-[24px] border border-[#ececf1] bg-[linear-gradient(180deg,#fcfcfd_0%,#f8fafc_100%)] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/28">
            Plani i pagesave
          </p>
          <p className="mt-1 text-[12.5px] text-black/42">
            Ritmi i arkëtimeve dhe këstët e mbetura për këtë njësi.
          </p>
        </div>

        <div className="grid min-w-[220px] grid-cols-2 gap-2">
          <div className="rounded-[16px] border border-[#e7ebf2] bg-white/92 px-3.5 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/28">Arkëtuar</p>
            <p className="mt-1.5 text-[16px] leading-none tracking-[-0.03em]" style={{ color: GREEN, fontWeight: 700 }}>
              {fmtEur(paidAmount)}
            </p>
          </div>
          <div className="rounded-[16px] border border-[#e7ebf2] bg-white/92 px-3.5 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/28">Në pritje</p>
            <p className="mt-1.5 text-[16px] leading-none tracking-[-0.03em]" style={{ color: NAVY, fontWeight: 700 }}>
              {fmtEur(remainingAmount)}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="mt-5 text-[13px] text-black/35">Duke ngarkuar këstët...</p>
      ) : payments.length === 0 ? (
        <p className="mt-5 text-[13px] text-black/35">
          Nuk ka këste të regjistruara ende për këtë njësi.
        </p>
      ) : (
        <>
          <div className="relative mt-6 overflow-x-auto pb-2">
            <div className="relative flex min-w-max gap-5 px-1">
              {payments.map((payment, index) => {
                const isPaid = payment.status === "E paguar";
                const isHovered = hoveredInstallmentId === payment.id;
                const nodeBorder = isPaid ? "#2D6A4F" : payment.status === "E vonuar" ? RED : "#B0892F";
                const nodeBackground = isPaid ? "#2D6A4F" : payment.status === "E vonuar" ? "#fff3f3" : "#ffffff";

                return (
                  <div
                    key={payment.id}
                    onMouseEnter={() => setHoveredInstallmentId(payment.id)}
                    onMouseLeave={() => setHoveredInstallmentId(null)}
                    onFocus={() => setHoveredInstallmentId(payment.id)}
                    onBlur={() => setHoveredInstallmentId(null)}
                    tabIndex={0}
                    className={`group relative min-w-[138px] rounded-[18px] border border-[#EEF0F4] px-3 py-3 text-left outline-none transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isHovered ? "bg-[#F8FAFF]" : "bg-transparent"
                    }`}
                    style={isHovered ? { borderLeftColor: "#003883", borderLeftWidth: "3px" } : undefined}
                  >
                    {index < payments.length - 1 && (
                      <span className="absolute left-[calc(50%+18px)] right-[-44px] top-[25px] h-px bg-[#E5E7EB]" />
                    )}
                    <div
                      className={`relative z-10 mb-3 flex h-11 w-11 items-center justify-center rounded-full border-2 text-[12px] font-semibold transition-all duration-200 ${
                        isHovered ? "scale-[1.03]" : ""
                      }`}
                      style={{
                        borderColor: nodeBorder,
                        backgroundColor: nodeBackground,
                        color: isPaid ? "#ffffff" : payment.status === "E vonuar" ? RED : "#B0892F",
                      }}
                    >
                      {payment.installment_number}
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                      Kësti #{payment.installment_number}
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold text-black/76">{fmtEur(payment.amount)}</p>
                    <p className="mt-1 text-[11px] text-black/40">
                      {isPaid ? fmtDateCompact(payment.paid_date) : fmtDateCompact(payment.due_date)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-[12px] text-black/55">
              <span>
                {fmtEur(paidAmount)} arkëtuar nga {fmtEur(finalPrice)} · {paidPct.toFixed(0)}%
              </span>
            </div>
            <div className="h-[6px] overflow-hidden rounded-full bg-[#e8edf3]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${paidPct}%` }}
                transition={{ duration: 0.38, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #3c7a57 0%, #4f9469 100%)" }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
