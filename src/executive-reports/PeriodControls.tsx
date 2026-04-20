import { CustomSelect } from "../components/CustomSelect";
import { MONTH_LABELS, YEAR_OPTIONS } from "./shared";

/**
 * Two month+year dropdown pairs used by Executive Reports: one for the
 * "Pasqyra e investimit" period and one for the "Marketingu" period.
 * They share the same vocabulary (months, YEAR_OPTIONS) but differ in
 * pixel widths — preserved verbatim from the original layout.
 */

export function SummaryPeriodControls({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}) {
  return (
    <div className="executive-reports-print-hide flex items-center gap-2">
      <div className="w-[136px]">
        <CustomSelect
          value={MONTH_LABELS[selectedMonth]}
          onChange={(value) => {
            const nextMonth = MONTH_LABELS.findIndex((label) => label === value);
            if (nextMonth >= 0) onMonthChange(nextMonth);
          }}
          options={[...MONTH_LABELS]}
          placeholder="Muaji"
          size="sm"
        />
      </div>
      <div className="w-[108px]">
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

export function MarketingPeriodControls({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}) {
  return (
    <div className="executive-reports-print-hide flex items-center gap-2">
      <div className="w-[130px]">
        <CustomSelect
          value={MONTH_LABELS[selectedMonth]}
          onChange={(value) => {
            const nextMonth = MONTH_LABELS.findIndex((label) => label === value);
            if (nextMonth >= 0) onMonthChange(nextMonth);
          }}
          options={[...MONTH_LABELS]}
          placeholder="Muaji"
          size="sm"
        />
      </div>
      <div className="w-[88px]">
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
