import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { EyebrowLabel } from "../components/ui/Eyebrow";
import type { Unit, UnitHistory } from "../hooks/useUnits";
import { SQ_MONTHS_LONG } from "./shared";
import { SkeletonRows } from "../components/SkeletonRows";

export function HistoryDrawer({
  unit,
  onClose,
  fetchHistory,
}: {
  unit: Unit;
  onClose: () => void;
  fetchHistory: (id: string) => Promise<UnitHistory[]>;
}) {
  const [history, setHistory] = useState<UnitHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory(unit.id).then((h) => {
      setHistory(h);
      setLoadingHistory(false);
    });
  }, [unit.id, fetchHistory]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = SQ_MONTHS_LONG[d.getMonth()];
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hh}:${mm}`;
  };

  const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = SQ_MONTHS_LONG[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const isTimestamp = (val: string) => val.includes("T") && (val.includes("+") || val.includes("Z"));
  const isDateOnly = (val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val);

  const formatFieldValue = (val: unknown, field?: string): string => {
    if (val === null || val === undefined) return "—";
    const s = String(val);
    if (field === "reservation_expires_at") {
      if (isDateOnly(s)) return formatDateShort(`${s}T00:00:00`);
      if (isTimestamp(s)) return formatDateShort(s);
    }
    if (isTimestamp(s)) return formatDate(s);
    return s;
  };

  const fieldLabels: Record<string, string> = {
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
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex h-full w-[480px] flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#f0f0f2] px-6 py-5">
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-black/90">
              {unit.unit_id}
            </p>
            <p className="mt-0.5 text-[12px] text-black/40">
              {unit.block} · {unit.level} · {unit.size} m²
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/05"
          >
            <X size={16} className="text-black/40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <EyebrowLabel as="p" className="mb-4 text-black/35">
            Historia e ndryshimeve
          </EyebrowLabel>

          {loadingHistory ? (
            <SkeletonRows rows={4} />
          ) : history.length === 0 ? (
            <div className="text-center">
              <p className="text-[13px] font-medium text-black/40">
                Nuk ka ndryshime të regjistruara ende për këtë njësi
              </p>
              <p className="mt-1 text-[11.5px] text-black/28">
                Sapo të ruhen përditësime, ato do të shfaqen këtu.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {history.map((h) => {
                const prev = h.previous_data as Partial<Unit>;
                const next = h.new_data as Partial<Unit>;
                const changedFields = Object.keys(next).filter(
                  (k) => JSON.stringify(prev[k as keyof Unit]) !== JSON.stringify(next[k as keyof Unit]),
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
                          <span className="text-black/40">
                            {fieldLabels[field] ?? field.replace(/_/g, " ")}:
                          </span>
                          <span className="text-[#b14b4b] line-through">
                            {formatFieldValue(prev[field as keyof Unit], field)}
                          </span>
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
