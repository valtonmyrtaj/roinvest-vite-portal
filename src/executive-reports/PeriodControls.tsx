import { CustomSelect } from "../components/CustomSelect";
import { MONTH_LABELS, YEAR_OPTIONS } from "./shared";

const ALL_MONTHS_OPTION = "Të gjithë muajt";

function PeriodControls({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  className = "",
}: {
  selectedMonth: number | null;
  selectedYear: number;
  onMonthChange: (month: number | null) => void;
  onYearChange: (year: number) => void;
  className?: string;
}) {
  return (
    <div className={`executive-reports-print-hide flex flex-wrap items-center justify-end gap-2 ${className}`.trim()}>
      <div className="w-[168px]">
        <CustomSelect
          value={selectedMonth === null ? ALL_MONTHS_OPTION : MONTH_LABELS[selectedMonth]}
          onChange={(value) => {
            if (value === ALL_MONTHS_OPTION) {
              onMonthChange(null);
              return;
            }

            const nextMonth = MONTH_LABELS.findIndex((label) => label === value);
            if (nextMonth >= 0) onMonthChange(nextMonth);
          }}
          options={[ALL_MONTHS_OPTION, ...MONTH_LABELS]}
          placeholder="Muaji"
          size="sm"
        />
      </div>
      <div className="w-[112px]">
        <CustomSelect
          value={String(selectedYear)}
          onChange={(value) => {
            const nextYear = Number(value);
            if (Number.isFinite(nextYear)) onYearChange(nextYear);
          }}
          options={[...YEAR_OPTIONS]}
          placeholder="Viti"
          size="sm"
        />
      </div>
    </div>
  );
}

export function SummaryPeriodControls({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: {
  selectedMonth: number | null;
  selectedYear: number;
  onMonthChange: (month: number | null) => void;
  onYearChange: (year: number) => void;
}) {
  return (
    <PeriodControls
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      onMonthChange={onMonthChange}
      onYearChange={onYearChange}
    />
  );
}

export function MarketingPeriodControls({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: {
  selectedMonth: number | null;
  selectedYear: number;
  onMonthChange: (month: number | null) => void;
  onYearChange: (year: number) => void;
}) {
  return (
    <PeriodControls
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      onMonthChange={onMonthChange}
      onYearChange={onYearChange}
    />
  );
}
