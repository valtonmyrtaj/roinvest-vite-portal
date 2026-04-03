import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Users, Phone, Eye, ShoppingBag } from "lucide-react";

const kpis = [
  { label: "Leads", value: 1247, change: "+12.3%", up: true, icon: Users },
  { label: "Calls", value: 864, change: "+8.1%", up: true, icon: Phone },
  { label: "Showings", value: 312, change: "-2.4%", up: false, icon: Eye },
  { label: "Sales", value: 89, change: "+15.7%", up: true, icon: ShoppingBag },
];

function useCountUp(end: number, startAnimation: boolean, duration = 1100) {
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

function KPICard({
  kpi,
  delay,
}: {
  kpi: (typeof kpis)[number];
  delay: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const animatedValue = useCountUp(kpi.value, inView, 1100 + delay * 300);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: "12.5px",
            color: "#94a3b8",
            fontWeight: 400,
            letterSpacing: "0.02em",
          }}
        >
          {kpi.label}
        </span>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.35, delay: delay + 0.15 }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "#f0f4ff" }}
        >
          <kpi.icon size={15} color="#003883" />
        </motion.div>
      </div>

      <div className="flex items-end gap-2.5">
        <span
          style={{
            fontSize: "26px",
            fontWeight: 600,
            color: "#0f172a",
            lineHeight: 1,
          }}
        >
          {animatedValue.toLocaleString("en-US")}
        </span>

        <motion.span
          initial={{ opacity: 0, x: 8 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 8 }}
          transition={{ duration: 0.35, delay: delay + 0.24 }}
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: kpi.up ? "#16a34a" : "#dc2626",
            marginBottom: "2px",
          }}
        >
          {kpi.change}
        </motion.span>
      </div>

      <motion.span
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.35, delay: delay + 0.32 }}
        style={{ fontSize: "11px", color: "#cbd5e1" }}
      >
        vs previous period
      </motion.span>
    </motion.div>
  );
}

export function KPICards() {
  return (
    <div className="grid grid-cols-4 gap-5">
      {kpis.map((kpi, index) => (
        <KPICard key={kpi.label} kpi={kpi} delay={index * 0.06} />
      ))}
    </div>
  );
}