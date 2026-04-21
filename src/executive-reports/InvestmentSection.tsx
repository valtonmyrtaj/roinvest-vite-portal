import { useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, CheckCircle2 } from "lucide-react";
import type { OwnerCategory, Unit } from "../hooks/useUnits";
import type { SaleReportingMetrics, SaleReportingTypologyBreakdownItem } from "../hooks/useSaleReporting";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { getUnitListingPrice } from "../lib/unitFinancials";
import { normalizeCompatibleUnitFields } from "../lib/unitCompatibility";
import {
  TABULAR_HEADER_LABEL_CLASS,
  TABULAR_HEADER_ROW_CLASS,
} from "../components/ui/tabularHeader";
import { Card, HeroMetricCard, SectionHeader } from "./primitives";
import {
  MONTH_LABELS,
  NAVY,
  SOFT_EASE,
  SOLD_COLOR,
  formatCount,
  formatPercent,
  getValue,
  normalizeStatus,
  normalizeTypology,
  sectionMotion,
  toDate,
  type UnitTypology,
  useHoldLast,
} from "./shared";
import { SummaryPeriodControls } from "./PeriodControls";

/**
 * "Pasqyra e investimit" — the dominant section of the Executive Reports
 * page. Owns all derivation for:
 *
 *   • the three top summary cards (contracted / collected / pending) driven
 *     by the Investor-scoped reporting metrics
 *   • the hero metric cards (total units / sold-in-period)
 *   • the owner-category breakdown table (Investor / Landowners / Builders)
 *   • the typology breakdown table (Banesë / Penthouse / Lokal / Garazhë)
 *
 * Also owns the "hold-last-confirmed" wrappers so the period selector never
 * flashes zeros between fetches. All upstream data and the selected period
 * come in as props — the parent is the hook caller and period-state owner.
 */
export function InvestmentSection({
  units,
  unitsLoading,
  investorMetrics,
  investorMetricsLoading,
  investorMetricsError,
  landownersMetrics,
  landownersMetricsLoading,
  landownersMetricsError,
  buildersMetrics,
  buildersMetricsLoading,
  buildersMetricsError,
  investorTypologyBreakdown,
  investorTypologyLoading,
  investorTypologyError,
  selectedSummaryMonth,
  selectedSummaryYear,
  onSummaryMonthChange,
  onSummaryYearChange,
}: {
  units: Unit[];
  unitsLoading: boolean;
  investorMetrics: SaleReportingMetrics | null;
  investorMetricsLoading: boolean;
  investorMetricsError: string | null;
  landownersMetrics: SaleReportingMetrics | null;
  landownersMetricsLoading: boolean;
  landownersMetricsError: string | null;
  buildersMetrics: SaleReportingMetrics | null;
  buildersMetricsLoading: boolean;
  buildersMetricsError: string | null;
  investorTypologyBreakdown: SaleReportingTypologyBreakdownItem[];
  investorTypologyLoading: boolean;
  investorTypologyError: string | null;
  selectedSummaryMonth: number;
  selectedSummaryYear: number;
  onSummaryMonthChange: (month: number) => void;
  onSummaryYearChange: (year: number) => void;
}) {
  const reportingMonth = selectedSummaryMonth + 1;

  // Hold-last-confirmed values so the period picker never flashes zeros while
  // a new RPC is in flight. The underlying hooks null / empty-out their state
  // at the start of each fetch; we display the previous confirmed snapshot
  // until the new one lands.
  const displayInvestorMetrics = useHoldLast(investorMetrics, investorMetricsLoading);
  const displayLandownersMetrics = useHoldLast(
    landownersMetrics,
    landownersMetricsLoading,
  );
  const displayBuildersMetrics = useHoldLast(buildersMetrics, buildersMetricsLoading);
  const displayInvestorTypologyBreakdown = useHoldLast(
    investorTypologyBreakdown,
    investorTypologyLoading,
  );

  const summaryMetricsValue = displayInvestorMetrics ?? {
    ownerScope: "Investitor" as const,
    periodYear: selectedSummaryYear,
    periodMonth: reportingMonth,
    soldUnits: 0,
    contractedValue: 0,
    collectedValue: 0,
    pendingValue: 0,
    hasPaymentData: false,
  };

  const normalizedUnits = useMemo(
    () =>
      units.map((unit) => {
        const normalizedFields = normalizeCompatibleUnitFields(
          unit as unknown as Record<string, unknown>,
        );
        const status = String(getValue(unit, ["status"]) ?? "");

        return {
          unitId: normalizedFields.unitId,
          status,
          statusKey: normalizeStatus(status),
          type: normalizeTypology(
            normalizedFields.type,
            normalizedFields.level,
            normalizedFields.unitId,
          ),
          ownerCategory: (unit.owner_category ?? null) as OwnerCategory | null,
          listingPrice: getUnitListingPrice(unit),
          saleDate: toDate(normalizedFields.saleDate),
        };
      }),
    [units],
  );

  const selectedSummaryPeriodLabel = `${MONTH_LABELS[selectedSummaryMonth]} ${selectedSummaryYear}`;
  const selectedSummaryMotionKey = `${selectedSummaryYear}-${selectedSummaryMonth}`;
  const financialSummaryReady =
    !unitsLoading &&
    !investorMetricsLoading &&
    !investorMetricsError &&
    investorMetrics !== null;

  const isCurrentlyAvailable = useCallback(
    (unit: (typeof normalizedUnits)[number]) => unit.statusKey === "available",
    [],
  );

  // Investor-scoped inventory (B1): "Pasqyra e investimit" stays internally consistent.
  const investorUnits = useMemo(
    () => normalizedUnits.filter((unit) => unit.ownerCategory === "Investitor"),
    [normalizedUnits],
  );

  const totalUnits = investorUnits.length;
  const soldCountInPeriod = summaryMetricsValue.soldUnits;
  const soldPercent = totalUnits > 0 ? (soldCountInPeriod / totalUnits) * 100 : 0;

  const typologyRows = useMemo(() => {
    const order: UnitTypology[] = ["Banesë", "Penthouse", "Lokal", "Garazhë"];
    const breakdownByLabel = new Map(
      displayInvestorTypologyBreakdown.map((row) => [row.typology, row]),
    );
    return order.map((typology) => {
      const investorRows = investorUnits.filter((unit) => unit.type === typology);
      const available = investorRows.filter(isCurrentlyAvailable);
      const breakdown = breakdownByLabel.get(typology);

      return {
        typology,
        total: investorRows.length,
        sold: breakdown?.soldUnits ?? 0,
        available: available.length,
        revenue: breakdown?.contractedValue ?? 0,
      };
    });
  }, [displayInvestorTypologyBreakdown, investorUnits, isCurrentlyAvailable]);

  const ownerCategoryRows = useMemo(() => {
    const order: OwnerCategory[] = [
      "Investitor",
      "Pronarët e tokës",
      "Kompani ndërtimore",
    ];
    const metricsByCategory: Record<OwnerCategory, typeof summaryMetricsValue | null> = {
      Investitor: displayInvestorMetrics,
      "Pronarët e tokës": displayLandownersMetrics,
      "Kompani ndërtimore": displayBuildersMetrics,
    };
    return order.map((category) => {
      const m = metricsByCategory[category];
      return {
        category,
        soldCount: m?.soldUnits ?? 0,
        revenue: m?.contractedValue ?? 0,
      };
    });
  }, [
    displayBuildersMetrics,
    displayInvestorMetrics,
    displayLandownersMetrics,
  ]);

  const ownerCategoryReady =
    !investorMetricsLoading &&
    !landownersMetricsLoading &&
    !buildersMetricsLoading &&
    !investorMetricsError &&
    !landownersMetricsError &&
    !buildersMetricsError;

  const typologyReady = !investorTypologyLoading && !investorTypologyError;

  const investmentCards = [
    {
      label: "Njësi gjithsej",
      value: formatCount(totalUnits),
      footnote: "100% e stokut total të projektit",
      progress: 100,
      color: NAVY,
      icon: Building2,
      delay: 0,
    },
    {
      label: "Njësi të shitura",
      value: formatCount(soldCountInPeriod),
      footnote: `${formatPercent(soldPercent)} e stokut gjatë ${selectedSummaryPeriodLabel}`,
      progress: soldPercent,
      color: SOLD_COLOR,
      icon: CheckCircle2,
      delay: 0.05,
    },
  ];

  return (
    <motion.section {...sectionMotion(0.02)} className="executive-reports-section mb-10">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf0f4] px-6 py-5">
          <div>
            <h2 className="text-[20px] font-bold leading-tight" style={{ color: NAVY }}>
              Pasqyra e investimit
            </h2>
            <p className="mt-[2px] text-[13px] font-normal" style={{ color: "#9ca3af" }}>
Pamje për pronësinë Investitor · stoku, shitjet, arkëtimet dhe vlera e mbetur.
            </p>
            <div className="mt-3 inline-flex items-center rounded-full border border-[#d7deea] bg-[#f7faff] px-3 py-1 text-[11px] font-medium text-[#003883]">
              Periudha e raportit · {selectedSummaryPeriodLabel}
            </div>
            {!financialSummaryReady && (
              <p className="mt-3 text-[12px] text-black/38">
                Duke ngarkuar përmbledhjen financiare për periudhën e zgjedhur.
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-[#e0e5ed] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/35">
                  Vlera e kontraktuar
                </div>
                {financialSummaryReady ? (
                  <>
                    <div className="mt-2 text-[28px] leading-none font-bold tracking-[-0.03em] text-[#003883]">
                      {fmtEur(summaryMetricsValue.contractedValue)}
                    </div>
                    <p className="mt-2 text-[11.5px] text-black/36">
                      {summaryMetricsValue.soldUnits} njësi të shitura
                    </p>
                  </>
                ) : (
                  <div className="mt-2 space-y-2">
                    <div className="h-[28px] w-[148px] animate-pulse rounded-full bg-black/[0.08]" />
                    <div className="h-[11px] w-[110px] animate-pulse rounded-full bg-black/[0.05]" />
                  </div>
                )}
              </div>

              <div className="rounded-[20px] border border-[#c8e6d5] bg-[#f0fdf4] px-5 py-4 shadow-[0_1px_3px_rgba(60,122,87,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3c7a57]/65">
                  Të arkëtuara
                </div>
                {financialSummaryReady ? (
                  <>
                    <div className="mt-2 text-[28px] leading-none font-bold tracking-[-0.03em] text-[#3c7a57]">
                      {fmtEur(summaryMetricsValue.collectedValue)}
                    </div>
                    <p className="mt-2 text-[11.5px] text-[#3c7a57]/45">
                      {summaryMetricsValue.hasPaymentData
                        ? "Nga pagesat e regjistruara"
                        : "Asnjë pagesë e regjistruar"}
                    </p>
                  </>
                ) : (
                  <div className="mt-2 space-y-2">
                    <div className="h-[28px] w-[148px] animate-pulse rounded-full bg-[#3c7a57]/12" />
                    <div className="h-[11px] w-[118px] animate-pulse rounded-full bg-[#3c7a57]/10" />
                  </div>
                )}
              </div>

              <div className="rounded-[20px] border border-[#f0dfa0] bg-[#fffbeb] px-5 py-4 shadow-[0_1px_3px_rgba(176,137,47,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b0892f]/65">
                  Në pritje
                </div>
                {financialSummaryReady ? (
                  <>
                    <div className="mt-2 text-[28px] leading-none font-bold tracking-[-0.03em] text-[#b0892f]">
                      {fmtEur(summaryMetricsValue.pendingValue)}
                    </div>
                    <p className="mt-2 text-[11.5px] text-[#b0892f]/45">
                      {summaryMetricsValue.hasPaymentData
                        ? "Këste të papaguara"
                        : "Pa plan pagesash"}
                    </p>
                  </>
                ) : (
                  <div className="mt-2 space-y-2">
                    <div className="h-[28px] w-[148px] animate-pulse rounded-full bg-[#b0892f]/14" />
                    <div className="h-[11px] w-[112px] animate-pulse rounded-full bg-[#b0892f]/10" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <SummaryPeriodControls
            selectedMonth={selectedSummaryMonth}
            selectedYear={selectedSummaryYear}
            onMonthChange={onSummaryMonthChange}
            onYearChange={onSummaryYearChange}
          />
        </div>

        <div className="px-6 py-6">
          <div className="grid gap-4 xl:grid-cols-2">
            {investmentCards.map((card) => (
              <AnimatePresence key={card.label} mode="wait" initial={false}>
                <motion.div
                  className="executive-summary-metric"
                  key={`${card.label}-${selectedSummaryMotionKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: SOFT_EASE }}
                >
                  <HeroMetricCard {...card} />
                </motion.div>
              </AnimatePresence>
            ))}
          </div>

          <div className="mt-7 border-t border-[#edf0f4] pt-6">
            <SectionHeader
              title="Realizimi sipas kategorisë së pronësisë"
              subtitle={`Shitjet e realizuara dhe vlera e kontraktuar gjatë ${selectedSummaryPeriodLabel}`}
            />
            {!ownerCategoryReady && (
              <p className="mb-3 -mt-1 text-[12px] text-black/38">
                Duke ngarkuar ndarjen sipas kategorisë së pronësisë për periudhën e zgjedhur.
              </p>
            )}

            <div className="overflow-hidden rounded-[18px] border border-[#edf0f4]">
              <div className="executive-reports-scroll overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className={TABULAR_HEADER_ROW_CLASS}>
                      <th className={`px-5 py-3 text-left ${TABULAR_HEADER_LABEL_CLASS}`}>
                        Kategoria e pronësisë
                      </th>
                      <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                        Njësi të shitura
                      </th>
                      <th className={`px-5 py-3 text-right ${TABULAR_HEADER_LABEL_CLASS}`}>
                        Vlera e kontraktuar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerCategoryRows.map((row) => (
                      <tr key={row.category} className="border-t border-[#f0f0f2]">
                        <td className="px-5 py-3 text-[13px] font-medium text-black/70">
                          {row.category}
                        </td>
                        <td className="px-3 py-3 text-center text-[13px] text-black/65">
                          {`${formatCount(row.soldCount)} njësi`}
                        </td>
                        <td
                          className="px-5 py-3 text-right text-[13px] font-medium"
                          style={{
                            color: row.soldCount > 0 ? SOLD_COLOR : "rgba(0,0,0,0.65)",
                          }}
                        >
                          {fmtEur(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-7 border-t border-[#edf0f4] pt-6">
            <SectionHeader
              title="Ndarja sipas tipologjisë"
              subtitle={`Gjithsej / Në dispozicion janë aktuale për pronësinë Investitor · Të shitura / Vlera e kontraktuar gjatë ${selectedSummaryPeriodLabel}`}
            />
            {!typologyReady && (
              <p className="mb-3 -mt-1 text-[12px] text-black/38">
                Duke ngarkuar ndarjen sipas tipologjisë për periudhën e zgjedhur.
              </p>
            )}

            <div className="overflow-hidden rounded-[18px] border border-[#edf0f4]">
              <div className="executive-reports-scroll overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className={TABULAR_HEADER_ROW_CLASS}>
                      <th className={`px-5 py-3 text-left ${TABULAR_HEADER_LABEL_CLASS}`}>
                        Tipologjia
                      </th>
                      <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                        Gjithsej
                      </th>
                      <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                        Të shitura
                      </th>
                      <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                        Në dispozicion
                      </th>
                      <th className={`px-5 py-3 text-right ${TABULAR_HEADER_LABEL_CLASS}`}>
                        Vlera e kontraktuar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {typologyRows.map((row) => (
                      <tr key={row.typology} className="border-t border-[#f0f0f2]">
                        <td className="px-5 py-3 text-[13px] font-medium text-black/70">
                          {row.typology}
                        </td>
                        <td className="px-3 py-3 text-center text-[13px] text-black/65">
                          {formatCount(row.total)}
                        </td>
                        <td className="px-3 py-3 text-center text-[13px] text-black/65">
                          {formatCount(row.sold)}
                        </td>
                        <td className="px-3 py-3 text-center text-[13px] text-black/65">
                          {formatCount(row.available)}
                        </td>
                        <td className="px-5 py-3 text-right text-[13px] font-medium text-black/70">
                          {fmtEur(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.section>
  );
}
