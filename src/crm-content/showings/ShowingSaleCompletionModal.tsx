import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { NAVY, SOFT_EASE } from "../shared";
import type {
  ShowingPaymentType,
  ShowingSaleCompletionInput,
  ShowingSaleDraft,
} from "./shared";

export function ShowingSaleCompletionModal({
  draft,
  onClose,
  onComplete,
}: {
  draft: ShowingSaleDraft;
  onClose: () => void;
  onComplete: (input: ShowingSaleCompletionInput) => Promise<void>;
}) {
  const [buyerName, setBuyerName] = useState(draft.leadName);
  const [saleDate, setSaleDate] = useState(draft.saleDate);
  const [finalPrice, setFinalPrice] = useState("");
  const [paymentType, setPaymentType] = useState<ShowingPaymentType>("Pagesë e plotë");
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [installments, setInstallments] = useState([
    { due_date: draft.saleDate, amount: "", notes: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addInstallment = () => {
    setInstallments((prev) => [...prev, { due_date: draft.saleDate, amount: "", notes: "" }]);
  };

  const updateInstallment = (
    index: number,
    field: "due_date" | "amount" | "notes",
    value: string,
  ) => {
    setInstallments((prev) =>
      prev.map((installment, installmentIndex) =>
        installmentIndex === index ? { ...installment, [field]: value } : installment,
      ),
    );
  };

  const removeInstallment = (index: number) => {
    setInstallments((prev) => prev.filter((_, installmentIndex) => installmentIndex !== index));
  };

  const handleComplete = async () => {
    const parsedPrice = Number(finalPrice);

    if (!buyerName.trim()) {
      setError("Plotësoni blerësin.");
      return;
    }

    if (!saleDate) {
      setError("Zgjidhni datën e shitjes.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Vendosni një çmim final të vlefshëm.");
      return;
    }

    if (paymentType === "Me këste") {
      if (installments.length === 0) {
        setError("Shtoni të paktën një këst.");
        return;
      }

      const totalInstallments = installments.reduce((sum, installment) => {
        const parsedAmount = Number(installment.amount);
        return sum + (Number.isFinite(parsedAmount) ? parsedAmount : 0);
      }, 0);

      if (Math.abs(totalInstallments - parsedPrice) > 0.01) {
        setError("Totali i kësteve duhet të jetë i barabartë me çmimin final.");
        return;
      }

      const hasInvalidInstallment = installments.some(
        (installment) =>
          !installment.due_date ||
          !Number.isFinite(Number(installment.amount)) ||
          Number(installment.amount) <= 0,
      );

      if (hasInvalidInstallment) {
        setError("Plotësoni të gjitha këstet me datë dhe shumë të vlefshme.");
        return;
      }
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onComplete({
        showing_id: draft.showingId,
        unit_id: draft.unitId,
        lead_id: draft.leadId,
        buyer_name: buyerName.trim(),
        sale_date: saleDate,
        final_price: parsedPrice,
        payment_type: paymentType,
        notes: notes || null,
        installments:
          paymentType === "Me këste"
            ? installments.map((installment, index) => ({
                installment_number: index + 1,
                due_date: installment.due_date,
                amount: Number(installment.amount),
                notes: installment.notes || null,
              }))
            : [],
      });
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Shitja nuk u kompletua. Kontrolloni të dhënat dhe provoni përsëri.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14, ease: SOFT_EASE }}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={isSubmitting ? undefined : onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: 0.18, ease: SOFT_EASE }}
        className="relative z-10 w-[620px] rounded-[20px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[16px] font-semibold tracking-[-0.02em] text-black/90">
              Përfundo shitjen
            </p>
            <p className="mt-0.5 text-[12px] text-black/40">
              Ky veprim e kalon njësinë në shitje të konfirmuar dhe hap kompletimin financiar.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/05 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={16} className="text-black/40" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Blerësi <span className="text-red-400">*</span>
            </span>
            <input
              type="text"
              value={buyerName}
              onChange={(event) => setBuyerName(event.target.value)}
              className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
            />
          </label>
          <DatePickerField
            label="Data e shitjes"
            value={saleDate}
            onChange={(next) => setSaleDate(next ?? "")}
            required
            labelClassName="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-black/35"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Çmimi final <span className="text-red-400">*</span>
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={finalPrice}
              onChange={(event) => setFinalPrice(event.target.value)}
              placeholder="p.sh. 120000"
              className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Lloji i pagesës <span className="text-red-400">*</span>
            </span>
            <CustomSelect
              value={paymentType}
              onChange={(value) => setPaymentType(value as ShowingPaymentType)}
              options={["Pagesë e plotë", "Me këste"]}
              placeholder="Zgjidh pagesën"
              size="md"
            />
          </div>
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Shënime
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Shënime operative për shitjen, nëse duhen"
              rows={2}
              className="resize-none rounded-[11px] border border-black/10 bg-white px-3 py-2.5 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
            />
          </label>
        </div>

        {paymentType === "Me këste" && (
          <div className="mt-4 rounded-[16px] border border-black/08 bg-[#fafafc] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-black/82">Plani i pagesave</p>
                <p className="mt-0.5 text-[11px] text-black/42">
                  Shtoni këstet që duhet të hapen menjëherë në planin e pagesave.
                </p>
              </div>
              <button
                onClick={addInstallment}
                className="rounded-[10px] border border-black/10 px-3 py-1.5 text-[12px] text-black/64 transition hover:bg-black/[0.02]"
              >
                + Shto këst
              </button>
            </div>
            <div className="space-y-2.5">
              {installments.map((installment, index) => (
                <div key={`${installment.due_date}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <DatePickerField
                    value={installment.due_date}
                    onChange={(next) => updateInstallment(index, "due_date", next ?? "")}
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={installment.amount}
                    onChange={(event) => updateInstallment(index, "amount", event.target.value)}
                    placeholder="Shuma"
                    className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
                  />
                  <button
                    onClick={() => removeInstallment(index)}
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

        {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-[11px] border border-black/10 px-4 py-2 text-[13px] text-black/60 transition hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anulo
          </button>
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className={`flex items-center gap-2 rounded-[11px] px-4 py-2 text-[13px] text-white transition hover:opacity-90 disabled:opacity-60 ${
              isSubmitting ? "cursor-not-allowed" : ""
            }`}
            style={{ backgroundColor: NAVY }}
          >
            {isSubmitting && (
              <span
                aria-hidden="true"
                className="inline-block h-[12px] w-[12px] animate-spin rounded-full border-[1.5px] border-white/40 border-t-white"
              />
            )}
            {isSubmitting ? "Duke procesuar..." : "Përfundo shitjen"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
