import {
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { SurfaceCard } from "../components/ui/SurfaceCard";
import type { PaymentStatus } from "../hooks/usePayments";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { GOLD, GREEN, NAVY, RED, SOFT_EASE } from "../ui/tokens";
import { statusTone, type ChartPoint } from "./shared";

type TooltipPayloadItem = {
  value?: number | string;
  payload: ChartPoint;
};

function useCountUp(end: number, active: boolean, duration = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let startTime: number | null = null;

    const animateValue = (timestamp: number) => {
      if (!startTime) startTime = timestamp;

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(end * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(animateValue);
      }
    };

    frame = requestAnimationFrame(animateValue);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, end]);

  return value;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceCard variant="panel" padding="md" className={className}>
      {children}
    </SurfaceCard>
  );
}

export function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const value = Number(payload[0].value ?? 0);

  return (
    <div
      className="rounded-[10px] border border-[#e8e8ec] bg-white px-3 py-2"
      style={{ boxShadow: "0 6px 16px rgba(0,0,0,0.10)" }}
    >
      <p className="text-[11px] text-black/40">{label}</p>
      <p className="text-[13px]" style={{ color: NAVY, fontWeight: 700 }}>
        {fmtEur(value)}
      </p>
    </div>
  );
}

export function MetricSkeleton({
  valueClassName,
  detailClassName = "h-[12px] w-[120px]",
}: {
  valueClassName: string;
  detailClassName?: string;
}) {
  return (
    <div className="mt-2.5 space-y-2.5">
      <div className={`animate-pulse rounded-full bg-[#eef1f5] ${valueClassName}`} />
      {detailClassName !== "hidden" && (
        <div className={`animate-pulse rounded-full bg-[#f2f4f7] ${detailClassName}`} />
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  color,
  icon: Icon,
  active,
  loading = false,
  displayValueOverride,
  formatValue,
}: {
  label: string;
  value: number;
  color: string;
  icon: ComponentType<{
    size?: number;
    style?: CSSProperties;
    strokeWidth?: number;
  }>;
  active: boolean;
  loading?: boolean;
  displayValueOverride?: string;
  formatValue?: (value: number) => string;
}) {
  const animatedValue = useCountUp(value, active);
  const iconBg =
    color === GREEN ? "#edf7f1" : color === RED ? "#fbeeee" : color === GOLD ? "#fff8e8" : "#eaf0fa";
  const displayValue = formatValue ? formatValue(animatedValue) : String(animatedValue);
  const valueClassName = "mt-2 -translate-y-1 text-[34px] leading-none tracking-[-0.04em]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: "0 12px 24px rgba(16,24,40,0.07)" }}
      transition={{ duration: 0.2, ease: SOFT_EASE }}
      className="h-full rounded-[20px] will-change-transform"
    >
      <Card className="flex h-full min-h-[154px] flex-col">
        <div
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-[12px]"
          style={{ background: iconBg }}
        >
          <Icon size={16} style={{ color }} strokeWidth={1.8} />
        </div>
        <p className="min-h-[13px] text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-black/30">
          {label}
        </p>
        {loading ? (
          <MetricSkeleton valueClassName="h-[34px] w-[132px]" detailClassName="hidden" />
        ) : displayValueOverride !== undefined ? (
          <p className={valueClassName} style={{ color, fontWeight: 700 }}>
            {displayValueOverride}
          </p>
        ) : (
          <p className={valueClassName} style={{ color, fontWeight: 700 }}>
            {displayValue}
          </p>
        )}
      </Card>
    </motion.div>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tone = statusTone(status);

  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
      style={{ background: tone.bg, color: tone.color }}
    >
      {status}
    </span>
  );
}
