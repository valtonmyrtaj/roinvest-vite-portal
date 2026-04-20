type NumericLike = number | string | null | undefined;

function toFiniteNumber(value: NumericLike): number | null {
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

export interface UnitFinancialFields {
  price?: NumericLike;
  final_price?: NumericLike;
}

export function getUnitListingPrice(unit: UnitFinancialFields): number {
  return toFiniteNumber(unit.price) ?? 0;
}

export function getUnitFinalSalePrice(unit: UnitFinancialFields): number | null {
  return toFiniteNumber(unit.final_price);
}

export function getUnitContractValue(unit: UnitFinancialFields): number {
  return getUnitFinalSalePrice(unit) ?? getUnitListingPrice(unit);
}
