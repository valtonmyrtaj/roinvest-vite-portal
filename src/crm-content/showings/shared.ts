import type { ShowingStatus } from "../../hooks/useCRM";

export const SHOWING_STATUSES: ShowingStatus[] = [
  "E planifikuar",
  "E kryer",
  "E anuluar",
];

export const SHOWING_STYLE: Record<ShowingStatus, { color: string; bg: string }> = {
  "E planifikuar": { color: "#003883", bg: "#EAF0FA" },
  "E kryer": { color: "#3c7a57", bg: "#edf7f1" },
  "E anuluar": { color: "#b14b4b", bg: "#fbeeee" },
};

export type ShowingOutcomeValue = "Pa rezultat" | "Rezervoi" | "Bleu";
export type ShowingPaymentType = "Pagesë e plotë" | "Me këste";

export type ShowingSaleDraft = {
  showingId: string;
  unitId: string;
  leadId: string | null;
  leadName: string;
  saleDate: string;
  notes: string | null;
};

export type ShowingSaveResult = {
  nextStep: "none" | "sale";
  draft?: ShowingSaleDraft;
};

export type ShowingSaleCompletionInput = {
  showing_id: string;
  unit_id: string;
  lead_id?: string | null;
  buyer_name: string;
  sale_date: string;
  final_price: number;
  payment_type: ShowingPaymentType;
  notes?: string | null;
  installments?: Array<{
    installment_number?: number;
    due_date: string;
    amount: number;
    notes?: string | null;
  }>;
};

export type ShowingSaleToast = {
  unitId: string;
  buyerName: string;
  finalPrice: number;
  paymentType: ShowingPaymentType;
};
