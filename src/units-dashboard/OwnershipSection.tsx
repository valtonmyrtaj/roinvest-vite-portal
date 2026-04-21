import { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { SectionEyebrow } from "../components/ui/Eyebrow";
import type { Unit } from "../hooks/useUnits";
import { getOwnerCategoryStyle } from "../lib/ownerColors";
import {
  AnimatedNumber,
  Card,
  OwnershipDonut,
  type OwnershipPieDatum,
} from "./primitives";
import {
  OWNER_CATEGORIES,
} from "./shared";

export function OwnershipSection({ units }: { units: Unit[] }) {
  const ownershipKpis = useMemo(() => {
    return OWNER_CATEGORIES.map((cat) => {
      const count = units.filter((u) => u.owner_category === cat).length;
      const total = units.length || 1;
      const colors = getOwnerCategoryStyle(cat);
      return {
        label: cat,
        value: count,
        pct: `${((count / total) * 100).toFixed(0)}%`,
        ...colors,
      };
    });
  }, [units]);

  const ownershipPieData = useMemo<OwnershipPieDatum[]>(
    () => ownershipKpis.map((o) => ({ name: o.label, value: o.value, color: o.color })),
    [ownershipKpis],
  );

  return (
    <div className="mb-8">
      <SectionEyebrow
        className="mb-4"
        label="Shpërndarja e pronësisë"
        detail={`${units.length} njësi të caktuara`}
      />

      <div className="grid grid-cols-12 gap-4">
        {ownershipKpis.map((o, index) => (
          <motion.div
            key={o.label}
            className="col-span-3"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.42, delay: index * 0.06, ease: "easeOut" }}
          >
            <Card className="h-full">
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
                      width: units.length > 0 ? `${(o.value / units.length) * 100}%` : "0%",
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
            </Card>
          </motion.div>
        ))}

        <motion.div
          className="col-span-3"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.42, delay: 0.22, ease: "easeOut" }}
        >
          <Card className="h-full">
            <p className="mb-3 text-[12px] text-black/40" style={{ fontWeight: 500 }}>
              Struktura e pronësisë
            </p>
            <OwnershipDonut data={ownershipPieData} />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
