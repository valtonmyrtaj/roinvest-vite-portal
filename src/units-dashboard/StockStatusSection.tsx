import { useMemo } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Building2, CheckCircle2, Clock3 } from "lucide-react";
import { SectionEyebrow } from "../components/ui/Eyebrow";
import type { OwnerCategory } from "../hooks/useUnits";
import { SOFT_EASE } from "../ui/tokens";
import {
  AnimatedNumber,
  Card,
  FilterSelect,
  KpiCardSurface,
  MetricCardSkeleton,
} from "./primitives";
import { OWNER_CATEGORIES } from "./shared";

export function StockStatusSection({
  loading = false,
  selectedOwnerCategory,
  selectedOwnerEntity,
  ownerNames,
  stockCounts,
  onOwnerCategoryChange,
  onOwnerEntityChange,
}: {
  loading?: boolean;
  selectedOwnerCategory: OwnerCategory;
  selectedOwnerEntity: string;
  ownerNames: string[];
  stockCounts: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
  };
  onOwnerCategoryChange: (category: OwnerCategory) => void;
  onOwnerEntityChange: (entity: string) => void;
}) {
  const stockKpis = useMemo(
    () => [
      {
        label: "Në dispozicion",
        value: stockCounts.available,
        icon: CheckCircle2,
        color: "#3c7a57",
        bg: "#edf7f1",
      },
      {
        label: "E rezervuar",
        value: stockCounts.reserved,
        icon: Clock3,
        color: "#b0892f",
        bg: "#fff8e8",
      },
      {
        label: "E shitur",
        value: stockCounts.sold,
        icon: BadgeCheck,
        color: "#b14b4b",
        bg: "#fbeeee",
      },
      {
        label: "Gjithsej njësi",
        value: stockCounts.total,
        icon: Building2,
        color: "#18181b",
        bg: "#f4f4f5",
      },
    ],
    [stockCounts],
  );

  return (
    <div className="mb-8">
      <SectionEyebrow
        className="mb-4"
        label="Statusi i stokut"
        detail={loading ? "duke ngarkuar përmbledhjen" : `${stockCounts.total} njësi në pamjen aktive`}
      />

      <Card className="overflow-hidden p-0">
        <div className="relative -top-[10px]">
          <div className="px-5 pt-0">
            <div className="grid min-h-[138px] gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)] xl:items-center">
              <div className="flex min-w-0 flex-col justify-center">
                <p className="mb-3 pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                  Pamja sipas pronësisë
                </p>
                <div className="inline-flex flex-wrap rounded-[14px] border border-[#e8e8ec] bg-white p-[4px] shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
                  {OWNER_CATEGORIES.map((ownerCategory) => {
                    const active = selectedOwnerCategory === ownerCategory;
                    return (
                      <button
                        key={ownerCategory}
                        type="button"
                        onClick={() => onOwnerCategoryChange(ownerCategory)}
                        className="relative flex items-center gap-2 rounded-[11px] px-4 py-[8px] text-[13px]"
                      >
                        {active && (
                          <motion.span
                            layoutId="owner-switcher-pill"
                            className="absolute inset-0 rounded-[11px]"
                            style={{
                              backgroundColor: "#003883",
                              boxShadow: "0 1px 2px rgba(0,56,131,0.12)",
                            }}
                            transition={{ duration: 0.18, ease: SOFT_EASE }}
                          />
                        )}
                        <span
                          className="relative z-10 transition-colors duration-150"
                          style={{
                            color: active ? "#ffffff" : "rgba(0,0,0,0.48)",
                            fontWeight: active ? 600 : 450,
                          }}
                        >
                          {ownerCategory}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex min-w-[220px] flex-col justify-center xl:min-w-0">
                <span className="mb-3 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                  Pronari
                </span>
                <FilterSelect
                  options={ownerNames}
                  value={selectedOwnerEntity}
                  onChange={onOwnerEntityChange}
                  placeholder="Të gjithë pronarët"
                  className="w-full min-w-0"
                />
              </label>
            </div>
          </div>

          <div className="-mt-3 px-5 pb-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }, (_, index) => (
                    <motion.div
                      key={`stock-skeleton-${index}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.32, delay: index * 0.04, ease: "easeOut" }}
                    >
                      <MetricCardSkeleton className="h-full" />
                    </motion.div>
                  ))
                : stockKpis.map((kpi, index) => (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.35 }}
                      transition={{ duration: 0.38, delay: index * 0.05, ease: "easeOut" }}
                    >
                      <KpiCardSurface className="h-full">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-[14px]"
                            style={{ background: kpi.bg }}
                          >
                            <kpi.icon size={15} style={{ color: kpi.color }} strokeWidth={1.7} />
                          </div>
                          <span className="text-[11px] text-black/30">
                            {stockCounts.total > 0
                              ? `${((kpi.value / stockCounts.total) * 100).toFixed(0)}%`
                              : "0%"}
                          </span>
                        </div>

                        <div className="mt-5">
                          <p
                            className="text-[24px] leading-none tracking-[-1px]"
                            style={{ fontWeight: 600, color: "#003883" }}
                          >
                            <AnimatedNumber value={kpi.value} />
                          </p>
                          <p className="mt-1.5 text-[12px]" style={{ color: "#003883" }}>
                            {kpi.label}
                          </p>
                        </div>
                      </KpiCardSurface>
                    </motion.div>
                  ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
