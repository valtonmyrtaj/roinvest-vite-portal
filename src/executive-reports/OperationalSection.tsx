import { motion } from "framer-motion";
import { Eye, Phone, TrendingUp, Users } from "lucide-react";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import {
  TABULAR_HEADER_LABEL_CLASS,
  TABULAR_HEADER_ROW_CLASS,
} from "../components/ui/tabularHeader";
import type { DailyLogEntry } from "../hooks/useCRM";
import { Card, SectionHeader, StatCard } from "./primitives";
import {
  MONTH_LABELS,
  formatCount,
  getValue,
  sectionMotion,
  toDate,
  toNumber,
} from "./shared";

/**
 * "Aktiviteti operacional" — year-scoped rollup of the daily log
 * (calls / contacts / showings / sales) into four totals cards and a
 * per-month table. The year comes from the parent's summary-period
 * selector so this section stays in sync with the Investment period
 * without having its own control.
 */
export function OperationalSection({
  dailyLog,
  selectedSummaryYear,
}: {
  dailyLog: DailyLogEntry[];
  selectedSummaryYear: number;
}) {
  const operationalRowsThisYear = dailyLog
    .map((row) => ({
      date: toDate(getValue(row, ["date", "created_at"])),
      calls: toNumber(getValue(row, ["calls"])),
      contacts: toNumber(getValue(row, ["contacts"])),
      showings: toNumber(getValue(row, ["showings"])),
      sales: toNumber(getValue(row, ["sales"])),
    }))
    .filter((row) => row.date?.getFullYear() === selectedSummaryYear);

  const operationalTotals = operationalRowsThisYear.reduce(
    (acc, row) => ({
      calls: acc.calls + row.calls,
      contacts: acc.contacts + row.contacts,
      showings: acc.showings + row.showings,
      sales: acc.sales + row.sales,
    }),
    { calls: 0, contacts: 0, showings: 0, sales: 0 },
  );

  const operationalByMonth = MONTH_LABELS.map((month, index) => {
    const monthRows = operationalRowsThisYear.filter(
      (row) => row.date?.getMonth() === index,
    );
    return {
      month,
      calls: monthRows.reduce((sum, row) => sum + row.calls, 0),
      contacts: monthRows.reduce((sum, row) => sum + row.contacts, 0),
      showings: monthRows.reduce((sum, row) => sum + row.showings, 0),
      sales: monthRows.reduce((sum, row) => sum + row.sales, 0),
    };
  });

  return (
    <motion.section
      {...sectionMotion(0.11)}
      className="print-break executive-reports-section executive-reports-pagebreak"
    >
      <SectionHeader
        title="Aktiviteti operacional"
        subtitle={`Përmbledhja e regjistrit ditor për vitin ${selectedSummaryYear}`}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          label="Thirrje totale"
          value={formatCount(operationalTotals.calls)}
          icon={Phone}
          delay={0}
        />
        <StatCard
          label="Kontaktet totale"
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

      <Card className="mt-4 overflow-hidden p-0">
        <CardSectionHeader
          title="Përmbledhja mujore"
          className="border-b border-[#f0f0f2] px-5 py-3.5"
        />
        <div className="executive-reports-scroll overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className={TABULAR_HEADER_ROW_CLASS}>
                <th className={`px-5 py-3 text-left ${TABULAR_HEADER_LABEL_CLASS}`}>
                  Muaji
                </th>
                <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                  Thirrje
                </th>
                <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                  Kontaktet
                </th>
                <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                  Shfaqje
                </th>
                <th className={`px-5 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                  Shitje
                </th>
              </tr>
            </thead>
            <tbody>
              {operationalByMonth.map((row) => (
                <tr key={row.month} className="border-t border-[#f0f0f2]">
                  <td className="px-5 py-3 text-[13px] font-medium text-black/70">
                    {row.month}
                  </td>
                  <td className="px-3 py-3 text-center text-[13px] text-black/65">
                    {formatCount(row.calls)}
                  </td>
                  <td className="px-3 py-3 text-center text-[13px] text-black/65">
                    {formatCount(row.contacts)}
                  </td>
                  <td className="px-3 py-3 text-center text-[13px] text-black/65">
                    {formatCount(row.showings)}
                  </td>
                  <td className="px-5 py-3 text-center text-[13px] text-black/65">
                    {formatCount(row.sales)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.section>
  );
}
