import type { Unit } from "../hooks/useUnits";
import { getUnitContractValue } from "../lib/unitFinancials";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { fmtDate, formatPaymentType, GREEN, NAVY } from "./shared";

/**
 * Top summary card inside the drawer: identity chips, final price,
 * collected-to-date, unit specifics, and (conditionally) sale context.
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

  const unitMeta = [
    { label: "Blloku", value: unit.block },
    { label: "Lloji", value: unit.type },
    { label: "Niveli", value: unit.level },
    { label: "Sipërfaqja", value: `${unit.size} m²` },
  ];
  const saleMeta = [
    unit.buyer_name ? { label: "Blerësi", value: unit.buyer_name } : null,
    paymentType ? { label: "Mënyra e pagesës", value: paymentType } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <div className="rounded-[24px] border border-[#ececf1] bg-[linear-gradient(180deg,#fcfcfd_0%,#f7f9fc_100%)] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#f4f7fc] px-2.5 py-1 text-[10.5px] font-semibold text-[#003883]">
              Njësia
            </span>
            <span className="inline-flex items-center rounded-full bg-[#fbeeee] px-2.5 py-1 text-[10.5px] font-semibold text-[#b14b4b]">
              E shitur
            </span>
            {paymentType && (
              <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold text-black/52 ring-1 ring-black/[0.06]">
                {paymentType}
              </span>
            )}
          </div>

          <p className="mt-3 text-[28px] leading-none tracking-[-0.04em]" style={{ color: NAVY, fontWeight: 700 }}>
            {unit.unit_id}
          </p>
          <p className="mt-2 text-[13px] leading-[1.45] text-black/50">
            {unit.block} · {unit.type} · {unit.level} · {unit.size} m²
          </p>
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
          {unit.sale_date && (
            <p className="mt-3 text-[11.5px] text-black/42">
              Shitur më {fmtDate(unit.sale_date)}
            </p>
          )}
        </div>
      </div>

      <div className={`mt-5 grid gap-3 ${saleMeta.length > 0 ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(220px,0.9fr)]" : ""}`}>
        <div className="rounded-[20px] border border-[#e7ebf2] bg-white/92 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
            Detajet e njësisë
          </p>
          <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {unitMeta.map((item) => (
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

        {saleMeta.length > 0 && (
          <div className="rounded-[20px] border border-[#e7ebf2] bg-white/92 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
              Konteksti i shitjes
            </p>
            <div className="mt-4 grid gap-3">
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
        )}
      </div>
    </div>
  );
}
