import { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { SectionEyebrow } from "../components/ui/Eyebrow";
import type { OwnerCategory } from "../hooks/useUnits";
import { getOwnerCategoryStyle } from "../lib/ownerColors";
import {
  AnimatedNumber,
  KpiCardSurface,
  MetricCardSkeleton,
  OwnershipDonut,
  type OwnershipPieDatum,
} from "./primitives";
import { OWNER_CATEGORIES } from "./shared";

export function OwnershipSection({
  totalUnits,
  ownershipCounts,
  loading = false,
}: {
  totalUnits: number;
  ownershipCounts: Record<OwnerCategory, number>;
  loading?: boolean;
}) {
  const ownershipKpis = useMemo(() => {
    return OWNER_CATEGORIES.map((cat) => {
      const count = ownershipCounts[cat];
      const total = totalUnits || 1;
      const colors = getOwnerCategoryStyle(cat);
      return {
        label: cat,
        value: count,
        pct: `${((count / total) * 100).toFixed(0)}%`,
        ...colors,
      };
    });
  }, [ownershipCounts, totalUnits]);

  const ownershipPieData = useMemo<OwnershipPieDatum[]>(
    () => ownershipKpis.map((o) => ({ name: o.label, value: o.value, color: o.color })),
    [ownershipKpis],
  );

  return (
    <div className="mb-8">
      <SectionEyebrow
        className="mb-4"
        label="Shpërndarja e pronësisë"
        detail={loading ? "duke ngarkuar inventarin" : `${totalUnits} njësi në regjistër`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: ownershipKpis.length }, (_, index) => (
              <motion.div
                key={`ownership-skeleton-${index}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: index * 0.04, ease: "easeOut" }}
              >
                <MetricCardSkeleton className="h-full" />
              </motion.div>
            ))
          : ownershipKpis.map((o, index) => (
              <motion.div
                key={o.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.42, delay: index * 0.06, ease: "easeOut" }}
              >
                <KpiCardSurface className="h-full">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                      style={{ background: o.bg }}
                    >
                      <Building2 size={16} style={{ color: o.color }} strokeWidth={1.7} />
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px]"
                      style={{ background: o.bg, color: o.color, fontWeight: 600 }}
                    >
                      {o.pct}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p
                      className="text-[30px] leading-none tracking-[-1.5px]"
                      style={{ color: o.color, fontWeight: 600 }}
                    >
                      <AnimatedNumber value={o.value} />
                    </p>
                    <p className="mt-1.5 text-[12px] text-black/46">{o.label}</p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/[0.05]">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{
                          width: totalUnits > 0 ? `${(o.value / totalUnits) * 100}%` : "0%",
                        }}
                        viewport={{ once: true, amount: 0.35 }}
                        transition={{
                          duration: 0.95,
                          delay: 0.1 + index * 0.06,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{ backgroundColor: o.color, opacity: 0.76 }}
                      />
                    </div>
                  </div>
                </KpiCardSurface>
              </motion.div>
            ))}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.42, delay: 0.22, ease: "easeOut" }}
        >
          <KpiCardSurface className="h-full">
            <p className="mb-3 text-[12px] text-black/40" style={{ fontWeight: 500 }}>
              Struktura e pronësisë
            </p>
            {loading ? (
              <div className="space-y-3">
                <div className="h-[100px] w-[100px] animate-pulse rounded-full bg-[#eef1f5]" />
                <div className="space-y-2">
                  <div className="h-3 w-full animate-pulse rounded-full bg-[#f2f4f7]" />
                  <div className="h-3 w-[82%] animate-pulse rounded-full bg-[#f2f4f7]" />
                  <div className="h-3 w-[76%] animate-pulse rounded-full bg-[#f2f4f7]" />
                </div>
              </div>
            ) : totalUnits === 0 ? (
              <div className="flex h-full min-h-[148px] items-center justify-center rounded-[14px] border border-dashed border-[#e7eaef] bg-[#fcfcfd] px-4 text-center">
                <div>
                  <p className="text-[12.5px] font-medium text-black/45">
                    Struktura do të shfaqet sapo të ketë njësi të regjistruara.
                  </p>
                  <p className="mt-1 text-[11.5px] text-black/30">
                    Kjo pamje ndihmon për të lexuar peshën e secilës kategori.
                  </p>
                </div>
              </div>
            ) : (
              <OwnershipDonut data={ownershipPieData} />
            )}
          </KpiCardSurface>
        </motion.div>
      </div>
    </div>
  );
}
