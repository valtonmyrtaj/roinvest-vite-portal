import { useState } from "react";
import { motion } from "framer-motion";
import { Printer } from "lucide-react";
import { useUnits } from "./hooks/useUnits";
import { useMarketing } from "./hooks/useMarketing";
import { useSaleReporting, useSaleTypologyBreakdown } from "./hooks/useSaleReporting";
import { useCRM } from "./hooks/useCRM";
import { NAVY, SOFT_EASE, YEAR_OPTIONS, sectionMotion } from "./executive-reports/shared";
import { ExecutiveReportsPrintStyle } from "./executive-reports/PrintStyle";
import { InvestmentSection } from "./executive-reports/InvestmentSection";
import { MarketingSection } from "./executive-reports/MarketingSection";
import { OperationalSection } from "./executive-reports/OperationalSection";
import { PageHeader } from "./components/ui/PageHeader";
import { PAGE_BG, SURFACE_BORDER } from "./ui/tokens";

/**
 * Executive Reports page — thin shell that:
 *   • calls the data-access hooks (units / marketing / CRM daily log /
 *     sale reporting per owner scope / sale typology breakdown)
 *   • owns the shared summary period state (year/month) that drives both
 *     the InvestmentSection reporting hooks and the OperationalSection
 *     year scope
 *   • renders the print stylesheet, the page header + print button, and
 *     composes the three sections
 *
 * All section-local derivation (normalized units, typology rows, owner-
 * category rows, hold-last-confirmed wrappers, marketing spend, operational
 * rollups) lives in its respective `./executive-reports/*Section.tsx` file.
 */
export default function ExecutiveReports() {
  const { units, loading: unitsLoading } = useUnits();
  const { marketingData, offlineEntries } = useMarketing();
  const { dailyLog } = useCRM();

  const currentDate = new Date();
  const defaultSummaryYear = YEAR_OPTIONS.includes(
    String(currentDate.getFullYear()) as (typeof YEAR_OPTIONS)[number],
  )
    ? currentDate.getFullYear()
    : Number(YEAR_OPTIONS[0]);
  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState(currentDate.getMonth());
  const [selectedSummaryYear, setSelectedSummaryYear] = useState(defaultSummaryYear);

  const reportingMonth = selectedSummaryMonth + 1;

  const {
    metrics: investorMetrics,
    loading: investorMetricsLoading,
    error: investorMetricsError,
  } = useSaleReporting({
    ownerScope: "Investitor",
    year: selectedSummaryYear,
    month: reportingMonth,
  });

  const {
    metrics: landownersMetrics,
    loading: landownersMetricsLoading,
    error: landownersMetricsError,
  } = useSaleReporting({
    ownerScope: "Pronarët e tokës",
    year: selectedSummaryYear,
    month: reportingMonth,
  });

  const {
    metrics: buildersMetrics,
    loading: buildersMetricsLoading,
    error: buildersMetricsError,
  } = useSaleReporting({
    ownerScope: "Kompani ndërtimore",
    year: selectedSummaryYear,
    month: reportingMonth,
  });

  const {
    rows: investorTypologyBreakdown,
    loading: investorTypologyLoading,
    error: investorTypologyError,
  } = useSaleTypologyBreakdown({
    ownerScope: "Investitor",
    year: selectedSummaryYear,
    month: reportingMonth,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: SOFT_EASE }}
      style={{ background: PAGE_BG }}
    >
      <ExecutiveReportsPrintStyle />

      <div className="executive-report-content executive-reports-root mx-auto max-w-[1280px] px-10 py-9">
        <motion.div
          {...sectionMotion()}
          className="mb-10"
        >
          <PageHeader
            title="Raportet"
            subtitle="Pasqyra e plotë e investimit — UF Partners Residence"
            className="mb-0"
            titleStyle={{ color: NAVY }}
            subtitleClassName="mt-[2px] text-[13px] font-normal"
            subtitleStyle={{ color: "#9ca3af" }}
            right={
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="print-hide executive-reports-print-hide inline-flex h-[40px] items-center gap-2 rounded-[12px] border bg-white px-4 text-[13px] font-medium transition hover:border-[#c3d2ea] hover:bg-[#fafcff]"
                style={{ color: NAVY, borderColor: SURFACE_BORDER }}
              >
                <Printer size={15} strokeWidth={2} />
                Eksporto PDF
              </button>
            }
          />
        </motion.div>

        <InvestmentSection
          units={units}
          unitsLoading={unitsLoading}
          investorMetrics={investorMetrics}
          investorMetricsLoading={investorMetricsLoading}
          investorMetricsError={investorMetricsError}
          landownersMetrics={landownersMetrics}
          landownersMetricsLoading={landownersMetricsLoading}
          landownersMetricsError={landownersMetricsError}
          buildersMetrics={buildersMetrics}
          buildersMetricsLoading={buildersMetricsLoading}
          buildersMetricsError={buildersMetricsError}
          investorTypologyBreakdown={investorTypologyBreakdown}
          investorTypologyLoading={investorTypologyLoading}
          investorTypologyError={investorTypologyError}
          selectedSummaryMonth={selectedSummaryMonth}
          selectedSummaryYear={selectedSummaryYear}
          onSummaryMonthChange={setSelectedSummaryMonth}
          onSummaryYearChange={setSelectedSummaryYear}
        />

        <MarketingSection
          marketingData={marketingData}
          offlineEntries={offlineEntries}
        />

        <OperationalSection
          dailyLog={dailyLog}
          selectedSummaryYear={selectedSummaryYear}
        />
      </div>
    </motion.div>
  );
}
