import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react";
import { Eye, Phone, TrendingUp, Users } from "lucide-react";
import type { CreateDailyLogInput, DailyLogEntry } from "../hooks/useCRM";
import { MONTH_LABELS, TODAY_ISO, YEAR_OPTIONS, toDateOnly } from "./shared";
import { DailyLogSummary } from "./daily-log/DailyLogSummary";
import { DailyLogTable } from "./daily-log/DailyLogTable";

type SummaryTotals = {
  calls: number;
  contacts: number;
  showings: number;
  sales: number;
};

type SummaryMetricKey = keyof SummaryTotals;

function emptyTotals(): SummaryTotals {
  return { calls: 0, contacts: 0, showings: 0, sales: 0 };
}

function sumRows(rows: DailyLogEntry[]): SummaryTotals {
  return rows.reduce<SummaryTotals>(
    (acc, row) => ({
      calls: acc.calls + (row.calls ?? 0),
      contacts: acc.contacts + (row.contacts ?? 0),
      showings: acc.showings + (row.showings ?? 0),
      sales: acc.sales + (row.sales ?? 0),
    }),
    emptyTotals(),
  );
}

export function DailyLogSection({
  entries,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: {
  entries: DailyLogEntry[];
  loading: boolean;
  onCreate: (data: CreateDailyLogInput) => Promise<{ error?: string; data?: DailyLogEntry }>;
  onUpdate: (
    id: string,
    data: Partial<CreateDailyLogInput>,
  ) => Promise<{ error?: string; data?: DailyLogEntry }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
}) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summaryStarted, setSummaryStarted] = useState(false);

  useEffect(() => {
    if (loading) return;
    const timeout = window.setTimeout(() => setSummaryStarted(true), 80);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  const now = new Date();
  const thisYear = now.getFullYear();

  const yearOptions = useMemo(() => {
    const years = new Set<number>(YEAR_OPTIONS.map(Number));
    years.add(thisYear);
    entries.forEach((entry) => {
      years.add(new Date(entry.date).getFullYear());
    });

    return Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => String(year));
  }, [entries, thisYear]);

  const activeSelectedYear =
    yearOptions.length > 0 && !yearOptions.includes(String(selectedYear))
      ? Number(yearOptions[0])
      : selectedYear;

  const allEntriesByDate = useMemo(
    () => [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries],
  );

  const filteredEntries = useMemo(
    () =>
      allEntriesByDate.filter((entry) => {
        const date = new Date(entry.date);
        return date.getFullYear() === activeSelectedYear && date.getMonth() === selectedMonth;
      }),
    [activeSelectedYear, allEntriesByDate, selectedMonth],
  );

  const activeSelectedEntryId = useMemo(() => {
    if (filteredEntries.length === 0) return null;
    return selectedEntryId && filteredEntries.some((entry) => entry.id === selectedEntryId)
      ? selectedEntryId
      : filteredEntries[0].id;
  }, [filteredEntries, selectedEntryId]);

  const todayEntry = useMemo(
    () => allEntriesByDate.find((entry) => toDateOnly(entry.date) === TODAY_ISO) ?? null,
    [allEntriesByDate],
  );

  const annualChartData = useMemo(
    () =>
      MONTH_LABELS.map((label, monthIndex) => ({
        month: label,
        ...sumRows(
          entries.filter((entry) => {
            const date = new Date(entry.date);
            return date.getFullYear() === activeSelectedYear && date.getMonth() === monthIndex;
          }),
        ),
      })),
    [activeSelectedYear, entries],
  );

  const metricConfigs: Array<{
    key: SummaryMetricKey;
    label: string;
    icon: ComponentType<{ size?: number; style?: CSSProperties; strokeWidth?: number }>;
    delay: number;
  }> = [
    { key: "calls", label: "Thirrje", icon: Phone, delay: 0 },
    { key: "contacts", label: "Kontakte", icon: Users, delay: 0.06 },
    { key: "showings", label: "Shfaqje", icon: Eye, delay: 0.12 },
    { key: "sales", label: "Shitje", icon: TrendingUp, delay: 0.18 },
  ];

  const summaryMetrics = metricConfigs.map((metric) => ({
    key: metric.key,
    label: metric.label,
    icon: metric.icon,
    delay: metric.delay,
    curr: todayEntry?.[metric.key] ?? 0,
  }));

  const todayDate = new Date();
  const todayLabel = `Sot · ${String(todayDate.getDate()).padStart(2, "0")} ${
    MONTH_LABELS[todayDate.getMonth()]
  } ${todayDate.getFullYear()}`;

  return (
    <div>
      <DailyLogSummary
        summaryMetrics={summaryMetrics}
        summaryStarted={summaryStarted}
        todayLabel={todayLabel}
        selectedMonth={selectedMonth}
        selectedYear={activeSelectedYear}
        annualChartData={annualChartData}
      />

      <DailyLogTable
        loading={loading}
        selectedMonth={selectedMonth}
        selectedYear={activeSelectedYear}
        yearOptions={yearOptions}
        filteredEntries={filteredEntries}
        selectedEntryId={activeSelectedEntryId}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        onSelectEntry={setSelectedEntryId}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
}
