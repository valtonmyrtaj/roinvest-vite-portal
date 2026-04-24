import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { usePayments, type Payment } from "./hooks/usePayments";
import {
  useSaleMonthlySeries,
  useSaleReporting,
  useSaleTypologyBreakdown,
} from "./hooks/useSaleReporting";
import { useSalesUpcomingPayments } from "./hooks/useSalesUpcomingPayments";
import { mapSalesUnitRowToUnit, useSalesUnits } from "./hooks/useSalesUnits";
import { useUnitsShell } from "./hooks/useUnitsShell";
import type { Unit } from "./hooks/useUnits";
import { sales as salesApi } from "./lib/api";
import { PaymentDrawer } from "./sales-page/PaymentDrawer";
import { SalesHeader } from "./sales-page/SalesHeader";
import { SalesRevenueChart } from "./sales-page/SalesRevenueChart";
import { SalesSummary } from "./sales-page/SalesSummary";
import {
  SalesTypologyBreakdown,
  type SalesTypologyRow,
} from "./sales-page/SalesTypologyBreakdown";
import {
  SalesUpcomingPayments,
  type UpcomingPaymentRow,
} from "./sales-page/SalesUpcomingPayments";
import {
  getNiceAxisStep,
  SALES_KPI_DEFS,
  SQ_MONTHS,
  TYPOLOGY_DEFS,
  YEAR_OPTIONS,
} from "./sales-page/shared";
import type { ChartPoint } from "./sales-page/shared";
import { PAGE_BG } from "./ui/tokens";

export default function SalesPage({
  onNavigate,
  navigationSearch,
}: {
  onNavigate?: (page: string) => void;
  navigationSearch?: string;
}) {
  const {
    payments,
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
    loading: paymentsLoading,
  } = usePayments();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(
    YEAR_OPTIONS.includes(String(now.getFullYear()) as (typeof YEAR_OPTIONS)[number])
      ? now.getFullYear()
      : Number(YEAR_OPTIONS[0]),
  );
  const ownerScope = "Investitor" as const;
  const [activePaymentUnit, setActivePaymentUnit] = useState<Unit | null>(null);
  const [highlightedUnitId, setHighlightedUnitId] = useState<string | null>(null);
  const [paymentsSectionPulse, setPaymentsSectionPulse] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const upcomingPaymentsSectionRef = useRef<HTMLDivElement | null>(null);
  const consumedFocusSearchRef = useRef<string | null>(null);

  const {
    stockCounts,
    activeReservations,
    loading: shellLoading,
    error: shellError,
  } = useUnitsShell({
    stockCategory: ownerScope,
  });

  const {
    rows: upcomingPayments,
    loading: upcomingPaymentsLoading,
    error: upcomingPaymentsError,
    refresh: refreshUpcomingPayments,
  } = useSalesUpcomingPayments(ownerScope);

  useEffect(() => {
    const tickId = window.setInterval(() => {
      setNowTs(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(tickId);
    };
  }, []);

  const {
    metrics: financialMetrics,
    loading: financialMetricsLoading,
    error: financialMetricsError,
    refresh: refreshFinancialMetrics,
  } = useSaleReporting({
    ownerScope,
    year: selectedYear,
    month: selectedMonth === "all" ? null : selectedMonth + 1,
  });

  const {
    series: monthlySeries,
    loading: monthlySeriesLoading,
    error: monthlySeriesError,
  } = useSaleMonthlySeries({
    ownerScope,
    year: selectedYear,
  });

  const {
    rows: typologyBreakdown,
    loading: typologyBreakdownLoading,
    error: typologyBreakdownError,
  } = useSaleTypologyBreakdown({
    ownerScope,
    year: selectedYear,
    month: selectedMonth === "all" ? null : selectedMonth + 1,
  });

  const typologyUnitIds = useMemo(
    () =>
      Array.from(
        new Set(typologyBreakdown.flatMap((row) => row.unitRecordIds).filter(Boolean)),
      ),
    [typologyBreakdown],
  );

  const {
    units: typologyUnits,
    loading: typologyUnitsLoading,
    error: typologyUnitsError,
  } = useSalesUnits(typologyUnitIds);

  const chartData = useMemo<ChartPoint[]>(
    () =>
      monthlySeries.map((entry) => ({
        month: entry.monthShortLabel,
        monthIndex: entry.monthNumber - 1,
        revenue: entry.contractedValue,
      })),
    [monthlySeries],
  );

  const periodContextLabel =
    selectedMonth === "all" ? "gjatë vitit të zgjedhur" : "gjatë muajit të zgjedhur";
  const periodChipLabel =
    selectedMonth === "all" ? `${selectedYear}` : `${SQ_MONTHS[selectedMonth]} ${selectedYear}`;
  const financialSummaryReady =
    !financialMetricsLoading && financialMetrics !== null && !financialMetricsError;
  const stockSnapshotReady = !shellLoading && !shellError;
  const financialMetricsValue = financialMetrics ?? {
    ownerScope,
    periodYear: selectedYear,
    periodMonth: selectedMonth === "all" ? null : selectedMonth + 1,
    soldUnits: 0,
    contractedValue: 0,
    collectedValue: 0,
    pendingValue: 0,
    hasPaymentData: false,
  };

  const revenueAxis = useMemo(() => {
    const highestRevenue = Math.max(...chartData.map((item) => item.revenue), 0);

    if (highestRevenue <= 0) {
      const step = 100_000;
      return {
        max: step * 5,
        ticks: Array.from({ length: 6 }, (_, index) => index * step),
      };
    }

    const step = getNiceAxisStep(highestRevenue);
    const max = Math.ceil(highestRevenue / step) * step;

    return {
      max,
      ticks: Array.from({ length: Math.floor(max / step) + 1 }, (_, index) => index * step),
    };
  }, [chartData]);

  const scopedUnitsById = useMemo(
    () => new Map(typologyUnits.map((unit) => [unit.id, unit])),
    [typologyUnits],
  );

  const typologyRows = useMemo<SalesTypologyRow[]>(() => {
    const breakdownByLabel = new Map(typologyBreakdown.map((row) => [row.typology, row]));

    return TYPOLOGY_DEFS.map((definition) => {
      const breakdown = breakdownByLabel.get(definition.label);
      const unitsForBreakdown = (breakdown?.unitRecordIds ?? [])
        .map((unitId) => scopedUnitsById.get(unitId))
        .filter((unit): unit is Unit => Boolean(unit));

      const soldCount = breakdown?.soldUnits ?? 0;

      return {
        label: definition.label,
        soldCount,
        revenue: breakdown?.contractedValue ?? 0,
        units: unitsForBreakdown,
        missingUnitCount: Math.max(soldCount - unitsForBreakdown.length, 0),
      };
    });
  }, [scopedUnitsById, typologyBreakdown]);

  const kpis = useMemo(
    () => [
      { ...SALES_KPI_DEFS[0], value: financialMetricsValue.contractedValue },
      { ...SALES_KPI_DEFS[1], value: financialMetricsValue.collectedValue },
      { ...SALES_KPI_DEFS[2], value: financialMetricsValue.pendingValue },
      { ...SALES_KPI_DEFS[3], value: financialMetricsValue.soldUnits },
    ],
    [
      financialMetricsValue.collectedValue,
      financialMetricsValue.contractedValue,
      financialMetricsValue.pendingValue,
      financialMetricsValue.soldUnits,
    ],
  );

  const reservationSummary = useMemo(() => {
    if (shellLoading || shellError) return null;

    const scopedActiveReservations = activeReservations.filter(
      (unit) => unit.owner_category === ownerScope && unit.reservation_expires_at,
    );

    if (scopedActiveReservations.length === 0) return null;

    const expiringThisWeek = scopedActiveReservations.filter((unit) => {
      const days = Math.ceil(
        (new Date(unit.reservation_expires_at!).getTime() - nowTs) / 86400000,
      );
      return days >= 0 && days <= 7;
    });

    return {
      activeCount: scopedActiveReservations.length,
      expiringThisWeekCount: expiringThisWeek.length,
    };
  }, [activeReservations, nowTs, ownerScope, shellError, shellLoading]);

  const handleOpenPaymentPlan = useCallback(
    async (unit: Unit) => {
      setActivePaymentUnit(unit);
      await fetchPayments(unit.id);
    },
    [fetchPayments],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const focusSearch = navigationSearch ?? window.location.search;
    const searchParams = new URLSearchParams(focusSearch);
    const focusUnitId = searchParams.get("focusUnitId");

    if (!focusUnitId) {
      consumedFocusSearchRef.current = null;
      return undefined;
    }

    if (consumedFocusSearchRef.current === focusSearch) {
      return undefined;
    }

    consumedFocusSearchRef.current = focusSearch;

    const url = new URL(window.location.href);
    url.searchParams.delete("focusUnitId");
    window.history.replaceState(window.history.state, "", url.toString());

    let cancelled = false;
    let timeout = 0;
    let frame = 0;

    const openFocusedUnit = async () => {
      const cachedUnit =
        upcomingPayments.find(({ unit }) => unit.id === focusUnitId)?.unit ??
        scopedUnitsById.get(focusUnitId) ??
        null;

      let targetUnit = cachedUnit;

      if (!targetUnit) {
        const result = await salesApi.getSaleUnitById(focusUnitId);

        if (cancelled || result.error || !result.data) {
          return;
        }

        targetUnit = mapSalesUnitRowToUnit(result.data);
      }

      if (cancelled) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        void handleOpenPaymentPlan(targetUnit);
        setHighlightedUnitId(targetUnit.id);
        setPaymentsSectionPulse(true);
        upcomingPaymentsSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        timeout = window.setTimeout(() => {
          setHighlightedUnitId(null);
          setPaymentsSectionPulse(false);
        }, 2200);
      });
    };

    void openFocusedUnit();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [navigationSearch, upcomingPayments, scopedUnitsById, handleOpenPaymentPlan]);

  const refreshPayments = useCallback(
    async (unitId: string) => {
      await Promise.all([
        fetchPayments(unitId),
        refreshUpcomingPayments(),
        refreshFinancialMetrics(),
      ]);
    },
    [fetchPayments, refreshFinancialMetrics, refreshUpcomingPayments],
  );

  const handleCreatePayment = async (data: {
    unit_id: string;
    installment_number: number;
    amount: number;
    due_date: string;
    notes?: string | null;
  }) => {
    const result = await createPayment(data);
    if (result.error) {
      throw new Error(result.error);
    }
    await refreshPayments(data.unit_id);
  };

  const handleMarkPaid = async (payment: Payment, paidDate: string) => {
    const result = await updatePayment(payment.id, {
      status: "E paguar",
      paid_date: paidDate,
    });
    if (result.error) {
      throw new Error(result.error);
    }
    await refreshPayments(payment.unit_id);
  };

  const handleDeletePayment = async (paymentId: string) => {
    const target = payments.find((payment) => payment.id === paymentId);
    const result = await deletePayment(paymentId);
    if (result.error) {
      throw new Error(result.error);
    }
    if (target) {
      await refreshPayments(target.unit_id);
    } else {
      await Promise.all([refreshUpcomingPayments(), refreshFinancialMetrics()]);
    }
  };

  return (
    <div style={{ background: PAGE_BG }}>
      <AnimatePresence>
        {activePaymentUnit && (
          <PaymentDrawer
            unit={activePaymentUnit}
            payments={payments}
            loading={paymentsLoading}
            onClose={() => setActivePaymentUnit(null)}
            onCreatePayment={handleCreatePayment}
            onMarkPaid={handleMarkPaid}
            onDeletePayment={handleDeletePayment}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-[1280px] px-10 pb-9 pt-6">
        <SalesHeader
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
        />

        <SalesSummary
          financialSummaryReady={financialSummaryReady}
          financialMetricsLoading={financialMetricsLoading}
          financialMetricsError={financialMetricsError}
          contractedValue={financialMetricsValue.contractedValue}
          soldUnits={financialMetricsValue.soldUnits}
          periodContextLabel={periodContextLabel}
          periodChipLabel={periodChipLabel}
          totalUnits={stockCounts.total}
          availableUnits={stockCounts.available}
          stockSnapshotReady={stockSnapshotReady}
          kpis={kpis}
          reservationSummary={reservationSummary}
          onNavigate={onNavigate}
        />

        <SalesRevenueChart
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          loading={monthlySeriesLoading}
          error={monthlySeriesError}
          chartData={chartData}
          revenueAxis={revenueAxis}
        />

        <SalesTypologyBreakdown
          loading={typologyBreakdownLoading || typologyUnitsLoading}
          error={typologyBreakdownError ?? typologyUnitsError}
          rows={typologyRows}
          onOpenPaymentPlan={(unit) => {
            void handleOpenPaymentPlan(unit);
          }}
        />

        <div className="mt-6" ref={upcomingPaymentsSectionRef}>
          <SalesUpcomingPayments
            loading={upcomingPaymentsLoading}
            error={upcomingPaymentsError}
            upcomingPayments={upcomingPayments as UpcomingPaymentRow[]}
            onOpenPaymentPlan={handleOpenPaymentPlan}
            highlightedUnitId={highlightedUnitId}
            paymentsSectionPulse={paymentsSectionPulse}
          />
        </div>
      </div>
    </div>
  );
}
