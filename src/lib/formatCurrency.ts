/**
 * Canonical euro formatting for the Roinvest portal.
 *
 * Format rules (one house style, applied everywhere):
 *  - Symbol comes FIRST: "€60.000" (not "60.000 €")
 *  - Thousands separator: "." (de-DE locale)
 *  - No fractional part by default (rounded to integer)
 *  - Non-finite input yields "€0"
 */

/** "€60.000" — unsigned, rounded, absolute value. */
export function formatEuro(value: number): string {
  if (!Number.isFinite(value)) return "€0";
  const abs = Math.abs(Math.round(value));
  return `€${abs.toLocaleString("de-DE")}`;
}

/** "+€60.000" / "−€60.000" / "€0" — signed variant for deltas. */
export function formatEuroSigned(value: number): string {
  if (!Number.isFinite(value) || Math.round(value) === 0) return "€0";
  const sign = value > 0 ? "+" : "\u2212";
  return `${sign}${formatEuro(value)}`;
}
