import { type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BadgeCheck, Building2, Car, CheckCircle2, Clock3, CreditCard, Star, Store } from "lucide-react";
import type { PaymentStatus } from "../hooks/usePayments";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { GOLD, GRAY, GREEN, NAVY, RED, SOFT_EASE } from "../ui/tokens";
export { GOLD, GRAY, GREEN, NAVY, RED, SOFT_EASE };

export const TYPOLOGY_DEFS = [
  { label: "Banesë", Icon: Building2 },
  { label: "Penthouse", Icon: Star },
  { label: "Lokal", Icon: Store },
  { label: "Garazhë", Icon: Car },
] as const;

export const SQ_MONTHS = [
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

export const ALL_MONTHS_LABEL = "Gjithë muajt";
export const YEAR_OPTIONS = ["2026", "2027", "2028", "2029", "2030"] as const;

export type TypologyLabel = (typeof TYPOLOGY_DEFS)[number]["label"];

export type ChartPoint = {
  month: string;
  monthIndex: number;
  revenue: number;
};

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const value = iso.slice(0, 10);
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "—";
  return `${String(day).padStart(2, "0")} ${SQ_MONTHS[month - 1]} ${year}`;
}

export function fmtDateCompact(iso: string | null | undefined) {
  if (!iso) return "—";
  const value = iso.slice(0, 10);
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "—";
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
}

export function fmtRevenueAxisTick(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return Number.isInteger(millions) ? `€${millions}M` : `€${millions.toFixed(1)}M`;
  }

  return `€${Math.round(value / 1000)}k`;
}

export function getNiceAxisStep(maxValue: number) {
  const roughStep = maxValue / 5;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const normalized = roughStep / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

export function statusTone(status: PaymentStatus) {
  if (status === "E paguar") return { bg: "#edf7f1", color: GREEN, border: GREEN };
  if (status === "E vonuar") return { bg: "#fbeeee", color: RED, border: RED };
  return { bg: "#fff8e8", color: GOLD, border: GOLD };
}

export function triggerOnActionKey(event: ReactKeyboardEvent<HTMLElement>, action: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

export function formatPaymentType(paymentType: string | null | undefined) {
  return paymentType ? paymentType : null;
}

export const SALES_KPI_DEFS = [
  { label: "Vlera e kontraktuar", color: NAVY, icon: CreditCard, formatValue: fmtEur },
  { label: "Të arkëtuara", color: GREEN, icon: CheckCircle2, formatValue: fmtEur },
  { label: "Në pritje", color: GOLD, icon: Clock3, formatValue: fmtEur },
  { label: "Të shitura", color: RED, icon: BadgeCheck },
] as const;
