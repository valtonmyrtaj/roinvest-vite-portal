export function toReservationExpiryTimestamp(value: string): string {
  // Preserve the live cutoff convention already used by reservation rows.
  return `${value}T18:00:00+00:00`;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
