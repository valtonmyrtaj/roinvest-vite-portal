import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useInView } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CustomSelect } from "../components/CustomSelect";
import { SurfaceCard } from "../components/ui/SurfaceCard";
import { SOFT_EASE, SURFACE_BG, SURFACE_BORDER } from "../ui/tokens";

const UNITS_KPI_BASE_SHADOW = "0 1px 2px rgba(0,0,0,0.04), 0 10px 26px rgba(0,0,0,0.035)";
const UNITS_KPI_HOVER_SHADOW =
  "0 1px 2px rgba(15,23,42,0.045), 0 20px 40px rgba(15,23,42,0.085)";

function useHasEnteredView<T extends HTMLElement>(amount = 0.35) {
  const ref = useRef<T | null>(null);
  const hasEntered = useInView(ref, { once: true, amount });
  return { ref, hasEntered };
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceCard padding="md" className={className}>
      {children}
    </SurfaceCard>
  );
}

export function KpiCardSurface({
  children,
  className = "",
  active = false,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <motion.div
      className={`transform-gpu rounded-[18px] border bg-white p-5 will-change-transform ${className}`.trim()}
      style={{
        background: active ? "#fbfdff" : SURFACE_BG,
        borderColor: active ? "#aebfdb" : SURFACE_BORDER,
        boxShadow: active
          ? "0 1px 2px rgba(15,23,42,0.045), 0 14px 30px rgba(15,23,42,0.06)"
          : UNITS_KPI_BASE_SHADOW,
      }}
      whileHover={{
        y: -1.5,
        boxShadow: UNITS_KPI_HOVER_SHADOW,
        borderColor: active ? "#9fb7dc" : "#dde1e7",
      }}
      transition={{ duration: 0.15, ease: SOFT_EASE }}
    >
      {children}
    </motion.div>
  );
}

export function FilterSelect({
  options,
  value,
  onChange,
  optionMeta,
  placeholder,
  size = "lg",
  className = "min-w-[172px]",
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  optionMeta?: Record<string, string | undefined>;
  placeholder: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={[...options]}
      optionMeta={optionMeta}
      placeholder={placeholder}
      size={size}
      className={className}
    />
  );
}

export function MetricCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="h-10 w-10 animate-pulse rounded-[12px] bg-[#eef1f5]" />
        <div className="h-5 w-12 animate-pulse rounded-full bg-[#f2f4f7]" />
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="h-8 w-20 animate-pulse rounded-full bg-[#eef1f5]" />
        <div className="h-3 w-28 animate-pulse rounded-full bg-[#f2f4f7]" />
      </div>
    </Card>
  );
}

export function AnimatedNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const { ref: viewRef, hasEntered } = useHasEnteredView<HTMLSpanElement>(0.35);

  useEffect(() => {
    if (!hasEntered || !ref.current) return;
    const controls = animate(0, value, {
      duration: 1.05,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(latest) {
        if (ref.current) ref.current.textContent = Math.round(latest).toString();
      },
    });
    return () => controls.stop();
  }, [hasEntered, value]);

  return (
    <span ref={viewRef} className={className}>
      <span ref={ref}>0</span>
    </span>
  );
}

export type OwnershipPieDatum = {
  name: string;
  value: number;
  color: string;
};

export function OwnershipDonut({ data }: { data: OwnershipPieDatum[] }) {
  const { ref, hasEntered } = useHasEnteredView<HTMLDivElement>(0.3);

  return (
    <div ref={ref} className="flex items-center gap-3">
      <div className="min-h-[100px] min-w-[100px]">
        {hasEntered ? (
          <ResponsiveContainer width={100} height={100}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={46}
                strokeWidth={2}
                stroke="#fff"
                isAnimationActive
                animationBegin={60}
                animationDuration={950}
                animationEasing="ease-out"
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[100px] w-[100px]" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[11.5px]">
            <span
              className="inline-block h-[7px] w-[7px] rounded-full"
              style={{ background: d.color }}
            />
            <span className="text-black/55">{d.name}</span>
            <span className="ml-auto pl-2 text-black/80" style={{ fontWeight: 600 }}>
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
