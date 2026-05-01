export function formatContactPhone(value: string | null | undefined): string {
  const compact = (value ?? "").trim().replace(/\s+/g, " ");
  if (!compact) return "";

  const digits = compact.replace(/\D/g, "");

  if (digits.length === 9 && digits.startsWith("0")) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("383")) {
    return `+383 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }

  return compact;
}
