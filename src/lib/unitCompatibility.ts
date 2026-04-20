type CompatibleUnitRecord = Record<string, unknown>;

function readValue(record: CompatibleUnitRecord, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return null;
}

function toTrimmedText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const sanitized = trimmed.replace(/[^\d,.-]/g, "");
    if (!sanitized) return null;

    const normalized =
      sanitized.includes(",") && sanitized.includes(".") && sanitized.lastIndexOf(",") > sanitized.lastIndexOf(".")
        ? sanitized.replace(/\./g, "").replace(",", ".")
        : sanitized.includes(",") && !sanitized.includes(".")
          ? sanitized.replace(",", ".")
          : sanitized.replace(/,/g, "");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export interface NormalizedCompatibleUnitFields {
  unitId: string;
  type: string;
  level: string;
  area: number | null;
  listingPrice: number | null;
  saleDate: string | null;
}

export function normalizeCompatibleUnitFields(
  rawRecord: CompatibleUnitRecord,
): NormalizedCompatibleUnitFields {
  const unitId =
    toTrimmedText(readValue(rawRecord, ["unit_id", "unitId", "id"])) ?? "—";

  const type =
    toTrimmedText(readValue(rawRecord, ["type", "typology", "tipologjia", "category"])) ?? "-";

  const level =
    toTrimmedText(readValue(rawRecord, ["level", "floor", "niveli", "floor_label"])) ?? "-";

  return {
    unitId,
    type,
    level,
    area: toFiniteNumber(readValue(rawRecord, ["size", "area", "gross_area"])),
    listingPrice: toFiniteNumber(readValue(rawRecord, ["price", "cmimi", "value"])),
    saleDate: toTrimmedText(readValue(rawRecord, ["sale_date", "sold_at", "date_sold"])),
  };
}
