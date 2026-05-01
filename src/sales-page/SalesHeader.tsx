import { motion } from "framer-motion";
import { CustomSelect } from "../components/CustomSelect";
import { PageHeader } from "../components/ui/PageHeader";
import { ALL_MONTHS_LABEL, SQ_MONTHS, YEAR_OPTIONS } from "./shared";

export function SalesHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <PageHeader
        tone="brand"
        title="Shitjet"
        subtitle="Kontrata, arkëtime dhe këste aktive"
        className="!mb-2 flex flex-wrap items-end justify-between gap-x-5 gap-y-2"
        bodyClassName="min-w-[320px] flex-1"
        contentClassName="max-w-[500px] translate-y-4"
        titleClassName="inline-block leading-[0.92]"
        subtitleClassName="!-mt-0.5 max-w-[420px]"
      />
    </motion.div>
  );
}

export function SalesPeriodControls({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: {
  selectedMonth: number | "all";
  selectedYear: number;
  onMonthChange: (month: number | "all") => void;
  onYearChange: (year: number) => void;
}) {
  return (
    <div className="flex w-full justify-end gap-2">
      <CustomSelect
        value={selectedMonth === "all" ? ALL_MONTHS_LABEL : SQ_MONTHS[selectedMonth]}
        onChange={(value) => {
          if (value === ALL_MONTHS_LABEL) {
            onMonthChange("all");
            return;
          }

          const nextMonth = SQ_MONTHS.findIndex((label) => label === value);
          if (nextMonth >= 0) onMonthChange(nextMonth);
        }}
        options={[ALL_MONTHS_LABEL, ...SQ_MONTHS]}
        size="sm"
        className="min-w-0 flex-1"
      />

      <CustomSelect
        value={String(selectedYear)}
        onChange={(value) => onYearChange(Number(value))}
        options={[...YEAR_OPTIONS]}
        size="sm"
        className="min-w-0 flex-1"
      />
    </div>
  );
}
