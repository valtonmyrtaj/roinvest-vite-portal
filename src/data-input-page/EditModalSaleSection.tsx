import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import type { SalePaymentType } from "../lib/api/sales";
import {
  formatEuro as formatEuroCompact,
  formatEuroSigned,
} from "../lib/formatCurrency";
import {
  SALE_PAYMENT_OPTIONS,
  type SaleInstallmentDraft,
} from "./shared";
import { DateField, SelectField, TextField } from "./fields";

/**
 * "Përfundo shitjen" — the sale-completion block that appears below the
 * generic unit form when the status is flipped to "E shitur". A
 * controlled component: all state lives in `EditModal` (which also
 * re-validates it before dispatch), this component only renders the
 * inputs, the live price-diff animation, the payment-type clarity
 * chip/card, and the installments editor.
 *
 * The parent's `handleSave` independently re-parses `finalPrice` and
 * re-totals `installments` for validation — that duplication mirrors
 * the pre-decomposition code intentionally: the section derives for
 * display, the parent derives for dispatch.
 */
export function EditModalSaleSection({
  listingPrice,
  buyerName,
  onBuyerNameChange,
  saleDate,
  onSaleDateChange,
  finalPrice,
  onFinalPriceChange,
  paymentType,
  onPaymentTypeChange,
  installments,
  onAddInstallment,
  onUpdateInstallment,
  onRemoveInstallment,
}: {
  listingPrice: number;
  buyerName: string;
  onBuyerNameChange: (value: string) => void;
  saleDate: string;
  onSaleDateChange: (value: string) => void;
  finalPrice: string;
  onFinalPriceChange: (value: string) => void;
  paymentType: SalePaymentType;
  onPaymentTypeChange: (value: SalePaymentType) => void;
  installments: SaleInstallmentDraft[];
  onAddInstallment: () => void;
  onUpdateInstallment: (
    index: number,
    field: keyof SaleInstallmentDraft,
    value: string,
  ) => void;
  onRemoveInstallment: (index: number) => void;
}) {
  // Parsed final price for live UI (diff display + payment clarity). Separate
  // from validation — stays NaN when the field is empty so blocks stay hidden.
  const parsedFinalPriceLive = Number(finalPrice);
  const hasValidFinalPrice =
    Number.isFinite(parsedFinalPriceLive) && parsedFinalPriceLive > 0;

  const priceDifference = useMemo(() => {
    if (!hasValidFinalPrice) return 0;
    return parsedFinalPriceLive - listingPrice;
  }, [hasValidFinalPrice, parsedFinalPriceLive, listingPrice]);

  const installmentsTotal = useMemo(() => {
    return installments.reduce((sum, installment) => {
      const parsed = Number(installment.amount);
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
  }, [installments]);

  const installmentsMatchFinal =
    hasValidFinalPrice &&
    Math.abs(installmentsTotal - parsedFinalPriceLive) <= 0.01;

  return (
    <div className="mt-4 rounded-[16px] border border-black/08 bg-[#fafafc] p-4">
      <div className="mb-3">
        <p className="text-[13px] font-semibold text-black/82">Përfundo shitjen</p>
        <p className="mt-0.5 text-[11px] text-black/42">
          Ky veprim e kalon njësinë në shitje të konfirmuar dhe hap kompletimin financiar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Blerësi"
          value={buyerName}
          onChange={onBuyerNameChange}
        />
        <DateField
          label="Data e shitjes"
          value={saleDate}
          onChange={(value) => onSaleDateChange(value ?? "")}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
            Çmimi final
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={finalPrice}
            onChange={(event) => onFinalPriceChange(event.target.value)}
            placeholder="p.sh. 120000"
            className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
          />
        </label>
        <div />
      </div>

      <AnimatePresence initial={false}>
        {hasValidFinalPrice && (
          <motion.div
            key="price-diff"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-3"
            style={{
              background: "rgba(0,56,131,0.03)",
              border: "1px solid rgba(0,56,131,0.08)",
              borderRadius: 8,
              padding: "12px 16px",
            }}
          >
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-black/48">Çmimi fillestar</span>
              <span className="text-black/72 tabular-nums">
                {formatEuroCompact(listingPrice)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12px]">
              <span className="text-black/48">Çmimi final</span>
              <span
                className="text-black/90 tabular-nums"
                style={{ fontWeight: 500 }}
              >
                {formatEuroCompact(parsedFinalPriceLive)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12px]">
              <span className="text-black/48">Diferenca</span>
              <span
                className="tabular-nums"
                style={{
                  fontWeight: 600,
                  color:
                    priceDifference > 0
                      ? "#3c7a57"
                      : priceDifference < 0
                      ? "#b14b4b"
                      : "inherit",
                }}
              >
                {formatEuroSigned(priceDifference)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <SelectField
          label="Lloji i pagesës"
          value={paymentType}
          onChange={(value) => onPaymentTypeChange(value as SalePaymentType)}
          options={SALE_PAYMENT_OPTIONS}
          placeholder="Zgjidh pagesën"
        />
        <div />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {paymentType === "Pagesë e plotë" && hasValidFinalPrice && (
          <motion.div
            key="clarity-full"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-3"
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px]"
              style={{
                background: "rgba(60,122,87,0.08)",
                color: "#3c7a57",
                borderColor: "rgba(60,122,87,0.2)",
              }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M2.5 6.2L4.8 8.5L9.5 3.5"
                  stroke="#3c7a57"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                </svg>
              Pagesë e plotë — {formatEuroCompact(parsedFinalPriceLive)} do të regjistrohet si arkëtim i plotë
            </span>
          </motion.div>
        )}

        {paymentType === "Me këste" && installments.length > 0 && (
          <motion.div
            key="clarity-installments"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-3 rounded-[10px] border border-black/08 bg-white px-4 py-3"
          >
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-black/48">Këste të planifikuara</span>
              <span
                className="text-black/82 tabular-nums"
                style={{ fontWeight: 500 }}
              >
                {installments.length}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12px]">
              <span className="text-black/48">Totali i kësteve</span>
              <span
                className="text-black/82 tabular-nums"
                style={{ fontWeight: 500 }}
              >
                {formatEuroCompact(installmentsTotal)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12px]">
              <span className="text-black/48">Statusi</span>
              <span className="flex items-center gap-1.5 text-black/82">
                <span
                  className="inline-block h-[8px] w-[8px] rounded-full border"
                  style={{ borderColor: "rgba(0,0,0,0.28)" }}
                />
                E papaguar
              </span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {hasValidFinalPrice && !installmentsMatchFinal && (
                <motion.p
                  key="warn"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.16 }}
                  className="mt-2.5 flex items-center gap-1.5 text-[11px]"
                  style={{ color: "#b14b4b" }}
                >
                  <AlertCircle size={12} />
                  Totali i kësteve ({formatEuroCompact(installmentsTotal)}) nuk përputhet me çmimin final ({formatEuroCompact(parsedFinalPriceLive)})
                </motion.p>
              )}
              {hasValidFinalPrice && installmentsMatchFinal && (
                <motion.p
                  key="ok"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.16 }}
                  className="mt-2.5 flex items-center gap-1.5 text-[11px]"
                  style={{ color: "#3c7a57" }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M2.5 6.2L4.8 8.5L9.5 3.5"
                      stroke="#3c7a57"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Totali i kësteve përputhet me çmimin final
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {paymentType === "Me këste" && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-black/82">Plani i pagesave</p>
              <p className="mt-0.5 text-[11px] text-black/42">
                Shtoni këstet që duhet të hapen menjëherë në planin e pagesave.
              </p>
            </div>
            <button
              onClick={onAddInstallment}
              className="rounded-[10px] border border-black/10 px-3 py-1.5 text-[12px] text-black/64 transition hover:bg-black/[0.02]"
            >
              + Shto këst
            </button>
          </div>
          <div className="space-y-2.5">
            {installments.map((installment, index) => (
              <div
                key={`${installment.due_date}-${index}`}
                className="grid grid-cols-[1fr_1fr_auto] gap-2"
              >
                <input
                  type="date"
                  value={installment.due_date}
                  onChange={(event) =>
                    onUpdateInstallment(index, "due_date", event.target.value)
                  }
                  className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={installment.amount}
                  onChange={(event) =>
                    onUpdateInstallment(index, "amount", event.target.value)
                  }
                  placeholder="Shuma"
                  className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
                />
                <button
                  onClick={() => onRemoveInstallment(index)}
                  disabled={installments.length === 1}
                  className="rounded-[11px] border border-black/10 px-3 text-[12px] text-black/48 transition hover:bg-black/[0.02] disabled:opacity-35"
                >
                  Hiq
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
