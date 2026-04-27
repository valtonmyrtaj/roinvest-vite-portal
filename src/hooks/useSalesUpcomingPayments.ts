import { useCallback, useEffect, useRef, useState } from "react";
import { sales as salesApi } from "../lib/api";
import type { SalesOwnerScope } from "../lib/api/sales";
import type { Payment, PaymentDbStatus, PaymentStatus } from "./usePayments";
import type { Unit } from "./useUnits";
import { mapSalesUnitRowToUnit } from "./useSalesUnits";

export interface SalesUpcomingPaymentRow {
  payment: Payment;
  unit: Unit;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toUiStatus(
  status: PaymentDbStatus,
  dueDate: string,
  paidAmount: number,
  remainingAmount: number,
): PaymentStatus {
  const normalizedDueDate = dueDate.slice(0, 10);

  if (status === "E paguar" || remainingAmount <= 0) {
    return "E paguar";
  }

  if (paidAmount > 0) {
    return "Pjesërisht paguar";
  }

  return status === "E papaguar" && normalizedDueDate < todayIso()
    ? "E vonuar"
    : status;
}

function normalizePaymentRow(row: {
  id: string;
  unit_id: string;
  sale_id: string | null;
  installment_number: number;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentDbStatus;
  notes: string | null;
  created_at: string | null;
}): Payment {
  const dueDate = row.due_date.slice(0, 10);
  const paidDate = row.paid_date ? row.paid_date.slice(0, 10) : null;
  const paidAmount = Math.min(row.paid_amount, row.amount);
  const remainingAmount = Math.max(row.remaining_amount, 0);

  return {
    id: row.id,
    unit_id: row.unit_id,
    sale_id: row.sale_id,
    installment_number: row.installment_number,
    amount: row.amount,
    due_date: dueDate,
    paid_date: paidDate,
    status: toUiStatus(row.status, dueDate, paidAmount, remainingAmount),
    notes: row.notes,
    created_at: row.created_at ?? "",
    receipts: [],
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    last_receipt_date: paidDate,
  };
}

export function useSalesUpcomingPayments(ownerScope: SalesOwnerScope) {
  const [rows, setRows] = useState<SalesUpcomingPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchUpcomingPayments = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    const result = await salesApi.listUpcomingSalePayments(ownerScope);

    if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
      return;
    }

    if (result.error) {
      setRows([]);
      setError(result.error);
      setLoading(false);
      return;
    }

    setRows(
      (result.data ?? []).map((row) => ({
        payment: normalizePaymentRow(row.payment),
        unit: mapSalesUnitRowToUnit(row.unit),
      })),
    );
    setLoading(false);
  }, [ownerScope]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        void fetchUpcomingPayments();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchUpcomingPayments]);

  return {
    rows,
    loading,
    error,
    refresh: fetchUpcomingPayments,
  };
}
