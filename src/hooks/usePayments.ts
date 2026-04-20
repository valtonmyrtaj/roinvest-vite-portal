import { useCallback, useEffect, useRef, useState } from "react";
import { payments as paymentsApi } from "../lib/api";
import type {
  CreatePaymentPayload,
  PaymentDbStatus,
  PaymentRow,
  UpdatePaymentPatch,
} from "../lib/api/payments";

// Re-export the canonical DB literal from the api module so any
// consumer that reaches for this hook's public type surface keeps
// working without a change. The single source of truth for the
// persisted values is `src/lib/api/payments.ts`.
export type { PaymentDbStatus } from "../lib/api/payments";

// `E vonuar` is a frontend-derived status layered on top of the
// persisted DB values. It is NOT a DB value and is never written back.
export type PaymentStatus = PaymentDbStatus | "E vonuar";

export interface Payment {
  id: string;
  unit_id: string;
  sale_id: string | null;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  notes: string | null;
  created_at: string;
}

type CreatePaymentInput = {
  unit_id: string;
  sale_id?: string | null;
  installment_number: number;
  amount: number;
  due_date: string;
  notes?: string | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toUiStatus(status: PaymentDbStatus, dueDate: string): PaymentStatus {
  const normalizedDueDate = dueDate.slice(0, 10);
  return status === "E papaguar" && normalizedDueDate < todayIso()
    ? "E vonuar"
    : status;
}

function toDbStatus(status: PaymentStatus | undefined): PaymentDbStatus | undefined {
  if (!status) return undefined;
  return status === "E paguar" ? "E paguar" : "E papaguar";
}

function normalizePayment(row: PaymentRow): Payment {
  const dueDate = row.due_date.slice(0, 10);
  const paidDate = row.paid_date ? row.paid_date.slice(0, 10) : null;

  return {
    id: row.id,
    unit_id: row.unit_id,
    sale_id: row.sale_id,
    installment_number: row.installment_number,
    amount: row.amount,
    due_date: dueDate,
    paid_date: paidDate,
    status: toUiStatus(row.status, dueDate),
    notes: row.notes,
    created_at: row.created_at ?? "",
  };
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);
  const latestPaymentsRequestIdRef = useRef(0);
  const latestAllPaymentsRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPayments = useCallback(async (unitId: string) => {
    const requestId = ++latestPaymentsRequestIdRef.current;
    setLoading(true);

    const result = await paymentsApi.listPayments(unitId);
    const isStaleRequest =
      !isMountedRef.current || requestId !== latestPaymentsRequestIdRef.current;

    if (result.error !== null) {
      if (isStaleRequest) {
        return { error: result.error };
      }
      setPayments([]);
      setLoading(false);
      return { error: result.error };
    }

    const nextPayments = result.data.map(normalizePayment);
    if (isStaleRequest) {
      return { data: nextPayments, error: null };
    }
    setPayments(nextPayments);
    setLoading(false);
    return { data: nextPayments, error: null };
  }, []);

  const fetchAllPayments = useCallback(async () => {
    const requestId = ++latestAllPaymentsRequestIdRef.current;
    setLoading(true);

    const result = await paymentsApi.listAllPayments();
    const isStaleRequest =
      !isMountedRef.current || requestId !== latestAllPaymentsRequestIdRef.current;

    if (result.error !== null) {
      if (isStaleRequest) {
        return { error: result.error };
      }
      setAllPayments([]);
      setLoading(false);
      return { error: result.error };
    }

    const nextPayments = result.data.map(normalizePayment);
    if (isStaleRequest) {
      return { data: nextPayments, error: null };
    }
    setAllPayments(nextPayments);
    setLoading(false);
    return { data: nextPayments, error: null };
  }, []);

  const createPayment = useCallback(async (input: CreatePaymentInput) => {
    let saleId = input.sale_id ?? null;

    if (!saleId) {
      const saleResolution = await paymentsApi.findActiveSaleIdForUnit(
        input.unit_id,
      );
      if (saleResolution.error !== null) {
        return { error: saleResolution.error };
      }
      saleId = saleResolution.data;
    }

    const payload: CreatePaymentPayload = {
      unit_id: input.unit_id,
      sale_id: saleId,
      installment_number: input.installment_number,
      amount: input.amount,
      due_date: input.due_date,
      notes: input.notes ?? null,
      status: "E papaguar",
    };

    const result = await paymentsApi.createPayment(payload);

    if (result.error !== null) {
      return { error: result.error };
    }

    const nextPayment = normalizePayment(result.data);

    setPayments((prev) =>
      [...prev, nextPayment].sort(
        (a, b) => a.installment_number - b.installment_number,
      ),
    );
    setAllPayments((prev) =>
      [...prev, nextPayment].sort((a, b) =>
        a.due_date.localeCompare(b.due_date),
      ),
    );

    return { data: nextPayment, error: null };
  }, []);

  const updatePayment = useCallback(
    async (id: string, data: Partial<Payment>) => {
      const patch: UpdatePaymentPatch = {};

      if (data.unit_id !== undefined) patch.unit_id = data.unit_id;
      if (data.sale_id !== undefined) patch.sale_id = data.sale_id;
      if (data.installment_number !== undefined) {
        patch.installment_number = data.installment_number;
      }
      if (data.amount !== undefined) patch.amount = data.amount;
      if (data.due_date !== undefined) patch.due_date = data.due_date;
      if (data.paid_date !== undefined) patch.paid_date = data.paid_date;
      if (data.notes !== undefined) patch.notes = data.notes;
      if (data.status !== undefined) {
        const nextStatus = toDbStatus(data.status);
        if (nextStatus) patch.status = nextStatus;
      }

      const result = await paymentsApi.updatePayment(id, patch);

      if (result.error !== null) {
        return { error: result.error };
      }

      const nextPayment = normalizePayment(result.data);

      setPayments((prev) =>
        prev
          .map((payment) => (payment.id === id ? nextPayment : payment))
          .sort((a, b) => a.installment_number - b.installment_number),
      );
      setAllPayments((prev) =>
        prev
          .map((payment) => (payment.id === id ? nextPayment : payment))
          .sort((a, b) => a.due_date.localeCompare(b.due_date)),
      );

      return { data: nextPayment, error: null };
    },
    [],
  );

  const deletePayment = useCallback(async (id: string) => {
    const result = await paymentsApi.deletePayment(id);

    if (result.error !== null) {
      return { error: result.error };
    }

    setPayments((prev) => prev.filter((payment) => payment.id !== id));
    setAllPayments((prev) => prev.filter((payment) => payment.id !== id));

    return { error: null };
  }, []);

  return {
    payments,
    allPayments,
    fetchPayments,
    fetchAllPayments,
    createPayment,
    updatePayment,
    deletePayment,
    loading,
  };
}
