import { useMemo } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Building2, CheckCircle2, Clock3 } from "lucide-react";
import { SectionEyebrow } from "../components/ui/Eyebrow";
import type { OwnerCategory, Unit } from "../hooks/useUnits";
import { AnimatedNumber, Card, FilterSelect } from "./primitives";
import { OWNER_CATEGORIES } from "./shared";

export function StockStatusSection({
  selectedOwnerCategory,
  selectedOwnerEntity,
  ownerNames,
  stockStatusUnits,
  onOwnerCategoryChange,
  onOwnerEntityChange,
}: {
  selectedOwnerCategory: OwnerCategory;
  selectedOwnerEntity: string;
  ownerNames: string[];
  stockStatusUnits: Unit[];
  onOwnerCategoryChange: (category: OwnerCategory) => void;
  onOwnerEntityChange: (entity: string) => void;
}) {
  const stockKpis = useMemo(
    () => [
      {
        label: "Në dispozicion",
        value: stockStatusUnits.filter((u) => u.status === "Në dispozicion").length,
        icon: CheckCircle2,
        color: "#3c7a57",
        bg: "#edf7f1",
      },
      {
        label: "E rezervuar",
        value: stockStatusUnits.filter((u) => u.status === "E rezervuar").length,
        icon: Clock3,
        color: "#b0892f",
        bg: "#fff8e8",
      },
      {
        label: "E shitur",
        value: stockStatusUnits.filter((u) => u.status === "E shitur").length,
        icon: BadgeCheck,
        color: "#b14b4b",
        bg: "#fbeeee",
      },
      {
        label: "Gjithsej njësi",
        value: stockStatusUnits.length,
        icon: Building2,
        color: "#18181b",
        bg: "#f4f4f5",
      },
    ],
    [stockStatusUnits],
  );

  return (
    <div className="mb-8">
      <SectionEyebrow
        className="mb-4"
        label="Statusi i stokut"
        detail="sipas pronarit"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-[14px] border border-[#e8e8ec] bg-white p-[4px] shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
          {OWNER_CATEGORIES.map((ownerCategory) => {
            const active = selectedOwnerCategory === ownerCategory;
            return (
              <button
                key={ownerCategory}
                onClick={() => onOwnerCategoryChange(ownerCategory)}
                className="relative flex items-center gap-2 rounded-[11px] px-4 py-[8px] text-[13px] transition-all duration-200"
                style={{
                  backgroundColor: active ? "#003883" : "#ffffff",
                  color: active ? "#ffffff" : "rgba(0,0,0,0.48)",
                  fontWeight: active ? 600 : 450,
                }}
              >
                {ownerCategory}
                {active && (
                  <motion.span
                    layoutId="owner-toggle-indicator"
                    className="absolute inset-0 rounded-[11px]"
                    style={{ border: "1.5px solid #003883" }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <FilterSelect
          options={ownerNames}
          value={selectedOwnerEntity}
          onChange={onOwnerEntityChange}
          placeholder="Të gjithë pronarët"
        />

        <span className="text-[12px] text-black/30">
          {stockStatusUnits.length} njësi · {selectedOwnerEntity || selectedOwnerCategory}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stockKpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.38, delay: index * 0.05, ease: "easeOut" }}
          >
            <Card className="transition-transform duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-[14px]"
                  style={{ background: kpi.bg }}
                >
                  <kpi.icon size={15} style={{ color: kpi.color }} strokeWidth={1.7} />
                </div>
                <span className="text-[11px] text-black/30">
                  {stockStatusUnits.length > 0
                    ? `${((kpi.value / stockStatusUnits.length) * 100).toFixed(0)}%`
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
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
