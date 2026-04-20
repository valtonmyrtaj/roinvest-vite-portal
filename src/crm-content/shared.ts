import { useEffect, useState } from "react";
import type { UnitHistoryRow } from "../lib/api/history";
import { NAVY, SOFT_EASE } from "../ui/tokens";
export { NAVY, SOFT_EASE };

export const HISTORY_BORDER: Record<string, string> = {
  "E shitur": "#b14b4b",
  "E rezervuar": "#b0892f",
  "Në dispozicion": "#3c7a57",
};

export type HistoryEntry = {
  id: string;
  unit_id: string;
  changed_at: string;
  change_reason: string;
  previous_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
};

function toHistoryData(value: UnitHistoryRow["new_data"]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function normalizeHistoryEntry(row: UnitHistoryRow): HistoryEntry | null {
  if (!row.changed_at) {
    return null;
  }

  const nextData = toHistoryData(row.new_data);
  const previousData = toHistoryData(row.previous_data);
  const derivedUnitId =
    row.unit_id ??
    (typeof nextData.unit_id === "string"
      ? nextData.unit_id
      : typeof previousData.unit_id === "string"
        ? previousData.unit_id
        : "");

  return {
    id: row.id,
    unit_id: derivedUnitId,
    changed_at: row.changed_at,
    change_reason: row.change_reason ?? "",
    previous_data: previousData,
    new_data: nextData,
  };
}

export const MONTH_LABELS = [
  "Janar",
  "Shkurt",
  "Mars",
  "Prill",
  "Maj",
  "Qershor",
  "Korrik",
  "Gusht",
  "Shtator",
  "Tetor",
  "Nëntor",
  "Dhjetor",
];

export const MONTH_SHORT_LABELS = [
  "Jan",
  "Shk",
  "Mar",
  "Pri",
  "Maj",
  "Qer",
  "Kor",
  "Gus",
  "Sht",
  "Tet",
  "Nën",
  "Dhj",
];

export const YEAR_OPTIONS = ["2026", "2027", "2028", "2029", "2030"] as const;

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, delay, ease: "easeOut" as const },
});

export function sectionMotion(delay = 0) {
  return {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.18 },
    transition: { duration: 0.26, delay, ease: SOFT_EASE },
  };
}

function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const TODAY_ISO = getTodayISO();

export function toDateOnly(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return value.slice(0, 10);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "tani";
  if (mins < 60) return `${mins} min më parë`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} orë më parë`;

  const days = Math.floor(hrs / 24);
  if (days === 1) return "1 ditë më parë";
  if (days < 30) return `${days} ditë më parë`;

  const months = Math.floor(days / 30);
  return months === 1 ? "1 muaj më parë" : `${months} muaj më parë`;
}

export function fmtDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

export function fmtDateTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function fmtMetric(value: number) {
  return value.toLocaleString("de-DE");
}

export function useCountUp(end: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let t0: number | null = null;

    const tick = (timestamp: number) => {
      if (!t0) t0 = timestamp;
      const progress = Math.min((timestamp - t0) / duration, 1);
      setValue(Math.round(end * (1 - Math.pow(1 - progress, 3))));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, end]);

  return value;
}
