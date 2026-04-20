import { useMemo } from "react";
import type { Payment, PaymentStatus } from "./usePayments";
import type { OwnerCategory, Unit } from "./useUnits";
import { getUnitContractValue } from "../lib/unitFinancials";

const PAID: PaymentStatus = "E paguar";
const MONTH_LABELS = [
  "Janar",
  "Shkurt",
  "Mars",
  "Prill",
  "Maj",
  "Qershor",
  "Korrik",
  "Gusht",
  "Shtator",
  "Tetor",
  "Nëntor",
  "Dhjetor",
] as const;

const MONTH_SHORT_LABELS = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gus", "Sht", "Tet", "Nën", "Dhj"] as const;

export type PortfolioOwnerScope = OwnerCategory | "all";
export type PortfolioYear = number | "all";
export type PortfolioMonth = number | "all";

export interface PortfolioMonthlySeriesPoint {
  monthIndex: number;
  label: string;
  shortLabel: string;
  contractedValue: number;
  soldCount: number;
}

export interface PortfolioMetrics {
  scopedUnits: Unit[];
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  soldUnits: number;
  soldUnitsTotal: number;
  contractedValue: number;
  collectedValue: number;
  pendingValue: number;
  hasPaymentData: boolean;
  periodSoldUnitsData: Unit[];
  monthlySeries: PortfolioMonthlySeriesPoint[];
}

function getIsoYearAndMonth(iso: string | null | undefined) {
  if (!iso) return null;

  const [year, month] = iso.slice(0, 10).split("-").map(Number);

  if (!year || !month) {
    return null;
  }

  return {
    year,
    monthIndex: month - 1,
  };
}

function matchesOwnerScope(unit: Unit, ownerScope: PortfolioOwnerScope) {
  return ownerScope === "all" ? true : unit.owner_category === ownerScope;
}

function matchesPeriod(
  iso: string | null | undefined,
  year: PortfolioYear,
  month: PortfolioMonth,
) {
  if (year === "all") {
    return true;
  }

  const dateParts = getIsoYearAndMonth(iso);

  if (!dateParts || dateParts.year !== year) {
    return false;
  }

  return month === "all" ? true : dateParts.monthIndex === month;
}

export function usePortfolioMetrics({
  units,
  payments = [],
  ownerScope = "all",
  year = "all",
  month = "all",
  seriesYear,
}: {
  units: Unit[];
  payments?: Payment[];
  ownerScope?: PortfolioOwnerScope;
  year?: PortfolioYear;
  month?: PortfolioMonth;
  seriesYear?: number;
}): PortfolioMetrics {
  const scopedUnits = useMemo(
    () => units.filter((unit) => matchesOwnerScope(unit, ownerScope)),
    [ownerScope, units],
  );

  const totalUnits = scopedUnits.length;
  const availableUnits = scopedUnits.filter((unit) => unit.status === "Në dispozicion").length;
  const reservedUnits = scopedUnits.filter((unit) => unit.status === "E rezervuar").length;
  const soldInventoryUnits = scopedUnits.filter((unit) => unit.status === "E shitur");
  const soldUnitsTotal = soldInventoryUnits.length;

  const periodSoldUnitsData = useMemo(
    () =>
      soldInventoryUnits.filter((unit) => matchesPeriod(unit.sale_date, year, month)),
    [month, soldInventoryUnits, year],
  );

  const soldUnits = periodSoldUnitsData.length;
  const contractedValue = periodSoldUnitsData.reduce((sum, unit) => sum + getUnitContractValue(unit), 0);

  const periodSoldUnitIds = useMemo(
    () => new Set(periodSoldUnitsData.map((unit) => unit.id)),
    [periodSoldUnitsData],
  );

  const paymentsByUnitId = useMemo(() => {
    const next = new Map<string, Payment[]>();

    payments.forEach((payment) => {
      if (!periodSoldUnitIds.has(payment.unit_id)) {
        return;
      }

      const current = next.get(payment.unit_id) ?? [];
      current.push(payment);
      next.set(payment.unit_id, current);
    });

    return next;
  }, [payments, periodSoldUnitIds]);

  const collectedValue = periodSoldUnitsData.reduce((sum, unit) => {
    const unitPayments = paymentsByUnitId.get(unit.id) ?? [];
    const paidAmount = unitPayments
      .filter((payment) => payment.status === PAID)
      .reduce((paymentSum, payment) => paymentSum + payment.amount, 0);

    return sum + paidAmount;
  }, 0);

  const pendingValue = periodSoldUnitsData.reduce((sum, unit) => {
    const unitPayments = paymentsByUnitId.get(unit.id) ?? [];
    const paidAmount = unitPayments
      .filter((payment) => payment.status === PAID)
      .reduce((paymentSum, payment) => paymentSum + payment.amount, 0);

    return sum + Math.max(getUnitContractValue(unit) - paidAmount, 0);
  }, 0);

  const hasPaymentData = Array.from(paymentsByUnitId.values()).some((unitPayments) => unitPayments.length > 0);

  const resolvedSeriesYear =
    typeof seriesYear === "number"
      ? seriesYear
      : year === "all"
        ? new Date().getFullYear()
        : year;

  const monthlySeries = useMemo<PortfolioMonthlySeriesPoint[]>(
    () =>
      MONTH_LABELS.map((label, monthIndex) => {
        const monthSoldUnits = soldInventoryUnits.filter((unit) =>
          matchesPeriod(unit.sale_date, resolvedSeriesYear, monthIndex),
        );

        return {
          monthIndex,
          label,
          shortLabel: MONTH_SHORT_LABELS[monthIndex],
          contractedValue: monthSoldUnits.reduce((sum, unit) => sum + getUnitContractValue(unit), 0),
          soldCount: monthSoldUnits.length,
        };
      }),
    [resolvedSeriesYear, soldInventoryUnits],
  );

  return {
    scopedUnits,
    totalUnits,
    availableUnits,
    reservedUnits,
    soldUnits,
    soldUnitsTotal,
    contractedValue,
    collectedValue,
    pendingValue,
    hasPaymentData,
    periodSoldUnitsData,
    monthlySeries,
  };
}
