import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Megaphone,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import type { MarketingRow, OfflineEntry } from "../hooks/useMarketing";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { Card } from "./primitives";
import {
  NAVY,
  cardMotion,
  formatCount,
  formatMonthYear,
  formatPercent,
  getValue,
  monthIndexFromValue,
  sectionMotion,
  toDate,
  toNumber,
  type IconType,
} from "./shared";

const MARKETING_SECTION_TITLE_STYLE = {
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "0em",
  lineHeight: 1.18,
};

const MARKETING_SECTION_SUBTITLE_STYLE = {
  fontSize: 11.75,
  fontWeight: 500,
  lineHeight: 1.35,
};

type MarketingDigitalRow = {
  spend: number;
  views: number;
  leads: number;
  date: Date | null;
};

type MarketingOfflineRow = {
  spend: number;
  date: Date | null;
};

function periodDateFromRow(row: MarketingRow | OfflineEntry): Date | null {
  const fallbackYear = toNumber(getValue(row, ["year", "report_year"]));
  const monthIndex = monthIndexFromValue(
    getValue(row, ["month_number", "month", "month_name", "period_month"]),
  );

  if (fallbackYear > 0 && monthIndex !== null) {
    return new Date(fallbackYear, monthIndex, 1);
  }

  const directDate = toDate(
    getValue(row, ["date", "entry_date", "month_year", "period"]),
  );
  return directDate ? new Date(directDate.getFullYear(), directDate.getMonth(), 1) : null;
}

function normalizeDigitalRows(rows: MarketingRow[]): MarketingDigitalRow[] {
  return rows.map((row) => ({
    spend: toNumber(row.spend_facebook),
    views: toNumber(row.views_facebook) + toNumber(row.views_tiktok),
    leads:
      toNumber(row.leads_facebook) +
      toNumber(row.leads_instagram) +
      toNumber(row.leads_tiktok),
    date: periodDateFromRow(row),
  }));
}

function normalizeOfflineRows(rows: OfflineEntry[]): MarketingOfflineRow[] {
  return rows.map((row) => {
    if (row.period_type === "Vjetore") {
      const entryDate = toDate(row.date);

      return {
        spend: toNumber(row.amount),
        date: entryDate ? new Date(row.year, entryDate.getMonth(), 1) : null,
      };
    }

    const monthIndex = monthIndexFromValue(row.month);

    return {
      spend: toNumber(row.amount),
      date: monthIndex === null ? periodDateFromRow(row) : new Date(row.year, monthIndex, 1),
    };
  });
}

function matchesPeriod(date: Date | null, selectedYear: number, selectedMonth: number | null) {
  return (
    date?.getFullYear() === selectedYear &&
    (selectedMonth === null || date.getMonth() === selectedMonth)
  );
}

function getPreviousPeriod(selectedYear: number, selectedMonth: number | null) {
  if (selectedMonth === null) {
    return {
      year: selectedYear - 1,
      month: null,
      label: `${selectedYear - 1}`,
    };
  }

  const previousMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const previousYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  return {
    year: previousYear,
    month: previousMonth,
    label: formatMonthYear(new Date(previousYear, previousMonth, 1)),
  };
}

function aggregateDigitalRows(
  rows: MarketingDigitalRow[],
  selectedYear: number,
  selectedMonth: number | null,
) {
  return rows
    .filter((row) => matchesPeriod(row.date, selectedYear, selectedMonth))
    .reduce(
      (total, row) => ({
        spend: total.spend + row.spend,
        views: total.views + row.views,
        leads: total.leads + row.leads,
      }),
      { spend: 0, views: 0, leads: 0 },
    );
}

function sumOfflineSpend(
  rows: MarketingOfflineRow[],
  selectedYear: number,
  selectedMonth: number | null,
) {
  return rows
    .filter((row) => matchesPeriod(row.date, selectedYear, selectedMonth))
    .reduce((sum, row) => sum + row.spend, 0);
}

function MarketingKpiCard({
  label,
  value,
  detail,
  previousValue,
  comparisonLabel,
  format,
  icon: Icon,
  delay,
}: {
  label: string;
  value: number;
  detail: string;
  previousValue: number | null;
  comparisonLabel: string;
  format: (value: number) => string;
  icon: IconType;
  delay: number;
}) {
  const delta =
    previousValue !== null && previousValue > 0
      ? ((value - previousValue) / previousValue) * 100
      : null;
  const deltaPositive = delta !== null && delta >= 0;

  return (
    <motion.div
      {...cardMotion(delay)}
      className="executive-reports-marketing-card rounded-[16px] border border-[#e8e8ec] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)]"
    >
      <div className="mb-7 flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#eef3fb]">
          <Icon size={15} style={{ color: NAVY }} strokeWidth={1.9} />
        </div>
        {delta !== null ? (
          <div
            className="inline-flex items-center gap-1 rounded-full px-2 py-1"
            style={{ backgroundColor: deltaPositive ? "#f0f7f3" : "#fdf3f3" }}
          >
            {deltaPositive ? (
              <TrendingUp size={11} style={{ color: "#3c7a57" }} strokeWidth={2} />
            ) : (
              <TrendingDown size={11} style={{ color: "#b14b4b" }} strokeWidth={2} />
            )}
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: deltaPositive ? "#3c7a57" : "#b14b4b" }}
            >
              {deltaPositive ? "+" : ""}
              {formatPercent(delta)}
            </span>
          </div>
        ) : null}
      </div>
      <p
        className="text-[30px] font-bold leading-none tracking-[-0.04em] tabular-nums"
        style={{ color: NAVY }}
      >
        {format(value)}
      </p>
      <p className="mt-2 text-[12.5px] font-semibold text-black/52">{label}</p>
      <p className="mt-1 text-[11.5px] text-black/34">
        {previousValue !== null && previousValue > 0
          ? `${format(previousValue)} ${comparisonLabel}`
          : detail}
      </p>
    </motion.div>
  );
}

/**
 * "Marketingu" — executive-report version of the Marketing page summary row.
 * The section stays intentionally small: total spend, digital reach,
 * contacts, and digital/offline spend cards for the selected period.
 */
export function MarketingSection({
  marketingData,
  offlineEntries,
  selectedMarketingMonth,
  selectedMarketingYear,
}: {
  marketingData: MarketingRow[];
  offlineEntries: OfflineEntry[];
  selectedMarketingMonth: number | null;
  selectedMarketingYear: number;
}) {
  const digitalRows = useMemo(() => normalizeDigitalRows(marketingData), [marketingData]);
  const offlineRows = useMemo(() => normalizeOfflineRows(offlineEntries), [offlineEntries]);
  const previousPeriod = getPreviousPeriod(selectedMarketingYear, selectedMarketingMonth);

  const currentDigital = useMemo(
    () => aggregateDigitalRows(digitalRows, selectedMarketingYear, selectedMarketingMonth),
    [digitalRows, selectedMarketingMonth, selectedMarketingYear],
  );
  const previousDigital = useMemo(
    () => aggregateDigitalRows(digitalRows, previousPeriod.year, previousPeriod.month),
    [digitalRows, previousPeriod.month, previousPeriod.year],
  );
  const currentOfflineSpend = useMemo(
    () => sumOfflineSpend(offlineRows, selectedMarketingYear, selectedMarketingMonth),
    [offlineRows, selectedMarketingMonth, selectedMarketingYear],
  );
  const previousOfflineSpend = useMemo(
    () => sumOfflineSpend(offlineRows, previousPeriod.year, previousPeriod.month),
    [offlineRows, previousPeriod.month, previousPeriod.year],
  );

  const selectedMarketingSpend = currentDigital.spend + currentOfflineSpend;
  const previousMarketingSpend = previousDigital.spend + previousOfflineSpend;
  const selectedMarketingLabel =
    selectedMarketingMonth === null
      ? `Të gjithë muajt ${selectedMarketingYear}`
      : formatMonthYear(new Date(selectedMarketingYear, selectedMarketingMonth, 1));
  const comparisonLabel =
    selectedMarketingMonth === null
      ? "kundrejt vitit të kaluar"
      : `kundrejt ${previousPeriod.label}`;

  return (
    <motion.section
      {...sectionMotion(0.08)}
      className="executive-reports-section executive-reports-pagebreak executive-reports-print-page-2 mb-9"
    >
      <motion.div {...cardMotion(0)}>
        <Card className="p-0">
          <CardSectionHeader
            title="Marketingu"
            subtitle={`Treguesit kryesorë të marketingut për ${selectedMarketingLabel}.`}
            density="spacious"
            titleStyle={MARKETING_SECTION_TITLE_STYLE}
            subtitleStyle={MARKETING_SECTION_SUBTITLE_STYLE}
          />

          <div className="executive-reports-marketing-grid grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-5">
            <MarketingKpiCard
              label="Shpenzimet totale"
              value={selectedMarketingSpend}
              detail="Digjital dhe offline"
              previousValue={previousMarketingSpend > 0 ? previousMarketingSpend : null}
              comparisonLabel={comparisonLabel}
              format={fmtEur}
              icon={TrendingUp}
              delay={0}
            />
            <MarketingKpiCard
              label="Shikimet totale"
              value={currentDigital.views}
              detail="Facebook dhe TikTok"
              previousValue={previousDigital.views > 0 ? previousDigital.views : null}
              comparisonLabel={comparisonLabel}
              format={formatCount}
              icon={Eye}
              delay={0.04}
            />
            <MarketingKpiCard
              label="Kontakte totale"
              value={currentDigital.leads}
              detail="Facebook, Instagram dhe TikTok"
              previousValue={previousDigital.leads > 0 ? previousDigital.leads : null}
              comparisonLabel={comparisonLabel}
              format={formatCount}
              icon={Users}
              delay={0.08}
            />
            <MarketingKpiCard
              label="Digjital"
              value={currentDigital.spend}
              detail="Shpenzime digjitale"
              previousValue={previousDigital.spend > 0 ? previousDigital.spend : null}
              comparisonLabel={comparisonLabel}
              format={fmtEur}
              icon={Megaphone}
              delay={0.12}
            />
            <MarketingKpiCard
              label="Offline"
              value={currentOfflineSpend}
              detail="Shpenzime offline"
              previousValue={previousOfflineSpend > 0 ? previousOfflineSpend : null}
              comparisonLabel={comparisonLabel}
              format={fmtEur}
              icon={Megaphone}
              delay={0.16}
            />
          </div>
        </Card>
      </motion.div>
    </motion.section>
  );
}
