import type { ComponentType, CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { SurfaceCard } from "../components/ui/SurfaceCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { NAVY, SURFACE_SHADOW_PANEL_STRONG } from "../ui/tokens";
import { cardMotion, formatPercent, progressWidth, type IconType } from "./shared";

export { SectionHeader };

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceCard
      variant="panel"
      className={`executive-reports-card ${className}`}
      style={{ boxShadow: SURFACE_SHADOW_PANEL_STRONG }}
    >
      {children}
    </SurfaceCard>
  );
}

export function HeroMetricCard({
  label,
  value,
  footnote,
  progress,
  color,
  icon: Icon,
  delay,
}: {
  label: string;
  value: string;
  footnote?: string;
  progress: number;
  color: string;
  icon: IconType;
  delay: number;
}) {
  const metricValueKey = `${label}-${value}`;
  const showFootnote = footnote !== undefined;
  return (
    <motion.div {...cardMotion(delay)} data-metric-value={metricValueKey}>
      <div className="rounded-[18px] border border-[#edf0f4] bg-white px-5 py-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#eaf0fa]">
            <Icon size={17} style={{ color: NAVY }} strokeWidth={1.9} />
          </div>
          {showFootnote && (
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-black/28">
              {formatPercent(progress)}
            </span>
          )}
        </div>
        <p
          className="text-[34px] leading-none tracking-[-0.04em]"
          style={{ fontWeight: 700, color: NAVY }}
        >
          {value}
        </p>
        <p className="mt-3 text-[13px] text-black/48" style={{ fontWeight: 600 }}>
          {label}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/[0.06]">
          <div
            className="h-full rounded-full"
            style={{ width: progressWidth(progress), backgroundColor: color }}
          />
        </div>
        {showFootnote && <p className="mt-2.5 text-[12px] text-black/36">{footnote}</p>}
      </div>
    </motion.div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  delay,
}: {
  label: string;
  value: string;
  icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    style?: CSSProperties;
  }>;
  delay: number;
}) {
  return (
    <motion.div {...cardMotion(delay)}>
      <Card className="h-full px-5 py-5">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#eaf0fa]">
          <Icon size={16} style={{ color: NAVY }} strokeWidth={1.9} />
        </div>
        <p
          className="text-[28px] leading-none tracking-[-0.03em]"
          style={{ fontWeight: 700, color: NAVY }}
        >
          {value}
        </p>
        <p className="mt-2.5 text-[12.5px] text-black/45" style={{ fontWeight: 600 }}>
          {label}
        </p>
      </Card>
    </motion.div>
  );
}
