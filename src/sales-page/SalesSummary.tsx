import { motion } from "framer-motion";
import type { ComponentType, CSSProperties } from "react";
import { Bookmark } from "lucide-react";
import { Card, KpiCard, MetricSkeleton } from "./primitives";
import { GREEN, NAVY } from "./shared";
import { formatEuro as fmtEur } from "../lib/formatCurrency";

type SalesKpiItem = {
  label: string;
  value: number;
  color: string;
  icon: ComponentType<{
    size?: number;
    style?: CSSProperties;
    strokeWidth?: number;
  }>;
  formatValue?: (value: number) => string;
};

export function SalesSummary({
  financialSummaryReady,
  financialMetricsLoading,
  financialMetricsError,
  contractedValue,
  soldUnits,
  periodContextLabel,
  periodChipLabel,
  totalUnits,
  availableUnits,
  stockSnapshotReady,
  kpis,
  reservationSummary,
  onNavigate,
}: {
  financialSummaryReady: boolean;
  financialMetricsLoading: boolean;
  financialMetricsError: string | null;
  contractedValue: number;
  soldUnits: number;
  periodContextLabel: string;
  periodChipLabel: string;
  totalUnits: number;
  availableUnits: number;
  stockSnapshotReady: boolean;
  kpis: SalesKpiItem[];
  reservationSummary: {
    activeCount: number;
    expiringThisWeekCount: number;
  } | null;
  onNavigate?: (page: string) => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="mb-6 overflow-hidden p-0">
          <div className="grid items-end gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/30">
                Vlera e kontraktuar
              </p>
              {financialSummaryReady ? (
                <>
                  <p className="mt-2.5 text-[52px] leading-[0.94] tracking-[-0.055em]" style={{ color: NAVY, fontWeight: 700 }}>
                    {fmtEur(contractedValue)}
                  </p>
                  <p className="mt-2 text-[13px] leading-[1.35] text-black/42">
                    {soldUnits} njësi të shitura {periodContextLabel}
                  </p>
                </>
              ) : financialMetricsError ? (
                <>
                  <p className="mt-2.5 text-[52px] leading-[0.94] tracking-[-0.055em]" style={{ color: NAVY, fontWeight: 700 }}>
                    —
                  </p>
                  <p className="mt-2 text-[13px] leading-[1.35] text-[#b14b4b]/80">
                    Përmbledhja financiare nuk u ngarkua.
                  </p>
                </>
              ) : (
                <>
                  <MetricSkeleton valueClassName="h-[52px] w-[280px] max-w-full" detailClassName="h-[13px] w-[190px] max-w-[72%]" />
                  <p className="mt-3 text-[12px] text-black/34">
                    Duke ngarkuar përmbledhjen financiare për {periodChipLabel}
                  </p>
                </>
              )}
            </div>

            <div className="border-t border-[#edf0f4] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/28">
                    Konteksti i stokut
                  </p>
                  <p className="mt-1 text-[12px] text-black/38">
                    Pamje aktuale e stokut
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-[#d8e1ee] bg-[#f7faff] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-[#003883]">
                  Aktuale
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[16px] border border-[#edf0f4] bg-[#fafbfd] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                    Gjithsej njësi
                  </p>
                  {stockSnapshotReady ? (
                    <p className="mt-2 text-[30px] leading-none tracking-[-0.04em]" style={{ color: NAVY, fontWeight: 700 }}>
                      {totalUnits}
                    </p>
                  ) : (
                    <MetricSkeleton valueClassName="h-[30px] w-[88px]" detailClassName="hidden" />
                  )}
                </div>

                <div className="rounded-[16px] border border-[#edf0f4] bg-[#fafbfd] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                    Në dispozicion
                  </p>
                  {stockSnapshotReady ? (
                    <p className="mt-2 text-[30px] leading-none tracking-[-0.04em]" style={{ color: GREEN, fontWeight: 700 }}>
                      {availableUnits}
                    </p>
                  ) : (
                    <MetricSkeleton valueClassName="h-[30px] w-[88px]" detailClassName="hidden" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">
        Periudha e zgjedhur
      </p>
      {financialMetricsError && (
        <p className="mb-4 -mt-1 text-[12px] text-[#b14b4b]/80">
          Treguesit financiarë nuk u ngarkuan për periudhën e zgjedhur.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <KpiCard
              {...kpi}
              active={financialSummaryReady}
              loading={financialMetricsLoading}
              displayValueOverride={financialMetricsError ? "—" : undefined}
            />
          </motion.div>
        ))}
      </div>

      {reservationSummary && (
        <div className="mt-4 flex items-center gap-2 text-[12px] text-black/42">
          <Bookmark size={13} strokeWidth={2} className="shrink-0" style={{ color: NAVY, opacity: 0.55 }} />
          <span>
            <span className="font-medium text-black/58">
              Rezervimet aktuale · {reservationSummary.activeCount} aktive
            </span>
            {reservationSummary.expiringThisWeekCount > 0 && (
              <span className="ml-1 text-[#b0892f]">
                · {reservationSummary.expiringThisWeekCount} skadon këtë javë
              </span>
            )}
          </span>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("units")}
              className="ml-1 font-medium underline underline-offset-2 transition hover:opacity-70"
              style={{ color: NAVY }}
            >
              → Shiko njësitë
            </button>
          )}
        </div>
      )}
    </>
  );
}
