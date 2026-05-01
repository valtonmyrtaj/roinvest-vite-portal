import { motion } from "framer-motion";
import { Eye, Phone, TrendingUp, Users } from "lucide-react";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import type { DailyLogEntry } from "../hooks/useCRM";
import { Card, StatCard } from "./primitives";
import {
  formatCount,
  formatMonthYear,
  getValue,
  cardMotion,
  sectionMotion,
  toDate,
  toNumber,
} from "./shared";

const OPERATIONAL_SECTION_TITLE_STYLE = {
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "0em",
  lineHeight: 1.18,
};

const OPERATIONAL_SECTION_SUBTITLE_STYLE = {
  fontSize: 11.75,
  fontWeight: 500,
  lineHeight: 1.35,
};

/**
 * "Aktiviteti operacional" — selected-period rollup of the daily log
 * (calls / contacts / showings / sales) into four totals cards.
 * The period comes from the parent's summary-period selector so this
 * section stays in sync with the Investment and Marketing sections
 * without having its own control.
 */
export function OperationalSection({
  dailyLog,
  selectedSummaryMonth,
  selectedSummaryYear,
}: {
  dailyLog: DailyLogEntry[];
  selectedSummaryMonth: number | null;
  selectedSummaryYear: number;
}) {
  const operationalPeriodLabel =
    selectedSummaryMonth === null
      ? `Të gjithë muajt ${selectedSummaryYear}`
      : formatMonthYear(new Date(selectedSummaryYear, selectedSummaryMonth, 1));

  const operationalRowsForPeriod = dailyLog
    .map((row) => ({
      date: toDate(getValue(row, ["date", "created_at"])),
      calls: toNumber(getValue(row, ["calls"])),
      contacts: toNumber(getValue(row, ["contacts"])),
      showings: toNumber(getValue(row, ["showings"])),
      sales: toNumber(getValue(row, ["sales"])),
    }))
    .filter(
      (row) =>
        row.date?.getFullYear() === selectedSummaryYear &&
        (selectedSummaryMonth === null || row.date.getMonth() === selectedSummaryMonth),
    );

  const operationalTotals = operationalRowsForPeriod.reduce(
    (acc, row) => ({
      calls: acc.calls + row.calls,
      contacts: acc.contacts + row.contacts,
      showings: acc.showings + row.showings,
      sales: acc.sales + row.sales,
    }),
    { calls: 0, contacts: 0, showings: 0, sales: 0 },
  );

  return (
    <motion.section
      {...sectionMotion(0.11)}
      className="executive-reports-section executive-reports-pagebreak"
    >
      <motion.div {...cardMotion(0)}>
        <Card className="p-0">
          <CardSectionHeader
            title="Aktiviteti operacional"
            subtitle={`Përmbledhja e regjistrit ditor për ${operationalPeriodLabel}`}
            density="spacious"
            titleStyle={OPERATIONAL_SECTION_TITLE_STYLE}
            subtitleStyle={OPERATIONAL_SECTION_SUBTITLE_STYLE}
          />

          <div className="executive-reports-operational-grid grid gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Thirrje totale"
              value={formatCount(operationalTotals.calls)}
              icon={Phone}
              delay={0}
            />
            <StatCard
              label="Kontakte totale"
              value={formatCount(operationalTotals.contacts)}
              icon={Users}
              delay={0.05}
            />
            <StatCard
              label="Shfaqje totale"
              value={formatCount(operationalTotals.showings)}
              icon={Eye}
              delay={0.1}
            />
            <StatCard
              label="Shitje totale"
              value={formatCount(operationalTotals.sales)}
              icon={TrendingUp}
              delay={0.15}
            />
          </div>
        </Card>
      </motion.div>
    </motion.section>
  );
}
