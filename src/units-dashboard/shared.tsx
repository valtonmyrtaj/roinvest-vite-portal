import type { Unit, UnitStatus, Block, Level, OwnerCategory } from "../hooks/useUnits";
import { CANONICAL_UNIT_TYPES, getCanonicalUnitType, isApartmentStyleUnit } from "../lib/unitType";

export const TYPES = CANONICAL_UNIT_TYPES;

export const BLOCKS = ["Blloku A", "Blloku B", "Blloku C"] as const;

export const LEVELS = [
  "Garazhë",
  "Përdhesa",
  "Kati 1",
  "Kati 2",
  "Kati 3",
  "Kati 4",
  "Kati 5",
  "Kati 6",
  "Penthouse",
] as const;

export const OWNER_CATEGORIES = [
  "Investitor",
  "Pronarët e tokës",
  "Kompani ndërtimore",
] as const;

export const STATUS_ORDER: Record<UnitStatus, number> = {
  "Në dispozicion": 0,
  "E rezervuar": 1,
  "E shitur": 2,
};

export const SQ_MONTHS_LONG = [
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

export function normalize(v: unknown) {
  return typeof v === "string" ? v.trim().normalize("NFC").toLowerCase() : "";
}

export function fmtPrice(n: number) {
  return `€${n.toLocaleString("de-DE")}`;
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "—";
  return `${String(day).padStart(2, "0")} ${SQ_MONTHS_LONG[month - 1]} ${year}`;
}

export function statusOrderValue(status: unknown) {
  return STATUS_ORDER[status as UnitStatus] ?? 99;
}

export function statusStyleFor(status: UnitStatus) {
  if (status === "Në dispozicion") {
    return {
      background: "#eef7f1",
      color: "#6f9a7f",
      border: "1px solid transparent",
      fontWeight: 400,
    };
  }

  if (status === "E rezervuar") {
    return {
      background: "#fff8ea",
      color: "#c29634",
      border: "1px solid transparent",
      fontWeight: 400,
    };
  }

  return {
    background: "#fcf0f0",
    color: "#cb7676",
    border: "1px solid transparent",
    fontWeight: 400,
  };
}

export function getDhomaDisplay(unit: Unit) {
  if (isApartmentStyleUnit(unit.type, unit.level)) {
    if (!unit.bedrooms || unit.bedrooms === 0) return "—";
    return `${unit.bedrooms} dhoma · ${unit.bathrooms} banjo`;
  }
  if (getCanonicalUnitType(unit.type, unit.level) === "Lokal") {
    if (!unit.toilets || unit.toilets === 0) return "—";
    return `${unit.toilets} tualet`;
  }
  return "—";
}

export type UnitsFilterState = {
  block: Block | "";
  type: string;
  level: Level | "";
  status: UnitStatus | "";
  category: string;
  entity: string;
  search: string;
};

export type StockFilterState = {
  category: OwnerCategory;
  entity: string;
};
