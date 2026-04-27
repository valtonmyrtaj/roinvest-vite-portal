import type { Unit } from "../hooks/useUnits";
import { getUnitContractValue } from "../lib/unitFinancials";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { fmtDate, formatPaymentType, GREEN, NAVY } from "./shared";

/**
 * Top summary card inside the drawer: sale context, final price, and
 * collected-to-date. The drawer header owns the unit identity to avoid
 * repeating the same unit metadata inside the body.
 * Purely presentational — takes the unit plus the running `paidAmount`
 * tally and derives everything else internally.
 */
export function PaymentDrawerSummary({
  unit,
  paidAmount,
}: {
  unit: Unit;
  paidAmount: number;
}) {
  const finalPrice = getUnitContractValue(unit);
  const paymentType = formatPaymentType(unit.payment_type);

  const saleMeta = [
    unit.buyer_name ? { label: "Blerësi", value: unit.buyer_name } : null,
    paymentType ? { label: "Lloji i pagesës", value: paymentType } : null,
    unit.sale_date ? { label: "Data e shitjes", value: fmtDate(unit.sale_date) } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <div className="rounded-[24px] border border-[#ececf1] bg-[linear-gradient(180deg,#fcfcfd_0%,#f7f9fc_100%)] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#fbeeee] px-2.5 py-1 text-[10.5px] font-semibold text-[#b14b4b]">
              E shitur
            </span>
          </div>

          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
            Konteksti i shitjes
          </p>
          <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-3">
            {saleMeta.map((item) => (
              <div key={item.label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/26">
                  {item.label}
                </p>
                <p className="mt-1.5 text-[13px] leading-[1.35] text-black/72" style={{ fontWeight: 600 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-[220px] rounded-[20px] border border-[#dfe6f1] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/30">
                Çmimi final
              </p>
              <p className="mt-2 text-[30px] leading-none tracking-[-0.04em]" style={{ color: NAVY, fontWeight: 700 }}>
                {fmtEur(finalPrice)}
              </p>
            </div>
            <div className="rounded-[14px] bg-[#f5f7fb] px-3 py-2 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/28">
                Arkëtuar
              </p>
              <p className="mt-1 text-[16px] leading-none tracking-[-0.03em]" style={{ color: GREEN, fontWeight: 700 }}>
                {fmtEur(paidAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
