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
        subtitle="Pasqyrë e shitjeve, arkëtimeve dhe kësteve të ardhshme · Pronësia Investitor · Regjistër vjetor"
        className="mb-4 flex flex-wrap items-stretch justify-between gap-x-6 gap-y-4 pt-1"
        bodyClassName="min-w-[320px] flex-1"
        contentClassName="flex min-h-[74px] max-w-[620px] flex-col justify-center"
        titleClassName="inline-block"
        subtitleClassName="max-w-[500px]"
        right={
          <div className="flex min-h-[74px] items-end gap-2 rounded-[14px] border border-black/[0.05] bg-[#fcfcfd] px-2.5 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
            <label className="flex w-[136px] flex-col gap-1">
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

            <label className="flex w-[104px] flex-col gap-1">
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
        }
      />
    </motion.div>
  );
}
