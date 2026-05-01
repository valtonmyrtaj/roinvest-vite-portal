import { useState } from "react";
import { motion } from "framer-motion";
import { Printer } from "lucide-react";
import { useUnits } from "./hooks/useUnits";
import { useMarketing } from "./hooks/useMarketing";
import {
  useSaleReporting,
  useSaleTypologyBreakdown,
} from "./hooks/useSaleReporting";
import { useCRM } from "./hooks/useCRM";
import {
  MONTH_LABELS,
  NAVY,
  SOFT_EASE,
  YEAR_OPTIONS,
  sectionMotion,
} from "./executive-reports/shared";
import { ExecutiveReportsPrintStyle } from "./executive-reports/PrintStyle";
import { InvestmentSection } from "./executive-reports/InvestmentSection";
import { MarketingSection } from "./executive-reports/MarketingSection";
import { OperationalSection } from "./executive-reports/OperationalSection";
import { SummaryPeriodControls } from "./executive-reports/PeriodControls";
import { PageHeader } from "./components/ui/PageHeader";
import { PAGE_BG, SURFACE_BORDER } from "./ui/tokens";

/**
 * Executive Reports page — thin shell that:
 *   • calls the data-access hooks (units / marketing / CRM daily log /
 *     sale reporting per owner scope / sale typology breakdown)
 *   • owns the shared report period state (year/month) that drives the
 *     investment, marketing, and operational report context
 *   • renders the print stylesheet, the page header + print button, and
 *     composes the three sections
 *
 * All section-local derivation (normalized units, typology rows, owner-
 * category rows, hold-last-confirmed wrappers, marketing spend, operational
 * rollups) lives in its respective `./executive-reports/*Section.tsx` file.
 */
export default function ExecutiveReports() {
  const { units } = useUnits();
  const { marketingData, offlineEntries } = useMarketing();
  const { dailyLog } = useCRM({ loadLeads: false, loadShowings: false });

  const [generatedAt] = useState(() => new Date());
  const currentDate = generatedAt;
  const defaultSummaryYear = YEAR_OPTIONS.includes(
    String(currentDate.getFullYear()) as (typeof YEAR_OPTIONS)[number],
  )
    ? currentDate.getFullYear()
    : Number(YEAR_OPTIONS[0]);
  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState<number | null>(
    currentDate.getMonth(),
  );
  const [selectedSummaryYear, setSelectedSummaryYear] = useState(defaultSummaryYear);

  const reportingMonth = selectedSummaryMonth === null ? null : selectedSummaryMonth + 1;
  const previousSummaryMonth =
    selectedSummaryMonth === null
      ? null
      : selectedSummaryMonth === 0
        ? 11
        : selectedSummaryMonth - 1;
  const previousSummaryYear =
    selectedSummaryMonth === 0 ? selectedSummaryYear - 1 : selectedSummaryYear;
  const previousReportingMonth =
    previousSummaryMonth === null ? null : previousSummaryMonth + 1;

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
    metrics: investorPreviousMetrics,
    loading: investorPreviousMetricsLoading,
    error: investorPreviousMetricsError,
  } = useSaleReporting({
    ownerScope: "Investitor",
    year: previousSummaryYear,
    month: previousReportingMonth,
    enabled: selectedSummaryMonth !== null,
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

  const selectedSummaryPeriodLabel =
    selectedSummaryMonth === null
      ? `Të gjithë muajt ${selectedSummaryYear}`
      : `${MONTH_LABELS[selectedSummaryMonth]} ${selectedSummaryYear}`;
  const generatedAtLabel = [
    `${String(generatedAt.getDate()).padStart(2, "0")} ${MONTH_LABELS[
      generatedAt.getMonth()
    ].toLowerCase()} ${generatedAt.getFullYear()}`,
    `${String(generatedAt.getHours()).padStart(2, "0")}:${String(
      generatedAt.getMinutes(),
    ).padStart(2, "0")}`,
  ].join(", ");

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
          className="mb-[30px]"
        >
          <PageHeader
            tone="brand"
            eyebrow={`Raporti ekzekutiv · ${selectedSummaryPeriodLabel}`}
            title="Raportet"
            subtitle="UF Partners Residence"
            className="mb-0 items-center"
            rightClassName="lg:translate-y-5"
            titleClassName="!text-[28px] !font-bold leading-none"
            right={
              <div className="flex flex-wrap items-center justify-end gap-3">
                <SummaryPeriodControls
                  selectedMonth={selectedSummaryMonth}
                  selectedYear={selectedSummaryYear}
                  onMonthChange={setSelectedSummaryMonth}
                  onYearChange={setSelectedSummaryYear}
                />
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
              </div>
            }
          />
        </motion.div>

        <InvestmentSection
          units={units}
          investorMetrics={investorMetrics}
          investorMetricsLoading={investorMetricsLoading}
          investorMetricsError={investorMetricsError}
          investorPreviousMetrics={investorPreviousMetrics}
          investorPreviousMetricsLoading={investorPreviousMetricsLoading}
          investorPreviousMetricsError={investorPreviousMetricsError}
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
        />

        <MarketingSection
          marketingData={marketingData}
          offlineEntries={offlineEntries}
          selectedMarketingMonth={selectedSummaryMonth}
          selectedMarketingYear={selectedSummaryYear}
        />

        <OperationalSection
          dailyLog={dailyLog}
          selectedSummaryMonth={selectedSummaryMonth}
          selectedSummaryYear={selectedSummaryYear}
        />

        <motion.footer
          {...sectionMotion(3)}
          className="mt-12 border-t px-1 pt-5 text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ borderColor: SURFACE_BORDER, color: "rgba(0,56,131,0.48)" }}
        >
          Gjeneruar më {generatedAtLabel} · Periudha {selectedSummaryPeriodLabel} · UF Partners
          Residence
        </motion.footer>
      </div>
    </motion.div>
  );
}
