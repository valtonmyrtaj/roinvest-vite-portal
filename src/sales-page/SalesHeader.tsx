import { motion } from "framer-motion";
import { CustomSelect } from "../components/CustomSelect";
import { PageHeader } from "../components/ui/PageHeader";
import { ALL_MONTHS_LABEL, SQ_MONTHS, YEAR_OPTIONS } from "./shared";

export function SalesHeader({
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <PageHeader
        tone="brand"
        title="Shitjet"
        subtitle="Kontrata, arkëtime dhe këste aktive"
        className="mb-1.5 flex flex-wrap items-end justify-between gap-x-5 gap-y-2"
        bodyClassName="min-w-[320px] flex-1"
        contentClassName="max-w-[500px]"
        titleClassName="inline-block leading-[0.92]"
        subtitleClassName="!-mt-0.5 max-w-[420px]"
        rightClassName="w-full sm:w-auto"
        right={
          <div className="flex items-end gap-2 rounded-[16px] border border-black/[0.05] bg-[#fcfcfd] px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
            <div className="grid gap-2 sm:grid-cols-[136px_104px]">
              <label className="flex flex-col gap-1">
                <span className="pl-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-black/28">
                  Muaji
                </span>
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
                  placeholder="Muaji"
                  size="sm"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="pl-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-black/28">
                  Viti
                </span>
                <CustomSelect
                  value={String(selectedYear)}
                  onChange={(value) => onYearChange(Number(value))}
                  options={[...YEAR_OPTIONS]}
                  placeholder="Viti"
                  size="sm"
                />
              </label>
            </div>
          </div>
        }
      />
    </motion.div>
  );
}
