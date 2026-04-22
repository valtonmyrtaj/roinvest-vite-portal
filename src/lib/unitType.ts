export const CANONICAL_UNIT_TYPES = [
  "Banesë",
  "Lokal",
  "Garazhë",
  "Penthouse",
] as const;

export const LEGACY_APARTMENT_LAYOUT_TYPES = ["1+1", "2+1", "3+1"] as const;

export type CanonicalUnitType = (typeof CANONICAL_UNIT_TYPES)[number];
export type LegacyApartmentLayoutType = (typeof LEGACY_APARTMENT_LAYOUT_TYPES)[number];
export type UnitTypeValue = CanonicalUnitType | LegacyApartmentLayoutType;

const LEGACY_APARTMENT_LAYOUT_SET = new Set<string>(LEGACY_APARTMENT_LAYOUT_TYPES);

export function getCanonicalUnitType(
  type: string | null | undefined,
  level?: string | null,
): CanonicalUnitType | null {
  const normalizedType = typeof type === "string" ? type.trim() : "";
  const normalizedLevel = typeof level === "string" ? level.trim() : "";

  if (normalizedLevel === "Penthouse" || normalizedType === "Penthouse") {
    return "Penthouse";
  }

  if (normalizedType === "Lokal") {
    return "Lokal";
  }

  if (normalizedType === "Garazhë") {
    return "Garazhë";
  }

  if (normalizedType === "Banesë" || LEGACY_APARTMENT_LAYOUT_SET.has(normalizedType)) {
    return "Banesë";
  }

  return null;
}

export function getUnitTypeDisplay(
  type: string | null | undefined,
  level?: string | null,
): string {
  const canonicalType = getCanonicalUnitType(type, level);
  if (canonicalType) {
    return canonicalType;
  }

  if (typeof type === "string" && type.trim()) {
    return type.trim();
  }

  return "—";
}

export function isApartmentStyleUnit(
  type: string | null | undefined,
  level?: string | null,
): boolean {
  const canonicalType = getCanonicalUnitType(type, level);
  return canonicalType === "Banesë" || canonicalType === "Penthouse";
}
