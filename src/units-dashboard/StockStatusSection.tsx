import { useMemo } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Building2, CheckCircle2, Clock3 } from "lucide-react";
import { SectionEyebrow } from "../components/ui/Eyebrow";
import type { OwnerCategory, UnitStatus } from "../hooks/useUnits";
import type { StockTypeCounts } from "../lib/api/unitsShell";
import { SOFT_EASE } from "../ui/tokens";
import {
  AnimatedNumber,
  Card,
  FilterSelect,
  KpiCardSurface,
  MetricCardSkeleton,
} from "./primitives";
import { OWNER_CATEGORIES } from "./shared";

const STOCK_TYPE_ITEMS = [
  { key: "Garazhë", label: "Garazhë" },
  { key: "Lokal", label: "Lokale" },
  { key: "Banesë", label: "Banesa" },
  { key: "Penthouse", label: "Penthouse" },
] as const;

export function StockStatusSection({
  loading = false,
  selectedOwnerCategory,
  selectedOwnerEntity,
  ownerNames,
  ownerEntityCounts,
  stockCounts,
  stockTypeCounts,
  activeStatusFilter,
  onOwnerCategoryChange,
  onOwnerEntityChange,
  onStatusFilterChange,
}: {
  loading?: boolean;
  selectedOwnerCategory: OwnerCategory;
  selectedOwnerEntity: string;
  ownerNames: string[];
  ownerEntityCounts: Record<string, number>;
  stockCounts: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
  };
  stockTypeCounts: StockTypeCounts;
  activeStatusFilter: UnitStatus | "";
  onOwnerCategoryChange: (category: OwnerCategory) => void;
  onOwnerEntityChange: (entity: string) => void;
  onStatusFilterChange: (status: UnitStatus | "") => void;
}) {
  const stockKpis = useMemo(
    () => [
      {
        status: "Në dispozicion" as const,
        label: "Në dispozicion",
        value: stockCounts.available,
        icon: CheckCircle2,
        color: "#3c7a57",
        bg: "#edf7f1",
      },
      {
        status: "E rezervuar" as const,
        label: "E rezervuar",
        value: stockCounts.reserved,
        icon: Clock3,
        color: "#b0892f",
        bg: "#fff8e8",
      },
      {
        status: "E shitur" as const,
        label: "E shitur",
        value: stockCounts.sold,
        icon: BadgeCheck,
        color: "#b14b4b",
        bg: "#fbeeee",
      },
      {
        status: "" as const,
        label: "Gjithsej njësi",
        value: stockCounts.total,
        icon: Building2,
        color: "#18181b",
        bg: "#f4f4f5",
      },
    ],
    [stockCounts],
  );

  const stockTypeBreakdown = useMemo(
    () =>
      STOCK_TYPE_ITEMS.map((item) => {
        const value = stockTypeCounts[item.key];
        const pct = stockCounts.total > 0 ? Math.round((value / stockCounts.total) * 100) : 0;

        return {
          ...item,
          value,
          pct,
        };
      }),
    [stockCounts.total, stockTypeCounts],
  );

  const ownerNameCountMeta = useMemo(
    () =>
      Object.fromEntries(
        ownerNames.map((name) => {
          const count = ownerEntityCounts[name] ?? 0;
          return [name, `${count} njësi`];
        }),
      ),
    [ownerEntityCounts, ownerNames],
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
                <div className="grid rounded-[18px] border border-[#e4e9f1] bg-[#f7f9fc] p-[5px] shadow-[0_1px_2px_rgba(16,24,40,0.025)] sm:grid-cols-3">
                  {OWNER_CATEGORIES.map((ownerCategory) => {
                    const active = selectedOwnerCategory === ownerCategory;
                    return (
                      <button
                        key={ownerCategory}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onOwnerCategoryChange(ownerCategory)}
                        className="relative min-h-[42px] rounded-[13px] px-4 py-2.5 text-left text-[13px] outline-none transition-colors duration-150 hover:bg-white/55 focus-visible:ring-2 focus-visible:ring-[#003883]/18"
                      >
                        {active && (
                          <motion.span
                            layoutId="owner-switcher-pill"
                            className="absolute inset-0 rounded-[13px] border"
                            style={{
                              backgroundColor: "#ffffff",
                              borderColor: "#dbe5f3",
                              boxShadow:
                                "0 1px 2px rgba(15,23,42,0.035), 0 8px 18px rgba(15,23,42,0.055)",
                            }}
                            transition={{ duration: 0.2, ease: SOFT_EASE }}
                          />
                        )}
                        <span
                          className="relative z-10 transition-colors duration-150"
                          style={{
                            color: active ? "#003883" : "rgba(0,0,0,0.48)",
                            fontWeight: active ? 650 : 500,
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
                  optionMeta={ownerNameCountMeta}
                  placeholder="Të gjithë pronarët"
                  className="w-full min-w-0"
                />
              </label>
            </div>
          </div>

          <div className="-mt-3 px-5 pb-5">
            <motion.div
              key={`${selectedOwnerCategory}-${selectedOwnerEntity || "all"}-${loading ? "loading" : "ready"}`}
              initial={{ opacity: 0.72 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.14, ease: SOFT_EASE }}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
            >
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
                      <button
                        type="button"
                        aria-pressed={activeStatusFilter === kpi.status}
                        onClick={() => onStatusFilterChange(kpi.status)}
                        className="group h-full w-full rounded-[18px] text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#003883]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        <KpiCardSurface
                          active={activeStatusFilter === kpi.status}
                          className="h-full"
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-[14px] transition-transform duration-150 group-hover:scale-[1.025]"
                              style={{ background: kpi.bg }}
                            >
                              <kpi.icon size={15} style={{ color: kpi.color }} strokeWidth={1.7} />
                            </div>
                            <span
                              className="text-[11px] transition-colors duration-150"
                              style={{
                                color:
                                  activeStatusFilter === kpi.status
                                    ? "rgba(0,56,131,0.52)"
                                    : "rgba(0,0,0,0.30)",
                              }}
                            >
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
                      </button>
                    </motion.div>
                  ))}
            </motion.div>

            <motion.div
              key={`types-${selectedOwnerCategory}-${selectedOwnerEntity || "all"}-${loading ? "loading" : "ready"}`}
              initial={{ opacity: 0.72, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: SOFT_EASE }}
              className="mt-4 grid gap-3 rounded-[18px] border border-[#e6ebf3] bg-[#fbfcfe] px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.025)] md:grid-cols-[minmax(150px,0.72fr)_repeat(4,minmax(0,1fr))] md:items-center"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/30">
                  Lloji i njësive
                </p>
                <p className="mt-1 truncate text-[11.5px] text-black/38">
                  {selectedOwnerEntity || selectedOwnerCategory}
                </p>
              </div>

              {loading
                ? STOCK_TYPE_ITEMS.map((item) => (
                    <div
                      key={`type-skeleton-${item.key}`}
                      className="h-[52px] animate-pulse rounded-[14px] bg-[#f1f4f8]"
                    />
                  ))
                : stockTypeBreakdown.map((item) => (
                    <div
                      key={item.key}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-[14px] border border-black/[0.035] bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] font-medium text-black/48">
                          {item.label}
                        </p>
                        <p className="mt-1 text-[10.5px] text-black/28">
                          {item.pct}%
                        </p>
                      </div>
                      <p className="shrink-0 text-[20px] font-semibold leading-none tracking-[-0.04em] text-[#003883]">
                        <AnimatedNumber value={item.value} />
                      </p>
                    </div>
                  ))}
            </motion.div>
          </div>
        </div>
      </Card>
    </div>
  );
}
