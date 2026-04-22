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
        <Card className="mb-4 overflow-hidden p-0">
          <div className="grid gap-3 px-6 py-3.5 lg:grid-cols-[minmax(0,1.22fr)_minmax(300px,0.78fr)]">
            <div className="flex flex-col justify-start lg:justify-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/30">
                Vlera e kontraktuar
              </p>
              {financialSummaryReady ? (
                <>
                  <p
                    className="mt-1 text-[50px] leading-[0.9] tracking-[-0.055em] lg:text-[52px]"
                    style={{ color: NAVY, fontWeight: 700 }}
                  >
                    {fmtEur(contractedValue)}
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.35] text-black/42">
                    {soldUnits} njësi të shitura {periodContextLabel}
                  </p>
                </>
              ) : financialMetricsError ? (
                <>
                  <p
                    className="mt-1 text-[50px] leading-[0.9] tracking-[-0.055em] lg:text-[52px]"
                    style={{ color: NAVY, fontWeight: 700 }}
                  >
                    —
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.35] text-[#b14b4b]/80">
                    Përmbledhja financiare nuk u ngarkua.
                  </p>
                </>
              ) : (
                <>
                  <MetricSkeleton
                    valueClassName="mt-1 h-[48px] w-[284px] max-w-full"
                    detailClassName="h-[13px] w-[190px] max-w-[72%]"
                  />
                  <p className="mt-2 text-[12px] text-black/34">
                    Duke ngarkuar përmbledhjen financiare për {periodChipLabel}
                  </p>
                </>
              )}
            </div>

            <div className="border-t border-[#edf0f4] pt-3 lg:border-t-0 lg:pt-4">
              <div className="relative flex flex-col gap-2 pl-5">
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 top-0 hidden w-px bg-[#edf0f4] lg:block"
                />
                <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/28">
                  Pamja aktuale e stokut
                </p>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-[15px] border border-[#edf0f4] bg-[#fafbfd] px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                      Gjithsej njësi
                    </p>
                    {stockSnapshotReady ? (
                      <p className="mt-1.5 text-[28px] leading-none tracking-[-0.04em]" style={{ color: NAVY, fontWeight: 700 }}>
                        {totalUnits}
                      </p>
                    ) : (
                      <MetricSkeleton valueClassName="h-[30px] w-[88px]" detailClassName="hidden" />
                    )}
                  </div>

                  <div className="rounded-[15px] border border-[#edf0f4] bg-[#fafbfd] px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                      Në dispozicion
                    </p>
                    {stockSnapshotReady ? (
                      <p className="mt-1.5 text-[28px] leading-none tracking-[-0.04em]" style={{ color: GREEN, fontWeight: 700 }}>
                        {availableUnits}
                      </p>
                    ) : (
                      <MetricSkeleton valueClassName="h-[30px] w-[88px]" detailClassName="hidden" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="mb-2">
        <p className="text-[12px] text-black/42">
          Treguesit financiarë dhe ritmi i shitjeve për {periodChipLabel}
        </p>
      </div>
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#e7ebf2] bg-[#fbfcfe] px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <div className="flex items-start gap-2.5 text-[12px] text-black/42">
            <Bookmark
              size={13}
              strokeWidth={2}
              className="mt-[2px] shrink-0"
              style={{ color: NAVY, opacity: 0.58 }}
            />
            <div>
              <p className="font-medium text-black/62">
                Rezervimet aktuale · {reservationSummary.activeCount} aktive
              </p>
              <p className="mt-1 text-[11.5px] text-black/40">
                {reservationSummary.expiringThisWeekCount > 0
                  ? `${reservationSummary.expiringThisWeekCount} skadojnë këtë javë dhe kërkojnë ndjekje.`
                  : "Nuk ka rezervime që skadojnë gjatë kësaj jave."}
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("units")}
              className="inline-flex items-center rounded-[10px] border border-[#dbe3f2] bg-white px-3 py-2 text-[11.5px] font-semibold transition hover:bg-[#f8fbff]"
              style={{ color: NAVY }}
            >
              Shiko njësitë
            </button>
          )}
        </div>
      )}
    </>
  );
}
