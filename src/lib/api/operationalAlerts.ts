import { supabase } from "../supabase";
import type { Tables } from "../database.types";
import type { ApiResult } from "./_types";
import { apiOk } from "./_types";
import * as history from "./history";
import * as sales from "./sales";

const DAY_MS = 86_400_000;
const RECENT_HISTORY_WINDOW_DAYS = 7;

export type OperationalAlertType =
  | "sale_completed"
  | "reservation_created"
  | "reservation_due_week"
  | "reservation_due_day"
  | "reservation_due_today"
  | "reservation_overdue"
  | "payment_due_week"
  | "payment_due_day"
  | "payment_due_today"
  | "payment_overdue";

export interface OperationalAlert {
  id: string;
  type: OperationalAlertType;
  unitDisplay: string;
  detail: string;
  occurredAt: string;
  dueDate: string | null;
  priority: number;
}

export interface OperationalAlertsSnapshot {
  alerts: OperationalAlert[];
  sourceErrors: string[];
}

type UnitSnapshot = {
  status?: string;
};

type ActiveReservationDeadlineRow = Pick<
  Tables<"unit_reservations">,
  "id" | "expires_at" | "updated_at"
> & {
  units: { unit_id: string } | null;
};

function startOfLocalDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function daysUntil(dateIso: string, now = new Date()): number {
  const [year, month, day] = dateOnly(dateIso).split("-").map(Number);
  if (!year || !month || !day) return Number.POSITIVE_INFINITY;
  return Math.round(
    (new Date(year, month - 1, day).getTime() - startOfLocalDay(now)) / DAY_MS,
  );
}

function isWithinRecentHistoryWindow(value: string | null | undefined, now = new Date()) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return now.getTime() - timestamp <= RECENT_HISTORY_WINDOW_DAYS * DAY_MS;
}

function snapshotStatus(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return (value as UnitSnapshot).status ?? null;
}

function historyAlertType(row: {
  change_reason: string | null;
  new_data: unknown;
}): "sale_completed" | "reservation_created" | null {
  const newStatus = snapshotStatus(row.new_data);
  const reason = row.change_reason ?? "";

  if (reason === "sale_completed" || newStatus === "E shitur") {
    return "sale_completed";
  }

  if (reason === "E rezervuar" || newStatus === "E rezervuar") {
    return "reservation_created";
  }

  return null;
}

function deadlineAlertType(
  domain: "reservation" | "payment",
  days: number,
): OperationalAlertType | null {
  if (days < 0) return domain === "reservation" ? "reservation_overdue" : "payment_overdue";
  if (days === 0) return domain === "reservation" ? "reservation_due_today" : "payment_due_today";
  if (days === 1) return domain === "reservation" ? "reservation_due_day" : "payment_due_day";
  if (days <= 7) return domain === "reservation" ? "reservation_due_week" : "payment_due_week";
  return null;
}

function priorityFor(type: OperationalAlertType): number {
  if (type.endsWith("_overdue") || type.endsWith("_today")) return 0;
  if (type.endsWith("_day")) return 1;
  if (type.endsWith("_week")) return 2;
  return 3;
}

function reservationDetail(days: number): string {
  if (days < 0) return `Rezervimi është i vonuar prej ${Math.abs(days)} ditësh.`;
  if (days === 0) return "Rezervimi skadon sot.";
  if (days === 1) return "Rezervimi skadon nesër.";
  return `Rezervimi skadon pas ${days} ditësh.`;
}

function paymentDetail(installmentNumber: number, days: number): string {
  if (days < 0) {
    return `Kësti #${installmentNumber} është i vonuar prej ${Math.abs(days)} ditësh.`;
  }
  if (days === 0) return `Kësti #${installmentNumber} skadon sot.`;
  if (days === 1) return `Kësti #${installmentNumber} skadon nesër.`;
  return `Kësti #${installmentNumber} skadon pas ${days} ditësh.`;
}

async function listActiveReservationDeadlineAlerts(
  sourceErrors: string[],
): Promise<OperationalAlert[]> {
  const { data, error } = await supabase
    .from("unit_reservations")
    .select("id, expires_at, updated_at, units(unit_id)")
    .eq("status", "Aktive")
    .not("expires_at", "is", null);

  if (error) {
    sourceErrors.push(error.message);
    return [];
  }

  return ((data ?? []) as unknown as ActiveReservationDeadlineRow[])
    .map((row): OperationalAlert | null => {
      if (!row.expires_at) return null;

      const days = daysUntil(row.expires_at);
      const type = deadlineAlertType("reservation", days);
      if (!type) return null;

      return {
        id: `${type}-${row.id}`,
        type,
        unitDisplay: row.units?.unit_id ?? row.id.slice(0, 8),
        detail: reservationDetail(days),
        occurredAt: row.updated_at ?? row.expires_at,
        dueDate: row.expires_at,
        priority: priorityFor(type),
      } satisfies OperationalAlert;
    })
    .filter((alert): alert is OperationalAlert => Boolean(alert));
}

async function listPaymentDeadlineAlerts(
  sourceErrors: string[],
): Promise<OperationalAlert[]> {
  const result = await sales.listUpcomingSalePayments("all");

  if (result.error !== null) {
    sourceErrors.push(result.error);
    return [];
  }

  return result.data
    .map(({ payment, unit }): OperationalAlert | null => {
      const days = daysUntil(payment.due_date);
      const type = deadlineAlertType("payment", days);
      if (!type) return null;

      return {
        id: `${type}-${payment.id}`,
        type,
        unitDisplay: unit.unit_id,
        detail: paymentDetail(payment.installment_number, days),
        occurredAt: payment.created_at ?? payment.due_date,
        dueDate: payment.due_date,
        priority: priorityFor(type),
      } satisfies OperationalAlert;
    })
    .filter((alert): alert is OperationalAlert => Boolean(alert));
}

async function listRecentSalesAndReservationAlerts(
  sourceErrors: string[],
): Promise<OperationalAlert[]> {
  const result = await history.listRecentNotificationHistory({ limit: 40 });

  if (result.error !== null) {
    sourceErrors.push(result.error);
    return [];
  }

  return result.data
    .map((row): OperationalAlert | null => {
      if (!isWithinRecentHistoryWindow(row.changed_at)) return null;

      const type = historyAlertType(row);
      if (!type) return null;

      return {
        id: `history-${row.id}`,
        type,
        unitDisplay: row.units?.unit_id ?? row.id.slice(0, 8),
        detail:
          type === "sale_completed"
            ? "Njësia u shënua si e shitur."
            : "Njësia u shënua si e rezervuar.",
        occurredAt: row.changed_at ?? new Date().toISOString(),
        dueDate: null,
        priority: priorityFor(type),
      } satisfies OperationalAlert;
    })
    .filter((alert): alert is OperationalAlert => Boolean(alert));
}

export async function listOperationalAlerts({
  limit = 24,
}: {
  limit?: number;
} = {}): Promise<ApiResult<OperationalAlertsSnapshot>> {
  const sourceErrors: string[] = [];
  const [historyAlerts, reservationAlerts, paymentAlerts] = await Promise.all([
    listRecentSalesAndReservationAlerts(sourceErrors),
    listActiveReservationDeadlineAlerts(sourceErrors),
    listPaymentDeadlineAlerts(sourceErrors),
  ]);

  const alerts = [...historyAlerts, ...reservationAlerts, ...paymentAlerts]
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;

      const leftTime = new Date(left.dueDate ?? left.occurredAt).getTime();
      const rightTime = new Date(right.dueDate ?? right.occurredAt).getTime();
      return left.priority <= 2 ? leftTime - rightTime : rightTime - leftTime;
    })
    .slice(0, limit);

  return apiOk({
    alerts,
    sourceErrors,
  });
}
