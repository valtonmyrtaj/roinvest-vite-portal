import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { motion, useInView } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useDashboard } from "./context/DashboardContext";

const cumulativeData = [
  { month: "Oct", spend: 120000 },
  { month: "Nov", spend: 245000 },
  { month: "Dec", spend: 390000 },
  { month: "Jan", spend: 540000 },
  { month: "Feb", spend: 710000 },
  { month: "Mar", spend: 862000 },
];

const viewsTrend = [
  { month: "Oct", current: 48000, previous: 32000 },
  { month: "Nov", current: 62000, previous: 41000 },
  { month: "Dec", current: 54000, previous: 45000 },
  { month: "Jan", current: 78000, previous: 52000 },
  { month: "Feb", current: 91000, previous: 60000 },
  { month: "Mar", current: 104000, previous: 68000 },
];

function useCountUp(end: number, startAnimation: boolean, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!startAnimation) return;

    let frame = 0;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(end * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [end, startAnimation, duration]);

  return value;
}

function useHasEnteredView(amount = 0.28) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount });
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (inView) setHasEntered(true);
  }, [inView]);

  return { ref, inView, hasEntered };
}

function formatCurrency(v: number) {
  return v >= 1000000
    ? `€${(v / 1000000).toFixed(1)}M`
    : v >= 1000
      ? `€${(v / 1000).toFixed(0)}K`
      : `€${v}`;
}

function formatViews(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`;
}

function formatFullEuro(v: number) {
  return `€${v.toLocaleString("en-US")}`;
}

function formatPlainNumber(v: number) {
  return v.toLocaleString("en-US");
}

function parseNumericValue(value: string) {
  return Number(value.replace(/[^\d]/g, ""));
}

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

const CustomTooltip = ({ active, payload, label, isCurrency }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
      <p className="mb-1 text-[11px] text-gray-400">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[12px] text-gray-800">
          {p.name}: {isCurrency ? formatCurrency(p.value) : formatViews(p.value)}
        </p>
      ))}
    </div>
  );
};

function AnimatedSectionTitle({
  title,
  subtitle,
  startAnimation,
}: {
  title: string;
  subtitle?: string;
  startAnimation: boolean;
}) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div className="flex items-stretch gap-3.5">
        <motion.div
          initial={{ scaleY: 0, opacity: 0.45 }}
          animate={startAnimation ? { scaleY: 1, opacity: 0.8 } : { scaleY: 0, opacity: 0.45 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="origin-top w-[3px] rounded-full bg-[#003883]"
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={startAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className="text-[17px] tracking-[0.005em] text-gray-900"
            style={{ fontWeight: 600, letterSpacing: "-0.01em" }}
          >
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[12px] text-gray-400">{subtitle}</p>}
        </motion.div>
      </div>
    </div>
  );
}

function AnimatedKpiCard({
  label,
  value,
  change,
  positive,
  subtitle,
  startAnimation,
  delay = 0,
  valueType = "currency",
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  subtitle?: string;
  startAnimation: boolean;
  delay?: number;
  valueType?: "currency" | "number";
}) {
  const numericValue = useMemo(() => parseNumericValue(value), [value]);
  const animatedValue = useCountUp(numericValue, startAnimation, 1200);

  const displayValue =
    valueType === "currency"
      ? formatFullEuro(animatedValue)
      : formatPlainNumber(animatedValue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={startAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-5"
    >
      <p className="text-[11px] uppercase tracking-[0.06em] text-gray-400">{label}</p>

      <div className="flex items-end justify-between">
        <p className="leading-none text-[26px] tracking-tight text-gray-900">
          {displayValue}
        </p>

        {change && (
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={startAnimation ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
            transition={{ duration: 0.4, delay: delay + 0.24 }}
            className={`flex items-center gap-0.5 text-[12px] ${
              positive ? "text-emerald-500" : "text-red-400"
            }`}
          >
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {change}
          </motion.span>
        )}
      </div>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={startAnimation ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.35, delay: delay + 0.34 }}
          className="text-[11px] text-gray-300"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

function MarketingSection({
  children,
}: {
  children: (state: { inView: boolean; hasEntered: boolean }) => React.ReactNode;
}) {
  const { ref, inView, hasEntered } = useHasEnteredView(0.22);

  return (
    <section ref={ref} className="relative mb-10">
      {children({ inView, hasEntered })}
    </section>
  );
}

function AnimatedSpendTrendChart({ show }: { show: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={cumulativeData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#003883" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#003883" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip isCurrency />} />
        <Area
          key={show ? "spend-active" : "spend-idle"}
          type="monotone"
          dataKey="spend"
          name="Cumulative"
          stroke="#003883"
          strokeWidth={2}
          fill="url(#spendGrad)"
          isAnimationActive={show}
          animationBegin={180}
          animationDuration={1400}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AnimatedViewsBarChart({ show }: { show: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={viewsTrend}
        margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
        barGap={4}
      >
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          key={show ? "previous-active" : "previous-idle"}
          dataKey="previous"
          name="Previous"
          fill="#003883"
          fillOpacity={0.15}
          radius={[4, 4, 0, 0]}
          barSize={20}
          isAnimationActive={show}
          animationBegin={120}
          animationDuration={800}
          animationEasing="ease-out"
        />
        <Bar
          key={show ? "current-active" : "current-idle"}
          dataKey="current"
          name="Current"
          fill="#003883"
          radius={[4, 4, 0, 0]}
          barSize={20}
          isAnimationActive={show}
          animationBegin={520}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function MarketingDashboard() {
  const { data } = useDashboard();

  const budgetRef = useRef<HTMLDivElement | null>(null);
  const budgetInView = useInView(budgetRef, { once: true, amount: 0.45 });

  const monthlySpend = data.marketing.spend;
  const yearlySpend = cumulativeData[cumulativeData.length - 1]?.spend ?? monthlySpend;
  const weeklySpend = Math.round(monthlySpend / 4);

  const monthlyViews = data.marketing.reach;
  const yearlyViews = viewsTrend.reduce((sum, item) => sum + item.current, 0);
  const weeklyViews = Math.round(monthlyViews / 4);

  const periodTotal = useCountUp(monthlySpend, budgetInView, 1250);
  const dailyAverage = useCountUp(Math.round(monthlySpend / 30), budgetInView, 1250);
  const remainingBudgetBase = Math.max(data.targets.monthlyRevenueTarget - monthlySpend, 0);
  const remainingBudget = useCountUp(remainingBudgetBase, budgetInView, 1250);

  const budgetPercentValue =
    data.targets.monthlyRevenueTarget > 0
      ? Math.min(
          Math.round((monthlySpend / data.targets.monthlyRevenueTarget) * 100),
          100
        )
      : 0;

  const budgetPercent = useCountUp(budgetPercentValue, budgetInView, 1100);

  const spendVsTarget = pctChange(monthlySpend, data.targets.monthlyRevenueTarget || 1);
  const viewsVsLeads = pctChange(monthlyViews, data.marketing.leadsGenerated || 1);

  return (
    <div className="flex-1 overflow-auto bg-[#FAFBFC]">
      <div className="mx-auto max-w-[1200px] px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="mb-1 flex items-center gap-2.5">
            <h1 className="text-[22px] tracking-tight text-gray-900">Marketing</h1>
          </div>
          <p className="text-[13px] text-gray-400">
            Live campaign performance, spend and reach overview
          </p>
        </motion.div>

        <MarketingSection>
          {({ inView, hasEntered }) => (
            <>
              <AnimatedSectionTitle
                title="Total Marketing Spend"
                subtitle="Investment overview across all channels"
                startAnimation={inView}
              />

              <div className="mb-5 grid grid-cols-3 gap-4">
                <AnimatedKpiCard
                  label="Weekly Spend"
                  value={formatFullEuro(weeklySpend)}
                  change={spendVsTarget >= 0 ? `+${spendVsTarget.toFixed(1)}%` : `${spendVsTarget.toFixed(1)}%`}
                  positive={spendVsTarget >= 0}
                  subtitle="vs. revenue target reference"
                  startAnimation={inView}
                  delay={0.06}
                  valueType="currency"
                />
                <AnimatedKpiCard
                  label="Monthly Spend"
                  value={formatFullEuro(monthlySpend)}
                  change={spendVsTarget >= 0 ? `+${spendVsTarget.toFixed(1)}%` : `${spendVsTarget.toFixed(1)}%`}
                  positive={spendVsTarget >= 0}
                  subtitle="live from OS"
                  startAnimation={inView}
                  delay={0.14}
                  valueType="currency"
                />
                <AnimatedKpiCard
                  label="Yearly Spend"
                  value={formatFullEuro(yearlySpend)}
                  change="+22.1%"
                  positive
                  subtitle="6-month cumulative total"
                  startAnimation={inView}
                  delay={0.22}
                  valueType="currency"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl border border-gray-100 bg-white p-6"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-gray-800">Cumulative Spend Trend</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">Oct 2025 – Mar 2026</p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                    transition={{ duration: 0.4, delay: 0.48 }}
                    className="flex items-center gap-1.5 text-emerald-500"
                  >
                    <TrendingUp size={14} />
                    <span className="text-[12px]">On track</span>
                  </motion.div>
                </div>

                <div className="h-[220px]">
                  {hasEntered ? (
                    <AnimatedSpendTrendChart show={hasEntered} />
                  ) : (
                    <div className="h-full" />
                  )}
                </div>
              </motion.div>
            </>
          )}
        </MarketingSection>

        <MarketingSection>
          {({ inView }) => (
            <>
              <AnimatedSectionTitle
                title="Spend This Period"
                subtitle="Current live monthly operating view"
                startAnimation={inView}
              />

              <motion.div
                ref={budgetRef}
                initial={{ opacity: 0, y: 22 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
                transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl border border-gray-100 bg-white p-6"
              >
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="mb-3 text-[11px] uppercase tracking-[0.06em] text-gray-400">
                      Period Total
                    </p>

                    <p className="mb-2 text-[34px] leading-none tracking-tight text-gray-900">
                      {formatFullEuro(periodTotal)}
                    </p>

                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={budgetInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                      transition={{ duration: 0.4, delay: 0.24 }}
                      className={`flex items-center gap-1.5 ${
                        spendVsTarget >= 0 ? "text-emerald-500" : "text-red-400"
                      }`}
                    >
                      {spendVsTarget >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span className="text-[12px]">
                        {spendVsTarget >= 0 ? "+" : ""}
                        {spendVsTarget.toFixed(1)}% vs revenue target
                      </span>
                    </motion.div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={budgetInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                      transition={{ duration: 0.38, delay: 0.14 }}
                      className="flex items-center justify-between border-b border-gray-50 py-3"
                    >
                      <span className="text-[12px] text-gray-400">Daily Average</span>
                      <span className="text-[13px] text-gray-800">{formatFullEuro(dailyAverage)}</span>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={budgetInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                      transition={{ duration: 0.38, delay: 0.22 }}
                      className="flex items-center justify-between border-b border-gray-50 py-3"
                    >
                      <span className="text-[12px] text-gray-400">Budget Utilisation</span>
                      <div className="flex items-center gap-3">
                        <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={budgetInView ? { width: `${budgetPercentValue}%` } : { width: 0 }}
                            transition={{ duration: 1, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full bg-[#003883]"
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.6, x: 0 }}
                            animate={
                              budgetInView
                                ? { opacity: 1, scale: 1, x: `${budgetPercentValue}%` }
                                : { opacity: 0, scale: 0.6, x: 0 }
                            }
                            transition={{ duration: 0.45, delay: 1.02 }}
                            className="absolute top-1/2 -ml-1.5 flex h-3 w-3 -translate-y-1/2 items-center justify-center rounded-full bg-[#003883]/12"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-[#003883]" />
                          </motion.div>
                        </div>
                        <span className="text-[13px] text-gray-800">{budgetPercent}%</span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={budgetInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                      transition={{ duration: 0.38, delay: 0.3 }}
                      className="flex items-center justify-between py-3"
                    >
                      <span className="text-[12px] text-gray-400">Remaining Budget</span>
                      <span className="text-[13px] text-gray-800">{formatFullEuro(remainingBudget)}</span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </MarketingSection>

        <MarketingSection>
          {({ inView, hasEntered }) => (
            <>
              <AnimatedSectionTitle
                title="Total Views / Reach"
                subtitle="Audience exposure across all channels"
                startAnimation={inView}
              />

              <div className="mb-5 grid grid-cols-3 gap-4">
                <AnimatedKpiCard
                  label="Weekly Reach"
                  value={formatPlainNumber(weeklyViews)}
                  change={viewsVsLeads >= 0 ? `+${viewsVsLeads.toFixed(1)}%` : `${viewsVsLeads.toFixed(1)}%`}
                  positive={viewsVsLeads >= 0}
                  subtitle="vs leads generated"
                  startAnimation={inView}
                  delay={0.06}
                  valueType="number"
                />
                <AnimatedKpiCard
                  label="Monthly Reach"
                  value={formatPlainNumber(monthlyViews)}
                  change={viewsVsLeads >= 0 ? `+${viewsVsLeads.toFixed(1)}%` : `${viewsVsLeads.toFixed(1)}%`}
                  positive={viewsVsLeads >= 0}
                  subtitle="live from OS"
                  startAnimation={inView}
                  delay={0.14}
                  valueType="number"
                />
                <AnimatedKpiCard
                  label="Yearly Reach"
                  value={formatPlainNumber(yearlyViews)}
                  change="+31.8%"
                  positive
                  subtitle="6-month reach total"
                  startAnimation={inView}
                  delay={0.22}
                  valueType="number"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl border border-gray-100 bg-white p-6"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-gray-800">Reach: Current vs Previous Period</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">6-month comparison</p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="flex items-center gap-5"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm bg-[#003883]" />
                      <span className="text-[11px] text-gray-400">Current</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm bg-[#003883]/20" />
                      <span className="text-[11px] text-gray-400">Previous</span>
                    </div>
                  </motion.div>
                </div>

                <div className="h-[220px]">
                  {hasEntered ? (
                    <AnimatedViewsBarChart show={hasEntered} />
                  ) : (
                    <div className="h-full" />
                  )}
                </div>
              </motion.div>
            </>
          )}
        </MarketingSection>
      </div>
    </div>
  );
}