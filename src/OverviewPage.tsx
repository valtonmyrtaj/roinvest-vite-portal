import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, BadgeCheck, Building2 } from "lucide-react";
import { CustomSelect } from "./components/CustomSelect";
import { CardSectionHeader } from "./components/ui/CardSectionHeader";
import { PageHeader } from "./components/ui/PageHeader";
import { useUnits } from "./hooks/useUnits";
import { usePortfolioMetrics } from "./hooks/usePortfolioMetrics";
import { useSaleReporting } from "./hooks/useSaleReporting";
import type { OwnerCategory, Unit } from "./hooks/useUnits";
import { formatEuro as fmtEur } from "./lib/formatCurrency";
import { NAVY, RED, SOFT_EASE } from "./ui/tokens";

const SQ_MONTHS = [
  "Janar","Shkurt","Mars","Prill","Maj","Qershor",
  "Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor",
];
const FILTER_YEARS = [2026, 2027, 2028, 2029, 2030];
const DEFAULT_OVERVIEW_PERIOD = (() => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const year = FILTER_YEARS.includes(currentYear) ? currentYear : "all";

  return {
    year,
    month: year === "all" ? "all" : today.getMonth(),
  } as const;
})();
const OverviewMonthlySalesChart = lazy(() => import("./OverviewMonthlySalesChart"));

function todayAlbanian() {
  const d = new Date();
  return `${d.getDate()} ${SQ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function useAnimatedNumber(end: number, active: boolean, duration = 1.1) {
  const shouldReduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);
  const currentValueRef = useRef(0);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    const nextValue = Number.isFinite(end) ? end : 0;

    if (shouldReduceMotion) {
      currentValueRef.current = nextValue;
      hasStartedRef.current = true;
      return;
    }

    const fromValue = hasStartedRef.current ? currentValueRef.current : 0;

    if (Math.round(fromValue) === Math.round(nextValue)) {
      currentValueRef.current = nextValue;
      hasStartedRef.current = true;
      return;
    }

    const controls = animate(fromValue, nextValue, {
      duration,
      ease: SOFT_EASE,
      onUpdate(latest) {
        const roundedValue = Math.round(latest);
        currentValueRef.current = roundedValue;
        setValue(roundedValue);
      },
      onComplete() {
        currentValueRef.current = nextValue;
        setValue(nextValue);
      },
    });

    hasStartedRef.current = true;
    return () => {
      controls.stop();
    };
  }, [active, duration, end, shouldReduceMotion]);

  return active ? (shouldReduceMotion ? end : value) : 0;
}

function useAnimatedRevenue(end: number, active: boolean) {
  return useAnimatedNumber(end, active, 1.35);
}

// The sale-reporting hooks now retain the last resolved payload during
// refetches, so this wrapper can stay as a compatibility no-op at the
// page layer while keeping the surrounding call sites unchanged.
function useHoldLast<T>(value: T, _loading: boolean): T {
  void _loading;
  return value;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay, ease: SOFT_EASE },
});

const OVERVIEW_CARD_SHADOW = "0 1px 2px rgba(0,0,0,0.04), 0 10px 26px rgba(0,0,0,0.035)";
const OVERVIEW_HERO_SHADOW = "0 1px 2px rgba(0,0,0,0.045), 0 16px 36px rgba(0,0,0,0.04)";
const OVERVIEW_CARD_TACTILE_CLASS =
  "transform-gpu will-change-transform transition-[transform,box-shadow,border-color] duration-[150ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1.5px] hover:border-[#dde1e7] hover:shadow-[0_1px_2px_rgba(15,23,42,0.045),0_20px_40px_rgba(15,23,42,0.085)] motion-reduce:transform-none motion-reduce:transition-none";

const sectionReveal = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.22 },
  transition: { duration: 0.44, delay, ease: SOFT_EASE },
});

const ownershipSectionReveal = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.24 },
  transition: { duration: 0.34, delay, ease: SOFT_EASE },
});

// Period badge pill
function PeriodBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px]"
      style={{
        background: "rgba(0,56,131,0.08)",
        color: NAVY,
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </span>
  );
}

function AnimatedPeriodBadge({ label }: { label?: string | null }) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {label ? (
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: SOFT_EASE }}
          className="inline-flex"
        >
          <PeriodBadge label={label} />
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

function ContextChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px]"
      style={{
        background: "rgba(0,56,131,0.06)",
        color: NAVY,
        fontWeight: 500,
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </span>
  );
}

interface KpiDef {
  key: string;
  label: string;
  value: number;
  total: number;
  color: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>;
  badge?: string | null;
}

function KpiCard({ kpi, delay, active }: { kpi: KpiDef; delay: number; active: boolean }) {
  const animated = useAnimatedNumber(kpi.value, active, 0.95);
  const pct = kpi.total > 0 ? Math.round((kpi.value / kpi.total) * 100) : 0;
  const showPct = kpi.key !== "total";

  return (
    <motion.div
      {...fadeUp(delay)}
      className={`flex-1 rounded-[18px] border border-[#e8e8ec] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_26px_rgba(0,0,0,0.035)] ${OVERVIEW_CARD_TACTILE_CLASS}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#f4f4f5]">
          <kpi.icon size={16} style={{ color: NAVY }} strokeWidth={1.8} />
        </div>
        {showPct ? (
          <span className="text-[12px] text-black/30" style={{ fontWeight: 500 }}>
            {pct}%
          </span>
        ) : null}
      </div>

      <p
        className="text-[38px] leading-none tracking-[-2px]"
        style={{ fontWeight: 700, color: kpi.key === "sold" ? RED : NAVY }}
      >
        {animated}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <p className="text-[12.5px] text-black/45" style={{ fontWeight: 500 }}>
          {kpi.label}
        </p>
        <AnimatedPeriodBadge label={kpi.badge} />
      </div>

      <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-black/[0.05]">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: active ? `${pct}%` : "0%" }}
          transition={{
            duration: 0.88,
            delay: Math.min(0.18 + delay * 0.35, 0.24),
            ease: SOFT_EASE,
          }}
          style={{ backgroundColor: kpi.color }}
        />
      </div>
    </motion.div>
  );
}

function SecondaryPartyCard({
  category,
  units,
  year,
  month,
  periodContextLabel,
  delay,
  active,
}: {
  category: OwnerCategory;
  units: Unit[];
  year: number | "all";
  month: number | "all";
  periodContextLabel: string;
  delay: number;
  active: boolean;
}) {
  const snapshotMetrics = usePortfolioMetrics({
    units,
    ownerScope: category,
    year: "all",
    month: "all",
  });
  const { metrics: categoryMetrics, loading: categoryMetricsLoading } = useSaleReporting({
    ownerScope: category,
    year: year === "all" ? null : year,
    month: month === "all" ? null : (month as number) + 1,
    enabled: active,
  });
  // Hold last-confirmed metrics so period changes don't flash zero on the
  // sold counter while the new RPC payload is in flight.
  const displayCategoryMetrics = useHoldLast(categoryMetrics, categoryMetricsLoading);
  const total = snapshotMetrics.totalUnits;
  const available = snapshotMetrics.availableUnits;
  const sold = displayCategoryMetrics?.soldUnits ?? 0;
  const animatedSold = useAnimatedNumber(sold, active, 0.8);
  const animatedAvailable = useAnimatedNumber(available, active, 0.8);
  const animatedTotal = useAnimatedNumber(total, active, 0.8);

  return (
    <motion.div
      {...ownershipSectionReveal(delay)}
      className={`flex-1 rounded-[18px] border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_26px_rgba(0,0,0,0.035)] ${OVERVIEW_CARD_TACTILE_CLASS}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.12em] text-black/36"
            style={{ fontWeight: 600 }}
          >
            {category}
          </p>
        </div>
        <ContextChip label={periodContextLabel} />
      </div>

      {total === 0 ? (
        <p className="py-2 text-[13px] text-black/30" style={{ fontWeight: 400 }}>
          Asnjë njësi e caktuar
        </p>
      ) : (
        <>
          <div className="grid gap-3.5 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-1.5">
                <p
                  className="text-[10.5px] uppercase tracking-[0.12em] text-black/30"
                  style={{ fontWeight: 500 }}
                >
                  Gjithsej
                </p>
              </div>
              <p
                className="mt-1.5 text-[24px] leading-none tracking-[-0.03em]"
                style={{ fontWeight: 700, color: NAVY }}
              >
                {animatedTotal}
              </p>
            </div>

            <div className="sm:border-l sm:border-[#eff1f4] sm:pl-4">
              <div className="flex items-center gap-1.5">
                <p
                  className="text-[10.5px] uppercase tracking-[0.12em] text-black/30"
                  style={{ fontWeight: 500 }}
                >
                  Në dispozicion
                </p>
              </div>
              <p
                className="mt-1.5 text-[24px] leading-none tracking-[-0.03em]"
                style={{ fontWeight: 700, color: NAVY }}
              >
                {animatedAvailable}
              </p>
            </div>

            <div className="sm:border-l sm:border-[#eff1f4] sm:pl-4">
              <div className="flex items-center gap-1.5">
                <p
                  className="text-[10.5px] uppercase tracking-[0.12em] text-black/30"
                  style={{ fontWeight: 500 }}
                >
                  Të shitura
                </p>
              </div>
              <p
                className="mt-1.5 text-[24px] leading-none tracking-[-0.03em]"
                style={{ fontWeight: 700, color: RED }}
              >
                {animatedSold}
              </p>
              <div
                className="mt-2 h-[2px] w-5 rounded-full"
                style={{ backgroundColor: "rgba(177,75,75,0.18)" }}
              />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

function OverviewMonthlySalesChartFallback() {
  return (
    <div className="flex h-[252px] items-center justify-center rounded-[16px] border border-dashed border-[#e1e5eb] bg-[#fbfbfc] text-center">
      <p className="text-[12.5px] text-black/36">Duke ngarkuar grafikun...</p>
    </div>
  );
}

function DeferredOverviewMonthlySalesChart({
  chartYear,
  selectedMonthIndex,
  started,
}: {
  chartYear: number | null;
  selectedMonthIndex: number | null;
  started: boolean;
}) {
  const [shouldLoadChart, setShouldLoadChart] = useState(false);

  useEffect(() => {
    if (!started || shouldLoadChart) {
      return;
    }

    const loadChart = () => {
      setShouldLoadChart(true);
    };
    const windowWithIdleCallback = window as Window & typeof globalThis & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof windowWithIdleCallback.requestIdleCallback === "function") {
      const idleId = windowWithIdleCallback.requestIdleCallback(loadChart, { timeout: 1600 });
      return () => {
        windowWithIdleCallback.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(loadChart, 900);
    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [shouldLoadChart, started]);

  if (!shouldLoadChart) {
    return <OverviewMonthlySalesChartFallback />;
  }

  return (
    <Suspense fallback={<OverviewMonthlySalesChartFallback />}>
      <OverviewMonthlySalesChart
        chartYear={chartYear}
        selectedMonthIndex={selectedMonthIndex}
        started={started}
      />
    </Suspense>
  );
}

export default function OverviewPage() {
  // Overview only needs inventory state here; sale KPIs/chart come from reporting RPCs.
  const { units, loading } = useUnits({ includeSaleTruth: false });

  // Period filter state
  const [filterYear, setFilterYear] = useState<number | "all">(DEFAULT_OVERVIEW_PERIOD.year);
  const [filterMonth, setFilterMonth] = useState<number | "all">(DEFAULT_OVERVIEW_PERIOD.month); // 0-indexed

  const started = !loading;

  // Inventory-only snapshot — period-independent stock counts.
  const snapshotMetrics = usePortfolioMetrics({
    units,
    ownerScope: "Investitor",
    year: "all",
    month: "all",
  });

  // Backend sale-reporting — period-aware financial KPIs (A2).
  const reportingYear = filterYear === "all" ? null : filterYear;
  const reportingMonth = filterMonth === "all" ? null : (filterMonth as number) + 1;
  const chartYear = filterYear === "all" ? null : filterYear;

  const {
    metrics: reportingMetrics,
    loading: reportingLoading,
    error: reportingError,
  } = useSaleReporting({
    ownerScope: "Investitor",
    year: reportingYear,
    month: reportingMonth,
  });

  const total = snapshotMetrics.totalUnits;
  const available = snapshotMetrics.availableUnits;

  const filterActive = filterYear !== "all";
  const rawActiveFinancial = reportingMetrics;
  const activeFinancialLoading = reportingLoading;
  const activeFinancialError = reportingError;
  // Hold last-confirmed metrics so swapping the period filter doesn't flash
  // zeros through the hero + KPI cards while the RPC is re-fetching.
  const activeFinancial = useHoldLast(rawActiveFinancial, activeFinancialLoading);

  const soldFiltered = activeFinancial?.soldUnits ?? 0;
  const totalRevenue = activeFinancial?.contractedValue ?? 0;

  const completionPct = total > 0 ? Math.round((soldFiltered / total) * 100) : 0;
  const animatedRevenue = useAnimatedRevenue(totalRevenue, started);
  const animatedCompletionPct = useAnimatedNumber(completionPct, started, 0.9);

  // A2 — hero sublabel + completion context reflect the applied period honestly.
  const soldSummaryLabel = filterActive
    ? `${soldFiltered} njësi të shitura në periudhën e zgjedhur`
    : `${soldFiltered} njësi të shitura gjithsej`;

  // Period label for badges / chip
  const periodLabel: string | null =
    !filterActive
      ? null
      : filterMonth === "all"
      ? `${filterYear}`
      : `${SQ_MONTHS[filterMonth as number]} ${filterYear}`;

  const activePeriodChipLabel =
    !filterActive
      ? "Të gjitha vitet"
      : filterMonth === "all"
      ? `${filterYear}`
      : `${SQ_MONTHS[filterMonth as number]} ${filterYear}`;

  // Hero "Vlera e kontraktuar" badge — A2 makes the badge mirror the filter state.
  const heroRevenueBadgeLabel = filterActive ? (periodLabel ?? "Periudha e zgjedhur") : "Aktuale";

  const completionContextLabel = filterActive
    ? filterMonth === "all"
      ? "e stokut në vitin e zgjedhur"
      : "e stokut në periudhën e zgjedhur"
    : "e projektit e shitur";

  const kpis: KpiDef[] = [
    { key: "total",     label: "Gjithsej njësi",        value: total,        total, color: "#003883", icon: Building2,    badge: null },
    { key: "available", label: "Njësi në dispozicion", value: available,    total, color: NAVY,      icon: CheckCircle2, badge: null },
    { key: "sold",      label: "Njësi të shitura",    value: soldFiltered, total, color: "#b14b4b", icon: BadgeCheck,   badge: periodLabel },
  ];

  return (
    <div style={{ backgroundColor: "#f8f8fa" }}>
      <div className="mx-auto max-w-[1100px] px-10 py-10">

        {/* Header */}
        <PageHeader
          tone="brand"
          className="!mb-1 items-start"
          subtitleStyle={{ color: "rgba(15,23,42,0.5)" }}
          title={
            <motion.span {...fadeUp(0)} className="block">
              UF Partners Residence
            </motion.span>
          }
          subtitle={
            <>
              <motion.span {...fadeUp(0.06)} className="block">
                Rr. Agron Selenica, Gjilan
              </motion.span>
              <motion.span
                {...fadeUp(0.07)}
                className="mt-0.5 block text-[12.5px]"
                style={{ color: "rgba(15,23,42,0.4)" }}
              >
                Pronësia Investitor · pamje financiare sipas periudhës së zgjedhur
              </motion.span>
            </>
          }
          right={
            <motion.span {...fadeUp(0.08)} className="mt-1 text-[13px] text-black/28">
              {todayAlbanian()}
            </motion.span>
          }
        />

        {/* Period filter — right-aligned above hero card */}
        <motion.div {...fadeUp(0.08)} className="mb-1 flex justify-end gap-2">
          <CustomSelect
            size="sm"
            className="min-w-[148px]"
            options={["Të gjitha vitet", ...FILTER_YEARS.map(String)]}
            value={filterYear === "all" ? "Të gjitha vitet" : String(filterYear)}
            onChange={(v) => {
              const nextYear = v === "Të gjitha vitet" ? "all" : Number(v);
              setFilterYear(nextYear);
              setFilterMonth("all");
            }}
          />
          <AnimatePresence initial={false}>
            {filterYear !== "all" && (
              <motion.div
                key="overview-month-filter"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: SOFT_EASE }}
              >
                <CustomSelect
                  size="sm"
                  className="min-w-[148px]"
                  options={SQ_MONTHS}
                  value={filterMonth === "all" ? "" : SQ_MONTHS[filterMonth as number]}
                  placeholder="Të gjitha muajt"
                  onChange={(v) => setFilterMonth(v === "" ? "all" : SQ_MONTHS.indexOf(v))}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.44, delay: 0.05, ease: SOFT_EASE }}
          className="mb-8 flex items-end justify-between rounded-[24px] border border-[#E8E8EC] bg-white px-8 py-7"
          style={{ boxShadow: OVERVIEW_HERO_SHADOW }}
        >
          {/* Left: label tightly above revenue */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <p
                className="text-[11px] uppercase tracking-[0.14em] text-black/35"
                style={{ fontWeight: 600 }}
              >
                Vlera e kontraktuar
              </p>
              <AnimatedPeriodBadge label={heroRevenueBadgeLabel} />
            </div>
            <p
              className="text-[52px] leading-none tracking-[-2px]"
              style={{ color: NAVY, fontWeight: 700 }}
            >
              {fmtEur(animatedRevenue)}
            </p>
            {activeFinancialError && (
              <p className="mt-1.5 text-[11.5px] text-[#b14b4b]/80">
                Treguesit financiarë nuk u ngarkuan për këtë periudhë.
              </p>
            )}
          </div>

          {/* Right: completion stats */}
          <div className="flex flex-col items-end gap-1 text-right">
            <p className="text-[13px] text-black/50" style={{ fontWeight: 400 }}>
              {soldSummaryLabel}
            </p>
            <p
              className="text-[38px] leading-none tracking-[-1.5px]"
              style={{ color: NAVY, fontWeight: 700 }}
            >
              {animatedCompletionPct}%
            </p>
            <p className="text-[12px] text-black/40">
              {completionContextLabel}
            </p>
          </div>
        </motion.div>

        {/* KPI cards */}
        <div className="mb-8 flex gap-4">
          {kpis.map((k, i) => (
            <KpiCard key={k.key} kpi={k} delay={0.1 + i * 0.07} active={started} />
          ))}
        </div>

        {/* Monthly sales chart */}
        <motion.div
          {...sectionReveal(0.12)}
          className="mb-8 rounded-[18px] border border-[#e8e8ec] bg-white px-6 pb-5 pt-4"
          style={{ boxShadow: OVERVIEW_CARD_SHADOW }}
        >
          <CardSectionHeader
            title="Shitjet mujore"
            subtitle={
              chartYear === null
                ? "Zgjidh një vit për të parë shitjet mujore"
                : `Njësi të shitura sipas muajit — ${chartYear}`
            }
            className="mb-3 border-b-0 px-0 py-0"
            bodyClassName="max-w-[420px]"
            titleClassName="text-[16px] leading-[1.18] tracking-[0em]"
            subtitleClassName="mt-0.5 text-[11.75px] leading-[1.35]"
            titleStyle={{ fontWeight: 700 }}
            subtitleStyle={{ color: "rgba(15,23,42,0.42)" }}
          />

          <DeferredOverviewMonthlySalesChart
            chartYear={chartYear}
            selectedMonthIndex={filterMonth === "all" ? null : filterMonth}
            started={started}
          />
        </motion.div>

        {/* Ownership structure — snapshot stock + filtered sold */}
        <motion.p
          {...ownershipSectionReveal(0.04)}
          className="mb-3 text-[11px] uppercase tracking-[0.1em] text-black/28"
          style={{ fontWeight: 600 }}
        >
          Struktura e pronësisë
        </motion.p>
        <div className="grid gap-4 md:grid-cols-2">
          <SecondaryPartyCard
            category="Pronarët e tokës"
            units={units}
            year={filterYear}
            month={filterMonth}
            periodContextLabel={activePeriodChipLabel}
            delay={0.08}
            active={started}
          />
          <SecondaryPartyCard
            category="Kompani ndërtimore"
            units={units}
            year={filterYear}
            month={filterMonth}
            periodContextLabel={activePeriodChipLabel}
            delay={0.12}
            active={started}
          />
        </div>

      </div>
    </div>
  );
}
