import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, CreditCard } from "lucide-react";
import type { Unit } from "../hooks/useUnits";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { getUnitContractValue } from "../lib/unitFinancials";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { Card } from "./primitives";
import { fmtDate, NAVY, RED, triggerOnActionKey } from "./shared";

export type SalesTypologyRow = {
  label: string;
  soldCount: number;
  revenue: number;
  units: Unit[];
  missingUnitCount: number;
};

function TypologyAccordionRow({
  label,
  soldCount,
  revenue,
  soldUnits,
  missingUnitCount,
  onOpenPaymentPlan,
}: {
  label: string;
  soldCount: number;
  revenue: number;
  soldUnits: Unit[];
  missingUnitCount: number;
  onOpenPaymentPlan: (unit: Unit) => void;
}) {
  const [open, setOpen] = useState(false);
  const borderColor = soldCount > 0 ? RED : "#e5e7eb";
  const dotsToShowCount = Math.min(soldCount, 20);
  const extraDots = soldCount > 20 ? soldCount - 20 : 0;

  return (
    <div
      className="overflow-hidden rounded-[16px] border border-[#edf0f4] bg-white"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#fafbfd]"
      >
        <div className="w-[140px] shrink-0">
          <p className="text-[15px] font-semibold" style={{ color: NAVY }}>
            {label}
          </p>
          <p className="mt-1 text-[11.5px] text-black/35">
            {soldCount} njësi të shitura në periudhën e zgjedhur
          </p>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-[4px]">
          {soldCount === 0 ? (
            <span className="text-[11.5px] text-black/25">Nuk ka shitje në periudhën e zgjedhur</span>
          ) : (
            <>
              {Array.from({ length: dotsToShowCount }, (_, index) => (
                <span
                  key={`${label}-dot-${index}`}
                  className="inline-block h-[8px] w-[8px] rounded-full"
                  style={{ backgroundColor: RED }}
                />
              ))}
              {extraDots > 0 && (
                <span className="ml-1 text-[11px] text-black/35" style={{ fontWeight: 500 }}>
                  +{extraDots}
                </span>
              )}
            </>
          )}
        </div>

        <div className="text-right">
          <p className="text-[15px] font-semibold" style={{ color: NAVY }}>
            {fmtEur(revenue)}
          </p>
        </div>

        <ChevronDown
          size={14}
          className="text-black/28 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="border-t border-[#f0f0f4]"
          >
            <div className="grid gap-3 px-5 py-4">
              {soldCount === 0 ? (
                <p className="text-[12px] text-black/35">
                  Asnjë njësi e shitur për këtë tipologji.
                </p>
              ) : (
                <>
                  {missingUnitCount > 0 && (
                    <p className="rounded-[12px] border border-[#f0d9d9] bg-[#fdf7f7] px-3 py-2 text-[11.5px] text-[#9d5555]">
                      {missingUnitCount} njësi nga kjo tipologji nuk u ngarkuan në listën operative. Totali financiar mbetet i saktë nga backend-i.
                    </p>
                  )}

                  {soldUnits.map((unit) => (
                    <div
                      key={unit.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Hap planin e pagesave për ${unit.unit_id}`}
                      onClick={() => onOpenPaymentPlan(unit)}
                      onKeyDown={(event) => triggerOnActionKey(event, () => onOpenPaymentPlan(unit))}
                      className="group rounded-[14px] border border-[#edf0f4] bg-[#fcfcfd] p-4 text-left outline-none transition-[background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#e7eaf0] hover:bg-[#f7f8fa] hover:shadow-[0_10px_24px_rgba(15,23,42,0.04)] focus-visible:border-[#d7deea] focus-visible:bg-[#f7f8fa] focus-visible:shadow-[0_0_0_3px_rgba(0,56,131,0.08)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold transition-colors group-hover:text-black/88 group-focus-visible:text-black/88" style={{ color: NAVY }}>
                            {unit.unit_id}
                          </p>
                          <p className="mt-1 text-[11.5px] text-black/40 transition-colors group-hover:text-black/50 group-focus-visible:text-black/50">
                            {unit.block} · {unit.level} · {unit.size} m²
                          </p>
                          <p className="mt-1 text-[11.5px] text-black/40 transition-colors group-hover:text-black/50 group-focus-visible:text-black/50">
                            {unit.owner_name}
                          </p>
                          {unit.buyer_name && (
                            <p className="mt-1 text-[11.5px]" style={{ color: NAVY, opacity: 0.7 }}>
                              Blerësi: {unit.buyer_name}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-[13px] font-semibold transition-colors group-hover:text-black/88 group-focus-visible:text-black/88" style={{ color: NAVY }}>
                            {fmtEur(getUnitContractValue(unit))}
                          </p>
                          <p className="mt-1 text-[11px]" style={{ color: NAVY, opacity: 0.78 }}>
                            Shitur më {fmtDate(unit.sale_date)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eef0f4] pt-3">
                        <span className="inline-flex items-center rounded-full bg-[#fbeeee] px-2.5 py-1 text-[10.5px] font-semibold text-[#b14b4b]">
                          E shitur
                        </span>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenPaymentPlan(unit);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#dbe3f2] bg-white px-3 py-2 text-[11.5px] font-semibold transition hover:bg-[#f8fbff]"
                          style={{ color: NAVY }}
                        >
                          <CreditCard size={13} />
                          Plan pagese
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SalesTypologyBreakdown({
  loading,
  error,
  rows,
  onOpenPaymentPlan,
}: {
  loading: boolean;
  error: string | null;
  rows: SalesTypologyRow[];
  onOpenPaymentPlan: (unit: Unit) => void;
}) {
  return (
    <div className="mt-6">
      <Card>
        <CardSectionHeader
          title="Njësitë e shitura"
          subtitle="Hap tipologjinë për të parë njësitë e shitura dhe planin e pagesave"
          className="mb-5 border-b-0 px-0 py-0"
          bodyClassName="max-w-[460px]"
        />

        <div className="flex flex-col gap-3">
          {error ? (
            <div className="rounded-[16px] border border-dashed border-[#ead4d4] bg-[#fdf8f8] px-4 py-4 text-[13px] text-[#b14b4b]/80">
              Tipologjitë financiare nuk u ngarkuan për periudhën e zgjedhur.
            </div>
          ) : loading ? (
            Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="rounded-[16px] border border-[#edf0f4] bg-white px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="h-[16px] w-[120px] animate-pulse rounded-full bg-[#eef1f5]" />
                    <div className="h-[11px] w-[180px] animate-pulse rounded-full bg-[#f3f5f8]" />
                  </div>
                  <div className="h-[18px] w-[88px] animate-pulse rounded-full bg-[#eef1f5]" />
                </div>
              </div>
            ))
          ) : (
            rows.map((row) => (
              <TypologyAccordionRow
                key={row.label}
                label={row.label}
                soldCount={row.soldCount}
                revenue={row.revenue}
                soldUnits={row.units}
                missingUnitCount={row.missingUnitCount}
                onOpenPaymentPlan={onOpenPaymentPlan}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
