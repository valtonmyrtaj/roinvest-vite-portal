import { useMemo, useRef, useState, useEffect } from "react";
import { useInView, motion, animate } from "framer-motion";
import {
  CheckCircle2,
  Clock3,
  BadgeCheck,
  Building2,
  Filter,
  Search,
  Users,
  X,
  ChevronRight,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CustomSelect } from "./components/CustomSelect";
import { useUnits } from "./hooks/useUnits";
import type { Unit, UnitHistory, OwnerCategory, UnitStatus } from "./hooks/useUnits";

const TYPES = ["Banesë", "Lokal", "Garazhë"] as const;
const BLOCKS = ["Blloku A", "Blloku B", "Blloku C"] as const;
const LEVELS = [
  "Garazhë", "Përdhesa", "Kati 1", "Kati 2", "Kati 3",
  "Kati 4", "Kati 5", "Kati 6", "Penthouse",
] as const;
const STATUSES = ["Në dispozicion", "E rezervuar", "E shitur"] as const;
const OWNER_CATEGORIES = ["Investitor", "Pronarët e tokës", "Kompani ndërtimore"] as const;

const OWNER_COLORS: Record<OwnerCategory, { color: string; bg: string }> = {
  Investitor: { color: "#003883", bg: "#EAF0FA" },
  "Pronarët e tokës": { color: "#335792", bg: "#F2F5FA" },
  "Kompani ndërtimore": { color: "#5D7298", bg: "#F5F7FB" },
};

const STATUS_PILL: Record<UnitStatus, string> = {
  "Në dispozicion": "bg-[#edf7f1] text-[#3c7a57]",
  "E rezervuar": "bg-[#fff8e8] text-[#b0892f]",
  "E shitur": "bg-[#fbeeee] text-[#b14b4b]",
};

const STATUS_ORDER: Record<UnitStatus, number> = {
  "Në dispozicion": 0,
  "E rezervuar": 1,
  "E shitur": 2,
};

const normalize = (v: string) => v.trim().toLowerCase();
const fmtPrice = (n: number) =>
  `€${n.toLocaleString("de-DE")}`;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[18px] border border-[#e8e8ec] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.02)] ${className}`}>
      {children}
    </div>
  );
}

function FilterSelect({ options, value, onChange, placeholder }: {
  options: readonly string[]; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={[...options]}
      placeholder={placeholder}
      size="lg"
      className="min-w-[172px]"
    />
  );
}

function useHasEnteredView(amount = 0.35) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount });
  const [hasEntered, setHasEntered] = useState(false);
  useEffect(() => { if (inView) setHasEntered(true); }, [inView]);
  return { ref, hasEntered };
}

function AnimatedNumber({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const { ref: viewRef, hasEntered } = useHasEnteredView(0.35);
  useEffect(() => {
    if (!hasEntered || !ref.current) return;
    const controls = animate(0, value, {
      duration: 1.05,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(latest) { if (ref.current) ref.current.textContent = Math.round(latest).toString(); },
    });
    return () => controls.stop();
  }, [hasEntered, value]);
  return <span ref={viewRef} className={className}><span ref={ref}>0</span></span>;
}

function OwnershipDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const { ref, hasEntered } = useHasEnteredView(0.3);
  return (
    <div ref={ref} className="flex items-center gap-3">
      <div className="min-h-[100px] min-w-[100px]">
        {hasEntered ? (
          <ResponsiveContainer width={100} height={100}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={28} outerRadius={46} strokeWidth={2} stroke="#fff"
                isAnimationActive animationBegin={60} animationDuration={950} animationEasing="ease-out">
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : <div className="h-[100px] w-[100px]" />}
      </div>
      <div className="flex flex-col gap-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[11.5px]">
            <span className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: d.color }} />
            <span className="text-black/55">{d.name}</span>
            <span className="ml-auto pl-2 text-black/80" style={{ fontWeight: 600 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryDrawer({ unit, onClose, fetchHistory }: {
  unit: Unit; onClose: () => void; fetchHistory: (id: string) => Promise<UnitHistory[]>;
}) {
  const [history, setHistory] = useState<UnitHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory(unit.id).then((h) => { setHistory(h); setLoadingHistory(false); });
  }, [unit.id, fetchHistory]);

  const SQ_MONTHS = ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = SQ_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hh}:${mm}`;
  };

  const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = SQ_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const isTimestamp = (val: string) => val.includes("T") && (val.includes("+") || val.includes("Z"));
  const isDateOnly = (val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val);

  const formatFieldValue = (val: unknown, field?: string): string => {
    if (val === null || val === undefined) return "—";
    const s = String(val);
    if (field === "reservation_expires_at") {
      if (isDateOnly(s)) return formatDateShort(s + "T00:00:00");
      if (isTimestamp(s)) return formatDateShort(s);
    }
    if (isTimestamp(s)) return formatDate(s);
    return s;
  };

  const FIELD_LABELS: Record<string, string> = {
    status: "Statusi",
    updated_at: "Përditësuar më",
    reservation_expires_at: "Skadon më",
    notes: "Shënime",
    block: "Blloku",
    type: "Lloji",
    level: "Niveli",
    size: "Sipërfaqja",
    price: "Çmimi",
    owner_category: "Kategoria",
    owner_name: "Pronari",
    unit_id: "ID e njësisë",
  };

  const statusColor = (status: string | undefined) =>
    status === "E rezervuar"
      ? "#b0892f"
      : status === "E shitur"
      ? "#b14b4b"
      : "#3c7a57";

  const newStatusColor = (next: Partial<Unit>, field: string) => {
    if (field === "status") return statusColor(next.status);
    if (field === "reservation_expires_at") return statusColor(next.status);
    if (field === "updated_at" && next.status !== undefined) return statusColor(next.status);
    return "#3c7a57";
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex h-full w-[480px] flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#f0f0f2] px-6 py-5">
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-black/90">{unit.unit_id}</p>
            <p className="mt-0.5 text-[12px] text-black/40">{unit.block} · {unit.level} · {unit.size} m²</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/05">
            <X size={16} className="text-black/40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-black/35">Historia e ndryshimeve</p>

          {loadingHistory ? (
            <p className="text-[13px] text-black/30">Duke ngarkuar...</p>
          ) : history.length === 0 ? (
            <p className="text-[13px] text-black/30">Asnjë ndryshim i regjistruar.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {history.map((h) => {
                const prev = h.previous_data as Partial<Unit>;
                const next = h.new_data as Partial<Unit>;
                const changedFields = Object.keys(next).filter(
                  (k) => JSON.stringify(prev[k as keyof Unit]) !== JSON.stringify(next[k as keyof Unit])
                );
                return (
                  <div key={h.id} className="rounded-[14px] border border-[#f0f0f2] bg-[#fafafa] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] text-black/40">{formatDate(h.changed_at)}</span>
                      {h.change_reason && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                          style={
                            h.change_reason === "E rezervuar"
                              ? { background: "#fff8e8", color: "#b0892f" }
                              : h.change_reason === "E shitur"
                              ? { background: "#fbeeee", color: "#b14b4b" }
                              : h.change_reason === "Në dispozicion"
                              ? { background: "#edf7f1", color: "#3c7a57" }
                              : { background: "#EAF0FA", color: "#003883" }
                          }
                        >
                          {h.change_reason}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {changedFields.map((field) => (
                        <div key={field} className="flex items-center gap-2 text-[12px]">
                          <span className="text-black/40">{FIELD_LABELS[field] ?? field.replace(/_/g, " ")}:</span>
                          <span className="text-[#b14b4b] line-through">{formatFieldValue(prev[field as keyof Unit], field)}</span>
                          <ChevronRight size={10} className="text-black/25" />
                          <span style={{ color: newStatusColor(next, field) }}>
                            {formatFieldValue(next[field as keyof Unit], field)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function UnitsDashboard() {
  const { units, loading, fetchUnitHistory } = useUnits();

  const [blockF, setBlockF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [levelF, setLevelF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [ownerCategoryF, setOwnerCategoryF] = useState("");
  const [ownerNameF, setOwnerNameF] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOwnerCategory, setSelectedOwnerCategory] = useState<OwnerCategory>("Investitor");
  const [selectedOwnerEntity, setSelectedOwnerEntity] = useState("");
  const [historyUnit, setHistoryUnit] = useState<Unit | null>(null);

  const ownerNames = useMemo(() => {
    const names = units
      .filter((u) => u.owner_category === selectedOwnerCategory)
      .map((u) => u.owner_name);
    return [...new Set(names)];
  }, [units, selectedOwnerCategory]);

  const stockStatusUnits = useMemo(() => {
    return units.filter((u) => {
      const matchCategory = u.owner_category === selectedOwnerCategory;
      const matchEntity = !selectedOwnerEntity || u.owner_name === selectedOwnerEntity;
      return matchCategory && matchEntity;
    });
  }, [units, selectedOwnerCategory, selectedOwnerEntity]);

  const stockKpis = useMemo(() => [
    { label: "Në dispozicion", value: stockStatusUnits.filter((u) => u.status === "Në dispozicion").length, icon: CheckCircle2, color: "#3c7a57", bg: "#edf7f1" },
    { label: "E rezervuar", value: stockStatusUnits.filter((u) => u.status === "E rezervuar").length, icon: Clock3, color: "#b0892f", bg: "#fff8e8" },
    { label: "E shitur", value: stockStatusUnits.filter((u) => u.status === "E shitur").length, icon: BadgeCheck, color: "#b14b4b", bg: "#fbeeee" },
    { label: "Gjithsej njësi", value: stockStatusUnits.length, icon: Building2, color: "#18181b", bg: "#f4f4f5" },
  ], [stockStatusUnits]);

  const ownershipKpis = useMemo(() => {
    return OWNER_CATEGORIES.map((cat) => {
      const count = units.filter((u) => u.owner_category === cat).length;
      const total = units.length || 1;
      const c = OWNER_COLORS[cat];
      return { label: cat, value: count, pct: `${((count / total) * 100).toFixed(0)}%`, ...c };
    });
  }, [units]);

  const ownershipPieData = ownershipKpis.map((o) => ({ name: o.label, value: o.value, color: o.color }));

  const allOwnerNames = useMemo(() => [...new Set(units.map((u) => u.owner_name))], [units]);

  const filtered = useMemo(() => {
    return [...units]
      .filter((u) => {
        return (
          (!blockF || normalize(u.block) === normalize(blockF)) &&
          (!typeF || normalize(u.type) === normalize(typeF)) &&
          (!levelF || normalize(u.level) === normalize(levelF)) &&
          (!statusF || normalize(u.status) === normalize(statusF)) &&
          (!ownerCategoryF || normalize(u.owner_category) === normalize(ownerCategoryF)) &&
          (!ownerNameF || normalize(u.owner_name) === normalize(ownerNameF)) &&
          (!search || normalize(u.unit_id).includes(normalize(search)) || normalize(u.owner_name).includes(normalize(search)))
        );
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [units, blockF, typeF, levelF, statusF, ownerCategoryF, ownerNameF, search]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f8fa]">
      {historyUnit && (
        <HistoryDrawer
          unit={historyUnit}
          onClose={() => setHistoryUnit(null)}
          fetchHistory={fetchUnitHistory}
        />
      )}

      <div className="mx-auto max-w-[1280px] px-10 py-10">
        <div className="mb-8">
          <h2 className="text-[22px] tracking-[-0.03em] text-black/92" style={{ fontWeight: 600 }}>
            Të gjitha njësitë
          </h2>
          <p className="mt-1 text-[13px] text-black/36">
            Pamje e plotë e inventarit të njësive, me filtrim sipas llojit, nivelit, statusit dhe kategorisë së pronësisë.
          </p>
        </div>

        {/* Ownership Distribution */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.1em] text-black/35" style={{ fontWeight: 600 }}>Shpërndarja e pronësisë</span>
            <span className="text-[11px] text-black/25">— {units.length} njësi të caktuara</span>
          </div>
          <div className="mb-4 h-px bg-black/[0.05]" />
          <div className="grid grid-cols-12 gap-4">
            {ownershipKpis.map((o, index) => (
              <motion.div key={o.label} className="col-span-3"
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.42, delay: index * 0.06, ease: "easeOut" }}>
                <Card className="h-full">
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: o.bg }}>
                      <Building2 size={16} style={{ color: o.color }} strokeWidth={1.7} />
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: o.bg, color: o.color, fontWeight: 600 }}>{o.pct}</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-[30px] leading-none tracking-[-1.5px]" style={{ color: o.color, fontWeight: 600 }}>
                      <AnimatedNumber value={o.value} />
                    </p>
                    <p className="mt-1.5 text-[12px] text-black/46">{o.label}</p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/[0.05]">
                      <motion.div className="h-full rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: units.length > 0 ? `${(o.value / units.length) * 100}%` : "0%" }}
                        viewport={{ once: true, amount: 0.35 }}
                        transition={{ duration: 0.95, delay: 0.1 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        style={{ backgroundColor: o.color, opacity: 0.76 }} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
            <motion.div className="col-span-3"
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.42, delay: 0.22, ease: "easeOut" }}>
              <Card className="h-full">
                <p className="mb-3 text-[12px] text-black/40" style={{ fontWeight: 500 }}>Struktura e pronësisë</p>
                <OwnershipDonut data={ownershipPieData} />
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Stock Status */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.1em] text-black/35" style={{ fontWeight: 600 }}>Statusi i stokut</span>
            <span className="text-[11px] text-black/25">— sipas pronarit</span>
          </div>
          <div className="mb-4 h-px bg-black/[0.05]" />

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-[14px] border border-[#e8e8ec] bg-white p-[4px] shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
              {OWNER_CATEGORIES.map((o) => {
                const active = selectedOwnerCategory === o;
                const c = OWNER_COLORS[o];
                return (
                  <button key={o} onClick={() => { setSelectedOwnerCategory(o); setSelectedOwnerEntity(""); }}
                    className="relative flex items-center gap-2 rounded-[11px] px-4 py-[8px] text-[13px] transition-all duration-200"
                    style={{ backgroundColor: active ? c.bg : "transparent", color: active ? c.color : "rgba(0,0,0,0.48)", fontWeight: active ? 600 : 450 }}>
                    <Users size={12} strokeWidth={2} style={{ color: active ? c.color : "rgba(0,0,0,0.28)" }} />
                    {o}
                    {active && (
                      <motion.span layoutId="owner-toggle-indicator" className="absolute inset-0 rounded-[11px]"
                        style={{ border: `1.5px solid ${c.color}22` }}
                        transition={{ duration: 0.18, ease: "easeOut" }} />
                    )}
                  </button>
                );
              })}
            </div>

            <FilterSelect options={ownerNames} value={selectedOwnerEntity}
              onChange={setSelectedOwnerEntity} placeholder="Të gjithë pronarët" />

            <span className="text-[12px] text-black/30">
              {stockStatusUnits.length} njësi · {selectedOwnerEntity || selectedOwnerCategory}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {stockKpis.map((k, index) => (
              <motion.div key={k.label}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.38, delay: index * 0.05, ease: "easeOut" }}>
                <Card className="transition-transform duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: k.bg }}>
                      <k.icon size={15} style={{ color: k.color }} strokeWidth={1.7} />
                    </div>
                    <span className="text-[11px] text-black/30">
                      {stockStatusUnits.length > 0 ? `${((k.value / stockStatusUnits.length) * 100).toFixed(0)}%` : "0%"}
                    </span>
                  </div>
                  <div className="mt-5">
                    <p className="text-[24px] leading-none tracking-[-1px] text-black/88" style={{ fontWeight: 600 }}>
                      <AnimatedNumber value={k.value} />
                    </p>
                    <p className="mt-1.5 text-[12px] text-black/42">{k.label}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Units Table */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.1em] text-black/35" style={{ fontWeight: 600 }}>Regjistri i njësive</span>
            <span className="text-[11px] text-black/25">— lista e plotë e stokut</span>
          </div>
          <div className="mb-4 h-px bg-black/[0.05]" />

          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f0f2] px-6 py-5">
              <div>
                <p className="text-[14px] tracking-[-0.2px] text-black" style={{ fontWeight: 550 }}>Të gjitha njësitë</p>
                <p className="mt-0.5 text-[12px] text-black/35">{filtered.length} nga {units.length} njësi të shfaqura</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Kërko sipas ID-së së njësisë"
                    className="h-[46px] w-[260px] rounded-[14px] border border-[#e8e8ec] bg-white pl-9 pr-3 text-[13px] outline-none transition-all duration-200 placeholder:text-black/24 hover:-translate-y-[1px] hover:border-[#d7dce5] focus:border-[#c8d3e8]" />
                </div>
                <div className="flex h-[46px] w-[42px] items-center justify-center rounded-[14px] border border-[#e8e8ec] bg-white text-black/30">
                  <Filter size={14} />
                </div>
                <FilterSelect options={BLOCKS} value={blockF} onChange={setBlockF} placeholder="Të gjitha blloqet" />
                <FilterSelect options={TYPES} value={typeF} onChange={setTypeF} placeholder="Të gjitha llojet" />
                <FilterSelect options={LEVELS} value={levelF} onChange={setLevelF} placeholder="Të gjitha nivelet" />
                <FilterSelect options={STATUSES} value={statusF} onChange={setStatusF} placeholder="Të gjitha statuset" />
                <FilterSelect options={OWNER_CATEGORIES} value={ownerCategoryF} onChange={setOwnerCategoryF} placeholder="Të gjitha kategoritë" />
                <FilterSelect options={allOwnerNames} value={ownerNameF} onChange={setOwnerNameF} placeholder="Të gjithë pronarët" />
              </div>
            </div>

            <div className="max-h-[560px] overflow-auto">
              {loading ? (
                <div className="py-16 text-center text-[13px] text-black/30">Duke ngarkuar njësitë...</div>
              ) : (
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 z-10 bg-[#f9f9fb]">
                    <tr className="text-black/38">
                      {["ID e njësisë", "Blloku", "Lloji", "Niveli", "Kategoria e pronësisë", "Pronari", "Sipërfaqja (m²)", "Statusi", "Çmimi", "Historia"].map((h, i) => (
                        <th key={h} className={`py-3 ${i === 0 ? "pl-6 pr-3 text-left" : i === 8 ? "pl-3 pr-3 text-right" : i === 9 ? "pl-3 pr-6 text-center" : i >= 7 ? "px-3 text-center" : "px-3 text-left"}`} style={{ fontWeight: 550 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => {
                      const ownerStyle = OWNER_COLORS[u.owner_category];
                      return (
                        <tr key={u.id} className="border-t border-[#f0f0f2] transition hover:bg-[#fafafc]">
                          <td className="py-3 pl-6 pr-3 text-black/72">{u.unit_id}</td>
                          <td className="px-3 py-3 text-black/66">{u.block}</td>
                          <td className="px-3 py-3 text-black/74">{u.type}</td>
                          <td className="px-3 py-3 text-black/66">{u.level}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-block rounded-full px-2.5 py-[3px] text-[10.5px]"
                              style={{ background: ownerStyle.bg, color: ownerStyle.color, fontWeight: 650 }}>
                              {u.owner_category}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-black/66">{u.owner_name}</td>
                          <td className="px-3 py-3 text-left text-black/66">{u.size} m²</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-block rounded-full px-2.5 py-[3px] text-[10.5px] ${STATUS_PILL[u.status]}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 pl-3 pr-3 text-right text-black/72">{fmtPrice(u.price)}</td>
                          <td className="py-3 pl-3 pr-6 text-center">
                            <button
                              onClick={() => setHistoryUnit(u)}
                              className="rounded-[8px] px-2.5 py-1 text-[11px] transition"
                              style={
                                u.status === "E rezervuar"
                                  ? { background: "#fff8e8", color: "#b0892f", border: "1px solid #b0892f30" }
                                  : u.status === "E shitur"
                                  ? { background: "#fbeeee", color: "#b14b4b", border: "1px solid #b14b4b30" }
                                  : { background: "#fff", color: "rgba(0,0,0,0.4)", border: "1px solid #e8e8ec" }
                              }
                            >
                              Historia
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-[12px] text-black/25">
                          {units.length === 0 ? "Asnjë njësi e shtuar ende. Shko te Data Input për të shtuar njësi." : "Asnjë njësi nuk përputhet me filtrat aktualë."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default UnitsDashboard;