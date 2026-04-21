import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import type { MarketingRow, OfflineEntry } from "../hooks/useMarketing";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { Card, SectionHeader } from "./primitives";
import {
  NAVY,
  YEAR_OPTIONS,
  cardMotion,
  formatMonthYear,
  getValue,
  monthIndexFromValue,
  sectionMotion,
  toDate,
  toNumber,
} from "./shared";
import { MarketingPeriodControls } from "./PeriodControls";

/**
 * "Marketingu" — the single-card marketing-spend summary for a chosen
 * month/year. Normalizes both the online marketing rows and the offline
 * entries through the same loose-date/amount parser, then sums spend
 * for the selected period.
 *
 * State for the selected period is intentionally local to this section:
 * it is not consumed by any other section of the page.
 */
export function MarketingSection({
  marketingData,
  offlineEntries,
}: {
  marketingData: MarketingRow[];
  offlineEntries: OfflineEntry[];
}) {
  const currentDate = new Date();
  const currentMarketingYear = currentDate.getFullYear();
  const currentMarketingMonthIndex = currentDate.getMonth();
  const defaultMarketingYear = YEAR_OPTIONS.includes(
    String(currentMarketingYear) as (typeof YEAR_OPTIONS)[number],
  )
    ? currentMarketingYear
    : Number(YEAR_OPTIONS[0]);

  const [selectedMarketingMonth, setSelectedMarketingMonth] = useState(
    currentMarketingMonthIndex,
  );
  const [selectedMarketingYear, setSelectedMarketingYear] = useState(defaultMarketingYear);

  const marketingRows = useMemo(
    () =>
      [...marketingData, ...offlineEntries].map((row) => {
        const spend = toNumber(
          getValue(row, [
            "spend_facebook",
            "amount",
            "spend",
            "cost",
            "budget",
            "value",
            "total_spend",
            "shpenzime",
            "spent",
          ]),
        );
        const directDate = toDate(
          getValue(row, ["date", "created_at", "entry_date", "month_year", "period"]),
        );
        const fallbackYear = toNumber(getValue(row, ["year", "report_year"]));
        const monthIndex = monthIndexFromValue(
          getValue(row, ["month_number", "month", "month_name", "period_month"]),
        );
        const date =
          directDate ??
          (fallbackYear > 0 && monthIndex !== null
            ? new Date(fallbackYear, monthIndex, 1)
            : null);

        return { spend, date };
      }),
    [marketingData, offlineEntries],
  );

  const selectedMarketingSpend = useMemo(
    () =>
      marketingRows
        .filter(
          (row) =>
            row.date?.getFullYear() === selectedMarketingYear &&
            row.date?.getMonth() === selectedMarketingMonth,
        )
        .reduce((sum, row) => sum + row.spend, 0),
    [marketingRows, selectedMarketingMonth, selectedMarketingYear],
  );
  const selectedMarketingLabel = formatMonthYear(
    new Date(selectedMarketingYear, selectedMarketingMonth, 1),
  );

  return (
    <motion.section
      {...sectionMotion(0.08)}
      className="print-break executive-reports-section executive-reports-pagebreak mb-9"
    >
      <SectionHeader
        title="Marketingu"
        subtitle="Përmbledhje e shpenzimeve të marketingut për periudhën e zgjedhur."
      />

      <motion.div {...cardMotion(0)} className="max-w-[420px]">
        <Card className="overflow-hidden p-0">
          <CardSectionHeader
            title="Shpenzime totale"
            className="border-b border-[#edf0f4] px-5 py-3.5"
            right={
              <MarketingPeriodControls
                selectedMonth={selectedMarketingMonth}
                selectedYear={selectedMarketingYear}
                onMonthChange={setSelectedMarketingMonth}
                onYearChange={setSelectedMarketingYear}
              />
            }
          />

          <div className="px-5 py-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#eaf0fa]">
              <Megaphone size={16} style={{ color: NAVY }} strokeWidth={1.9} />
            </div>

            <p
              className="text-[32px] leading-none tracking-[-0.03em]"
              style={{ fontWeight: 700, color: NAVY }}
            >
              {fmtEur(selectedMarketingSpend)}
            </p>
            <p className="mt-2 text-[12px] font-normal" style={{ color: "#9ca3af" }}>
              Digjital + offline · {selectedMarketingLabel}
            </p>
          </div>
        </Card>
      </motion.div>
    </motion.section>
  );
}
