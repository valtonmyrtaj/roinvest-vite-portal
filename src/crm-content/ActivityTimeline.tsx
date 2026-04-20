import { useEffect, useMemo, useState } from "react";
import { history } from "../lib/api";
import { useUnits } from "../hooks/useUnits";
import { Card } from "./primitives";
import {
  HISTORY_BORDER,
  NAVY,
  isToday,
  normalizeHistoryEntry,
  timeAgo,
  type HistoryEntry,
} from "./shared";

export function ActivityTimeline({ refreshKey = 0 }: { refreshKey?: number }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { units } = useUnits();
  const unitsByUnitId = useMemo(() => new Map(units.map((unit) => [unit.unit_id, unit])), [units]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      void history.listRecentUnitHistory({ limit: 50 }).then(({ data }) => {
        if (cancelled) return;
        setEntries(
          (data ?? [])
            .map(normalizeHistoryEntry)
            .filter((entry): entry is HistoryEntry => entry !== null),
        );
        setLoading(false);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [refreshKey]);

  const FIELD_LABELS: Record<string, string | null> = {
    price: "Çmimi",
    updated_at: null,
    status: "Statusi",
    owner_name: "Pronari",
    owner_category: "Kategoria",
    block: "Blloku",
    type: "Lloji",
    level: "Niveli",
    size: "Sipërfaqja",
    notes: "Shënime",
    sale_date: "Data e shitjes",
    reservation_expires_at: "Skadon më",
    unit_id: "ID e njësisë",
  };

  const meaningfulEntries = entries.filter((entry) => {
    const changedFields = Object.keys(entry.new_data).filter(
      (key) => JSON.stringify(entry.previous_data[key]) !== JSON.stringify(entry.new_data[key]),
    );
    return changedFields.some((key) => FIELD_LABELS[key] !== null);
  });

  const todayEntries = meaningfulEntries.filter((entry) => isToday(entry.changed_at));
  const olderEntries = meaningfulEntries.filter((entry) => !isToday(entry.changed_at));

  function TimelineNode({ entry }: { entry: HistoryEntry }) {
    const next = entry.new_data;
    const prev = entry.previous_data;
    const newStatus = next.status as string | undefined;
    const prevStatus = prev.status as string | undefined;
    const dotColor = newStatus ? (HISTORY_BORDER[newStatus] ?? NAVY) : NAVY;
    const changedFields = Object.keys(next).filter(
      (key) => JSON.stringify(prev[key]) !== JSON.stringify(next[key]) && FIELD_LABELS[key] !== null,
    );
    const changeDescription =
      changedFields.includes("status") && prevStatus && newStatus
        ? `${prevStatus} → ${newStatus}`
        : changedFields.length > 0
          ? changedFields.map((key) => FIELD_LABELS[key] ?? key).join(", ")
          : "—";
    const unitLabel = (next.unit_id as string | undefined) ?? entry.unit_id;

    const unit = unitsByUnitId.get(unitLabel);
    let unitMeta: string | null = null;
    if (unit) {
      const parts: string[] = [];
      if (unit.block) parts.push(unit.block);
      if (unit.level) parts.push(unit.level);
      if (unit.size && unit.size > 0) parts.push(`${unit.size}m²`);
      if (parts.length > 0) unitMeta = parts.join(" · ");
    }

    return (
      <div className="relative flex gap-4 pb-3.5 pl-2">
        <div className="flex flex-col items-center">
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1.5px]"
            style={{ backgroundColor: dotColor, boxShadow: `0 0 0 1.5px ${dotColor}` }}
          />
          <div className="mt-1 w-px flex-1 bg-[#e8e8ec]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold" style={{ color: NAVY }}>
              {unitLabel}
            </span>
            <span className="shrink-0 text-[11px] text-black/30">{timeAgo(entry.changed_at)}</span>
          </div>
          {unitMeta && <p className="mt-0.5 text-[11px] text-black/35">{unitMeta}</p>}
          <p className="mt-0.5 text-[12px] text-black/50">{entry.change_reason}</p>
          <p className="mt-0.5 text-[11.5px] text-black/35">{changeDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[#f0f0f2] px-5 py-3.5">
        <p className="text-[14px] font-semibold tracking-[-0.2px]" style={{ color: NAVY }}>
          Aktiviteti i fundit
        </p>
        <p className="mt-0.5 text-[12px] text-black/35">50 ndryshimet e fundit në njësi</p>
      </div>
      <div className="max-h-[480px] overflow-y-auto px-5 pb-1 pt-3.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-10 text-center text-[13px] text-black/30">Duke ngarkuar...</div>
        ) : entries.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-black/30">Asnjë aktivitet i regjistruar</div>
        ) : (
          <>
            {todayEntries.length > 0 && (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: NAVY }}>
                    Sot
                  </span>
                  <div className="h-px flex-1 bg-[#EAF0FA]" />
                </div>
                {todayEntries.map((entry) => (
                  <TimelineNode key={entry.id} entry={entry} />
                ))}
              </>
            )}
            {olderEntries.length > 0 && (
              <>
                {todayEntries.length > 0 && (
                  <div className="mb-3 mt-1 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-black/30">
                      Më herët
                    </span>
                    <div className="h-px flex-1 bg-[#e8e8ec]" />
                  </div>
                )}
                {olderEntries.map((entry) => (
                  <TimelineNode key={entry.id} entry={entry} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
