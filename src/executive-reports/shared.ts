import type { ComponentType, CSSProperties } from "react";
import { RED, SOFT_EASE } from "../ui/tokens";
export { NAVY, SOFT_EASE } from "../ui/tokens";

// ─── Brand tokens ────────────────────────────────────────────────────────────

export const SOLD_COLOR = RED;

// ─── Vocab ───────────────────────────────────────────────────────────────────

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

export const YEAR_OPTIONS = ["2026", "2027", "2028", "2029", "2030"] as const;

export type UnitTypology = "Banesë" | "Penthouse" | "Lokal" | "Garazhë";
export type IconType = ComponentType<{
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
}>;

// ─── Motion presets ──────────────────────────────────────────────────────────

export function sectionMotion(delay = 0) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.26, delay, ease: SOFT_EASE },
  };
}

export function cardMotion(delay = 0) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.24, delay, ease: SOFT_EASE },
  };
}

// ─── Hold-last-confirmed hook ────────────────────────────────────────────────

/**
 * Reporting hooks now preserve the last resolved payload while a refetch is
 * in flight, so consumers can keep calling this helper without having to know
 * whether the hold-last behavior lives in the hook or the page layer.
 */
export function useHoldLast<T>(value: T, _loading: boolean): T {
  void _loading;
  return value;
}

// ─── Parsing / normalization helpers ────────────────────────────────────────

export function getValue(row: object, keys: string[]) {
  const record = row as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return null;
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;

    const sanitized = trimmed.replace(/[^\d,.-]/g, "");
    if (!sanitized) return 0;

    const normalized =
      sanitized.includes(",") &&
      sanitized.includes(".") &&
      sanitized.lastIndexOf(",") > sanitized.lastIndexOf(".")
        ? sanitized.replace(/\./g, "").replace(",", ".")
        : sanitized.includes(",") && !sanitized.includes(".")
          ? sanitized.replace(",", ".")
          : sanitized.replace(/,/g, "");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function stripText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function monthIndexFromValue(value: unknown): number | null {
  if (typeof value === "number" && value >= 1 && value <= 12) return value - 1;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{1,2}$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return numeric >= 1 && numeric <= 12 ? numeric - 1 : null;
    }

    const normalized = stripText(trimmed);
    const monthMap: Record<string, number> = {
      jan: 0,
      janar: 0,
      shk: 1,
      shkurt: 1,
      mar: 2,
      mars: 2,
      pri: 3,
      prill: 3,
      apr: 3,
      april: 3,
      maj: 4,
      qer: 5,
      qershor: 5,
      kor: 6,
      korrik: 6,
      gus: 7,
      gusht: 7,
      sht: 8,
      shtator: 8,
      tet: 9,
      tetor: 9,
      nen: 10,
      nentor: 10,
      dhj: 11,
      dhjetor: 11,
      january: 0,
      february: 1,
      march: 2,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };

    return monthMap[normalized] ?? null;
  }

  return null;
}

export function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [year, month] = trimmed.split("-").map(Number);
      return new Date(year, month - 1, 1);
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function normalizeStatus(
  status: string,
): "sold" | "reserved" | "available" | "other" {
  const normalized = stripText(status);
  if (normalized.includes("shitur")) return "sold";
  if (normalized.includes("rezervuar")) return "reserved";
  if (normalized.includes("dispozicion")) return "available";
  return "other";
}

export function normalizeTypology(
  type: string,
  level: string,
  unitId: string,
): UnitTypology {
  const normalizedType = stripText(type);
  const normalizedLevel = stripText(level);
  const normalizedUnitId = stripText(unitId);

  if (normalizedLevel.includes("penthouse") || normalizedUnitId.startsWith("ph-"))
    return "Penthouse";
  if (normalizedType.includes("penthouse")) return "Penthouse";
  if (normalizedType.includes("lokal")) return "Lokal";
  if (normalizedType.includes("garazh") || normalizedType.includes("parking"))
    return "Garazhë";
  return "Banesë";
}

// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatCount(value: number): string {
  return value.toLocaleString("de-DE");
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })}%`;
}

export function progressWidth(value: number): string {
  const safeValue = Math.max(0, Math.min(100, value));
  return `${safeValue}%`;
}

export function formatMonthYear(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}
