import { useCallback, useMemo, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  WalletCards,
} from "lucide-react";
import type { OwnerCategory, Unit } from "../hooks/useUnits";
import type { SaleReportingMetrics, SaleReportingTypologyBreakdownItem } from "../hooks/useSaleReporting";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { getUnitListingPrice } from "../lib/unitFinancials";
import { normalizeCompatibleUnitFields } from "../lib/unitCompatibility";
import {
  TABULAR_HEADER_LABEL_CLASS,
  TABULAR_HEADER_ROW_CLASS,
} from "../components/ui/tabularHeader";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { Card } from "./primitives";
import {
  MONTH_LABELS,
  NAVY,
  formatCount,
  formatPercent,
  getValue,
  normalizeStatus,
  normalizeTypology,
  sectionMotion,
  toDate,
  type IconType,
  type UnitTypology,
  useHoldLast,
} from "./shared";

const REPORT_CARD_TITLE_STYLE: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  lineHeight: 1.05,
};

const REPORT_CARD_SUBTITLE_STYLE: CSSProperties = {
  fontSize: 11.75,
  fontWeight: 500,
  lineHeight: 1.35,
};

const REPORT_TABLE_HEADER_STYLE: CSSProperties = {
  backgroundColor: "#f3f6fb",
};

function safePercent(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value)}`;
}

function relativeDelta(current: number, previous: number | null, previousLabel: string) {
  if (previous === null) {
    return {
      label: "Pa krahasim",
      tone: "neutral" as const,
    };
  }

  if (previous === 0) {
    return {
      label: current > 0 ? `Nga 0 në ${previousLabel}` : "Pa ndryshim",
      tone: current > 0 ? ("positive" as const) : ("neutral" as const),
    };
  }

  const delta = ((current - previous) / previous) * 100;
  return {
    label: `${formatSignedPercent(delta)} kundrejt ${previousLabel}`,
    tone:
      delta > 0 ? ("positive" as const) : delta < 0 ? ("negative" as const) : ("neutral" as const),
  };
}

function inverseTrend(trend: ReturnType<typeof relativeDelta>) {
  if (trend.tone === "neutral") return trend;

  return {
    ...trend,
    tone: trend.tone === "positive" ? ("negative" as const) : ("positive" as const),
  };
}

function ExecutiveSummaryCard({
  label,
  value,
  detail,
  trend,
  icon: Icon,
  iconTone,
}: {
  label: string;
  value: string;
  detail: string;
  trend: {
    label: string;
    tone: "positive" | "negative" | "neutral";
  };
  icon: IconType;
  iconTone: {
    bg: string;
    color: string;
  };
}) {
  const trendClass =
    trend.tone === "positive"
      ? "text-[#3c7a57]"
      : trend.tone === "negative"
        ? "text-[#b14b4b]"
        : "text-black/36";

  return (
    <div className="executive-reports-summary-card rounded-[16px] border border-[#edf0f4] bg-white px-5 py-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: iconTone.bg }}
        >
          <Icon size={15} style={{ color: iconTone.color }} strokeWidth={1.9} />
        </div>
        <span className={`text-right text-[11px] font-semibold ${trendClass}`}>
          {trend.label}
        </span>
      </div>
      <div className="text-[25px] font-bold leading-none tracking-[-0.03em] text-[#003883] tabular-nums">
        {value}
      </div>
      <div className="mt-2 text-[12px] font-semibold text-black/52">{label}</div>
      <div className="mt-1 text-[11.5px] text-black/36">{detail}</div>
    </div>
  );
}

/**
 * "Pasqyra e investimit" — the dominant section of the Executive Reports
 * page. Owns all derivation for:
 *
 *   • the three top summary cards (contracted / collected / pending) driven
 *     by the Investor-scoped reporting metrics
 *   • the hero metric cards (total units / sold-in-period)
 *   • the owner-category breakdown table (Investor / Landowners / Builders)
 *   • the typology breakdown table (Banesë / Penthouse / Lokal / Garazhë)
 *
 * Also owns the "hold-last-confirmed" wrappers so the period selector never
 * flashes zeros between fetches. All upstream data and the selected period
 * come in as props — the parent is the hook caller and period-state owner.
 */
export function InvestmentSection({
  units,
  investorMetrics,
  investorMetricsLoading,
  investorMetricsError,
  investorPreviousMetrics,
  investorPreviousMetricsLoading,
  investorPreviousMetricsError,
  landownersMetrics,
  landownersMetricsLoading,
  landownersMetricsError,
  buildersMetrics,
  buildersMetricsLoading,
  buildersMetricsError,
  investorTypologyBreakdown,
  investorTypologyLoading,
  investorTypologyError,
  selectedSummaryMonth,
  selectedSummaryYear,
}: {
  units: Unit[];
  investorMetrics: SaleReportingMetrics | null;
  investorMetricsLoading: boolean;
  investorMetricsError: string | null;
  investorPreviousMetrics: SaleReportingMetrics | null;
  investorPreviousMetricsLoading: boolean;
  investorPreviousMetricsError: string | null;
  landownersMetrics: SaleReportingMetrics | null;
  landownersMetricsLoading: boolean;
  landownersMetricsError: string | null;
  buildersMetrics: SaleReportingMetrics | null;
  buildersMetricsLoading: boolean;
  buildersMetricsError: string | null;
  investorTypologyBreakdown: SaleReportingTypologyBreakdownItem[];
  investorTypologyLoading: boolean;
  investorTypologyError: string | null;
  selectedSummaryMonth: number | null;
  selectedSummaryYear: number;
}) {
  const reportingMonth = selectedSummaryMonth === null ? null : selectedSummaryMonth + 1;

  // Hold-last-confirmed values so the period picker never flashes zeros while
  // a new RPC is in flight. The underlying hooks null / empty-out their state
  // at the start of each fetch; we display the previous confirmed snapshot
  // until the new one lands.
  const displayInvestorMetrics = useHoldLast(investorMetrics, investorMetricsLoading);
  const displayInvestorPreviousMetrics = useHoldLast(
    investorPreviousMetrics,
    investorPreviousMetricsLoading,
  );
  const displayLandownersMetrics = useHoldLast(
    landownersMetrics,
    landownersMetricsLoading,
  );
  const displayBuildersMetrics = useHoldLast(buildersMetrics, buildersMetricsLoading);
  const displayInvestorTypologyBreakdown = useHoldLast(
    investorTypologyBreakdown,
    investorTypologyLoading,
  );

  const summaryMetricsValue = displayInvestorMetrics ?? {
    ownerScope: "Investitor" as const,
    periodYear: selectedSummaryYear,
    periodMonth: reportingMonth,
    soldUnits: 0,
    contractedValue: 0,
    collectedValue: 0,
    pendingValue: 0,
    hasPaymentData: false,
  };

  const normalizedUnits = useMemo(
    () =>
      units.map((unit) => {
        const normalizedFields = normalizeCompatibleUnitFields(
          unit as unknown as Record<string, unknown>,
        );
        const status = String(getValue(unit, ["status"]) ?? "");

        return {
          unitId: normalizedFields.unitId,
          status,
          statusKey: normalizeStatus(status),
          type: normalizeTypology(
            normalizedFields.type,
            normalizedFields.level,
            normalizedFields.unitId,
          ),
          ownerCategory: (unit.owner_category ?? null) as OwnerCategory | null,
          listingPrice: getUnitListingPrice(unit),
          saleDate: toDate(normalizedFields.saleDate),
        };
      }),
    [units],
  );

  const selectedSummaryPeriodLabel =
    selectedSummaryMonth === null
      ? `Të gjithë muajt ${selectedSummaryYear}`
      : `${MONTH_LABELS[selectedSummaryMonth]} ${selectedSummaryYear}`;
  const previousSummaryMonth =
    selectedSummaryMonth === null
      ? null
      : selectedSummaryMonth === 0
        ? 11
        : selectedSummaryMonth - 1;
  const previousSummaryYear =
    selectedSummaryMonth === 0 ? selectedSummaryYear - 1 : selectedSummaryYear;
  const previousSummaryPeriodLabel =
    previousSummaryMonth === null
      ? ""
      : `${MONTH_LABELS[previousSummaryMonth]} ${previousSummaryYear}`;
  const comparisonLabel =
    selectedSummaryMonth === null
      ? `Raporti për ${selectedSummaryPeriodLabel}`
      : `Raporti për ${selectedSummaryPeriodLabel} · Krahasuar me ${previousSummaryPeriodLabel}`;
  const previousMetricsReady =
    selectedSummaryMonth !== null &&
    !investorPreviousMetricsLoading && !investorPreviousMetricsError;
  const currentPeriodTrend = {
    label: "Të gjithë muajt",
    tone: "neutral" as const,
  };

  const isCurrentlyAvailable = useCallback(
    (unit: (typeof normalizedUnits)[number]) => unit.statusKey === "available",
    [],
  );

  // Investor-scoped inventory (B1): "Pasqyra e investimit" stays internally consistent.
  const investorUnits = useMemo(
    () => normalizedUnits.filter((unit) => unit.ownerCategory === "Investitor"),
    [normalizedUnits],
  );

  const totalUnits = investorUnits.length;
  const availableCount = investorUnits.filter(isCurrentlyAvailable).length;
  const availablePercent = safePercent(availableCount, totalUnits);

  const typologyRows = useMemo(() => {
    const order: UnitTypology[] = ["Banesë", "Penthouse", "Lokal", "Garazhë"];
    const breakdownByLabel = new Map(
      displayInvestorTypologyBreakdown.map((row) => [row.typology, row]),
    );
    return order.map((typology) => {
      const investorRows = investorUnits.filter((unit) => unit.type === typology);
      const available = investorRows.filter(isCurrentlyAvailable);
      const breakdown = breakdownByLabel.get(typology);

      return {
        typology,
        total: investorRows.length,
        sold: breakdown?.soldUnits ?? 0,
        available: available.length,
        revenue: breakdown?.contractedValue ?? 0,
      };
    });
  }, [displayInvestorTypologyBreakdown, investorUnits, isCurrentlyAvailable]);
  const typologyTotals = useMemo(
    () =>
      typologyRows.reduce(
        (totals, row) => ({
          total: totals.total + row.total,
          sold: totals.sold + row.sold,
          available: totals.available + row.available,
          revenue: totals.revenue + row.revenue,
        }),
        { total: 0, sold: 0, available: 0, revenue: 0 },
      ),
    [typologyRows],
  );

  const ownerCategoryRows = useMemo(() => {
    const order: OwnerCategory[] = [
      "Investitor",
      "Pronarët e tokës",
      "Kompani ndërtimore",
    ];
    const metricsByCategory: Record<OwnerCategory, typeof summaryMetricsValue | null> = {
      Investitor: displayInvestorMetrics,
      "Pronarët e tokës": displayLandownersMetrics,
      "Kompani ndërtimore": displayBuildersMetrics,
    };
    return order.map((category) => {
      const m = metricsByCategory[category];
      return {
        category,
        soldCount: m?.soldUnits ?? 0,
        revenue: m?.contractedValue ?? 0,
      };
    });
  }, [
    displayBuildersMetrics,
    displayInvestorMetrics,
    displayLandownersMetrics,
  ]);

  const ownerCategoryReady =
    !investorMetricsLoading &&
    !landownersMetricsLoading &&
    !buildersMetricsLoading &&
    !investorMetricsError &&
    !landownersMetricsError &&
    !buildersMetricsError;

  const typologyReady = !investorTypologyLoading && !investorTypologyError;

  const executiveSummaryCards = [
    {
      label: "Vlera e kontraktuar",
      value: fmtEur(summaryMetricsValue.contractedValue),
      detail: "Vlera e periudhës së zgjedhur",
      trend:
        selectedSummaryMonth === null
          ? currentPeriodTrend
          : relativeDelta(
              summaryMetricsValue.contractedValue,
              previousMetricsReady ? (displayInvestorPreviousMetrics?.contractedValue ?? 0) : null,
              previousSummaryPeriodLabel,
            ),
      icon: Banknote,
      iconTone: {
        bg: "#eaf0fa",
        color: NAVY,
      },
    },
    {
      label: "Të arkëtuara",
      value: fmtEur(summaryMetricsValue.collectedValue),
      detail: "Pagesa të regjistruara",
      trend:
        selectedSummaryMonth === null
          ? currentPeriodTrend
          : relativeDelta(
              summaryMetricsValue.collectedValue,
              previousMetricsReady ? (displayInvestorPreviousMetrics?.collectedValue ?? 0) : null,
              previousSummaryPeriodLabel,
            ),
      icon: WalletCards,
      iconTone: {
        bg: "#eaf6ef",
        color: "#3c7a57",
      },
    },
    {
      label: "Në pritje",
      value: fmtEur(summaryMetricsValue.pendingValue),
      detail: summaryMetricsValue.hasPaymentData ? "Këste të papaguara" : "Ende pa plan pagese",
      trend:
        selectedSummaryMonth === null
          ? currentPeriodTrend
          : inverseTrend(
              relativeDelta(
                summaryMetricsValue.pendingValue,
                previousMetricsReady ? (displayInvestorPreviousMetrics?.pendingValue ?? 0) : null,
                previousSummaryPeriodLabel,
              ),
            ),
      icon: Clock3,
      iconTone: {
        bg: "#fbf4df",
        color: "#b0892f",
      },
    },
    {
      label: "Stoku në dispozicion",
      value: formatCount(availableCount),
      detail: "Njësi të lira për shitje",
      trend: {
        label: `${formatPercent(availablePercent)} e stokut`,
        tone: "neutral" as const,
      },
      icon: CheckCircle2,
      iconTone: {
        bg: "#eaf6ef",
        color: "#3c7a57",
      },
    },
  ];

  return (
    <motion.section
      {...sectionMotion(0.02)}
      className="executive-reports-section executive-reports-section-splittable mb-12"
    >
      <Card className="mb-6 p-0">
        <CardSectionHeader
          title="Pasqyra ekzekutive"
          subtitle={comparisonLabel}
          density="spacious"
          titleStyle={REPORT_CARD_TITLE_STYLE}
          subtitleStyle={REPORT_CARD_SUBTITLE_STYLE}
        />
        <div className="px-6 py-6">
          <div className="executive-reports-summary-grid grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {executiveSummaryCards.map((card) => (
              <ExecutiveSummaryCard key={card.label} {...card} />
            ))}
          </div>
        </div>
      </Card>

      <Card className="executive-reports-pagebreak p-0">
        <CardSectionHeader
          title="Shitjet dhe stoku"
          subtitle={`Të dhënat sipas pronësisë dhe tipologjisë për ${selectedSummaryPeriodLabel}.`}
          density="spacious"
          titleStyle={REPORT_CARD_TITLE_STYLE}
          subtitleStyle={REPORT_CARD_SUBTITLE_STYLE}
        />

        {!ownerCategoryReady && (
          <p className="px-6 pt-5 text-[12px] text-black/38">
            Duke ngarkuar ndarjen sipas kategorisë së pronësisë për periudhën e zgjedhur.
          </p>
        )}

        <div className="px-6 py-6">
          <div className="mb-3">
            <p className="text-[12.5px] font-semibold leading-tight text-[#003883]">
              Shitjet sipas pronësisë
            </p>
            <p className="mt-1 text-[11.5px] font-medium leading-[1.35] text-[#003883]/60">
              Njësitë e shitura dhe vlera e kontraktuar sipas pronësisë.
            </p>
          </div>
          <div className="overflow-hidden rounded-[18px] border border-[#edf0f4]">
            <div className="executive-reports-scroll overflow-x-auto">
              <table className="w-full min-w-[720px] text-[12px]">
                <colgroup>
                  <col className="w-[50%]" />
                  <col className="w-[20%]" />
                  <col className="w-[30%]" />
                </colgroup>
                <thead>
                  <tr className={TABULAR_HEADER_ROW_CLASS} style={REPORT_TABLE_HEADER_STYLE}>
                    <th className={`px-5 py-3 text-left ${TABULAR_HEADER_LABEL_CLASS}`}>
                      Kategoria e pronësisë
                    </th>
                    <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                      Njësi të shitura
                    </th>
                    <th className={`px-5 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                      Vlera e kontraktuar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ownerCategoryRows.map((row) => (
                    <tr key={row.category} className="border-t border-[#f0f0f2]">
                      <td className="px-5 py-3 text-[13px] font-medium text-black/70">
                        {row.category}
                      </td>
                      <td className="px-3 py-3 text-center text-[13px] text-black/65 tabular-nums">
                        {`${formatCount(row.soldCount)} njësi`}
                      </td>
                      <td
                        className="px-5 py-3 text-center text-[13px] font-medium text-black/70 tabular-nums"
                      >
                        {fmtEur(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="border-t border-[#eef0f4] px-6 py-6">
          <div className="mb-3">
            <p className="text-[12.5px] font-semibold leading-tight text-[#003883]">
              Ndarja sipas tipologjisë
            </p>
            <p className="mt-1 text-[11.5px] font-medium leading-[1.35] text-[#003883]/60">
              Stoku aktual i pronësisë Investitor · Shitjet dhe vlera për {selectedSummaryPeriodLabel}
            </p>
          </div>
          {!typologyReady && (
            <p className="mb-3 text-[12px] text-black/38">
              Duke ngarkuar ndarjen sipas tipologjisë për periudhën e zgjedhur.
            </p>
          )}

          <div className="overflow-hidden rounded-[18px] border border-[#edf0f4]">
            <div className="executive-reports-scroll overflow-x-auto">
              <table className="w-full min-w-[920px] text-[12px]">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[18%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead>
                  <tr className={TABULAR_HEADER_ROW_CLASS} style={REPORT_TABLE_HEADER_STYLE}>
                    <th className={`px-5 py-3 text-left ${TABULAR_HEADER_LABEL_CLASS}`}>
                      Tipologjia
                    </th>
                    <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                      Gjithsej
                    </th>
                    <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                      Të shitura
                    </th>
                    <th className={`px-3 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                      Në dispozicion
                    </th>
                    <th className={`whitespace-nowrap px-5 py-3 text-center ${TABULAR_HEADER_LABEL_CLASS}`}>
                      Vlera e kontraktuar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {typologyRows.map((row) => (
                    <tr key={row.typology} className="border-t border-[#f0f0f2]">
                      <td className="px-5 py-3 text-[13px] font-medium text-black/70">
                        {row.typology}
                      </td>
                      <td className="px-3 py-3 text-center text-[13px] text-black/65 tabular-nums">
                        {formatCount(row.total)}
                      </td>
                      <td className="px-3 py-3 text-center text-[13px] text-black/65 tabular-nums">
                        {formatCount(row.sold)}
                      </td>
                      <td className="px-3 py-3 text-center text-[13px] text-black/65 tabular-nums">
                        {formatCount(row.available)}
                      </td>
                      <td className="px-5 py-3 text-center text-[13px] font-medium text-black/70 tabular-nums">
                        {fmtEur(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#e5e8ef] bg-[#fbfcff]">
                    <td className="px-5 py-3 text-[13px] font-semibold text-black/78">
                      Gjithsej
                    </td>
                    <td className="px-3 py-3 text-center text-[13px] font-semibold text-black/72 tabular-nums">
                      {formatCount(typologyTotals.total)}
                    </td>
                    <td className="px-3 py-3 text-center text-[13px] font-semibold text-black/72 tabular-nums">
                      {formatCount(typologyTotals.sold)}
                    </td>
                    <td className="px-3 py-3 text-center text-[13px] font-semibold text-black/72 tabular-nums">
                      {formatCount(typologyTotals.available)}
                    </td>
                    <td className="px-5 py-3 text-center text-[13px] font-semibold text-black/78 tabular-nums">
                      {fmtEur(typologyTotals.revenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </Card>
    </motion.section>
  );
}
