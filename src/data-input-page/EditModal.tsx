import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import type { CreateUnitInput, Unit, Block, Level, OwnerCategory, UnitStatus, UnitType } from "../hooks/useUnits";
import type { SalePaymentType } from "../lib/api/sales";
import {
  getUnitContractValue,
  getUnitFinalSalePrice,
  getUnitListingPrice,
} from "../lib/unitFinancials";
import {
  ACCENT,
  BLOCKS,
  type EditModalSavePayload,
  getDefaultOwnerName,
  getOwnerNameOptions,
  LEVELS,
  OWNER_CATEGORIES,
  type SaleInstallmentDraft,
  STATUSES,
  TYPES,
  todayIso,
} from "./shared";
import { DateField, NumberField, SelectField, TextField } from "./fields";
import {
  EditModalSaleSuccess,
  type SaleSuccessSnapshot,
} from "./EditModalSaleSuccess";
import { EditModalSaleSection } from "./EditModalSaleSection";

/**
 * Modal for editing a persisted unit. Acts as the state owner for both
 * the generic edit form and the (conditional) sale-completion section,
 * because the `handleSave` dispatch has to validate both together
 * before building the discriminated `EditModalSavePayload`.
 *
 * On a sale transition, `handleSave` keeps the modal open and flips to
 * a post-success state (`saleSuccess`). For a pure update,
 * `handleSave` closes the modal on success. That split is preserved
 * exactly from the pre-decomposition behavior.
 */
export function EditModal({
  unit,
  ownerNameOptionsByCategory,
  onClose,
  onSave,
  onSaleSuccessDismiss,
}: {
  unit: Unit;
  ownerNameOptionsByCategory: Record<OwnerCategory, string[]>;
  onClose: () => void;
  onSave: (payload: EditModalSavePayload) => Promise<void>;
  onSaleSuccessDismiss?: (unitId: string) => void;
}) {
  const listingPrice = getUnitListingPrice(unit);
  const initialFinalSalePrice = getUnitFinalSalePrice(unit);
  const contractValue = getUnitContractValue(unit);

  const [form, setForm] = useState<Partial<CreateUnitInput>>({
    unit_id: unit.unit_id,
    block: unit.block,
    type: unit.type,
    level: unit.level,
    size: unit.size,
    price: listingPrice,
    status: unit.status,
    owner_category: unit.owner_category,
    owner_name: unit.owner_name,
    reservation_expires_at: unit.reservation_expires_at,
    notes: unit.notes ?? "",
  });
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [buyerName, setBuyerName] = useState(unit.buyer_name ?? "");
  const [saleDate, setSaleDate] = useState(unit.sale_date?.slice(0, 10) ?? "");
  const [finalPrice, setFinalPrice] = useState(String(contractValue));
  const [paymentType, setPaymentType] = useState<SalePaymentType>(
    unit.payment_type === "Me këste" ? "Me këste" : "Pagesë e plotë",
  );
  const [installments, setInstallments] = useState<SaleInstallmentDraft[]>([
    {
      due_date: unit.sale_date?.slice(0, 10) ?? todayIso(),
      amount: initialFinalSalePrice != null ? String(initialFinalSalePrice) : "",
      notes: "",
    },
  ]);
  const [saleSuccess, setSaleSuccess] = useState<SaleSuccessSnapshot | null>(null);

  const set = (field: keyof CreateUnitInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const isSaleTransition = unit.status !== "E shitur" && form.status === "E shitur";
  const ownerCategory = form.owner_category ?? "Investitor";
  const ownerNameOptions = getOwnerNameOptions(
    ownerCategory,
    ownerNameOptionsByCategory[ownerCategory],
    [form.owner_name ?? ""],
  );

  const addInstallment = () => {
    setInstallments((prev) => [
      ...prev,
      {
        due_date: saleDate || todayIso(),
        amount: "",
        notes: "",
      },
    ]);
  };

  const updateInstallment = (
    index: number,
    field: keyof SaleInstallmentDraft,
    value: string,
  ) => {
    setInstallments((prev) =>
      prev.map((installment, installmentIndex) =>
        installmentIndex === index
          ? { ...installment, [field]: value }
          : installment,
      ),
    );
  };

  const removeInstallment = (index: number) => {
    setInstallments((prev) =>
      prev.filter((_, installmentIndex) => installmentIndex !== index),
    );
  };

  const handleSave = async () => {
    if (!reason.trim()) {
      setError("Ju lutem shkruani arsyen e ndryshimit.");
      return;
    }
    const normalizedNotes = typeof form.notes === "string" ? form.notes : null;
    const baseChanges: Partial<CreateUnitInput> = {
      ...form,
      notes: normalizedNotes,
      reservation_expires_at:
        form.status === "E rezervuar" ? form.reservation_expires_at ?? null : null,
    };

    if (isSaleTransition) {
      const parsedFinalPrice = Number(finalPrice);
      if (!buyerName.trim()) {
        setError("Plotësoni blerësin / klientin.");
        return;
      }
      if (!saleDate) {
        setError("Zgjidhni datën e shitjes.");
        return;
      }
      if (!Number.isFinite(parsedFinalPrice) || parsedFinalPrice <= 0) {
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

        if (Math.abs(totalInstallments - parsedFinalPrice) > 0.01) {
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

      const genericChanges: Partial<CreateUnitInput> = {
        ...baseChanges,
        reservation_expires_at: null,
      };
      delete genericChanges.status;
      delete genericChanges.sale_date;

      setIsSubmitting(true);
      setError("");
      try {
        await onSave({
          mode: "sale",
          reason: reason.trim(),
          genericChanges,
          sale: {
            unitRecordId: unit.id,
            sale_date: saleDate,
            final_price: parsedFinalPrice,
            buyer_name: buyerName.trim(),
            payment_type: paymentType,
            notes: normalizedNotes,
            installments:
              paymentType === "Me këste"
                ? installments.map((installment, index) => ({
                    installment_number: index + 1,
                    due_date: installment.due_date,
                    amount: Number(installment.amount),
                    notes: installment.notes || null,
                  }))
                : [],
          },
        });
        setSaleSuccess({
          unitRecordId: unit.id,
          unitId: unit.unit_id,
          buyerName: buyerName.trim(),
          finalPrice: parsedFinalPrice,
          paymentType,
          saleDate,
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Shitja nuk u kompletua dot.",
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSave({
        mode: "update",
        changes: baseChanges,
        reason: reason.trim(),
      });
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Ndryshimet nuk u ruajtën dot.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={saleSuccess || isSubmitting ? undefined : onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-[640px] rounded-[20px] bg-white p-6 shadow-2xl"
      >
        {saleSuccess ? (
          <EditModalSaleSuccess
            success={saleSuccess}
            onClose={onClose}
            onSaleSuccessDismiss={onSaleSuccessDismiss}
          />
        ) : (
          <motion.div
            key="sale-form"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-5">
              <p className="text-[16px] font-semibold tracking-[-0.02em] text-black/90">
                Ndrysho njësinë
              </p>
              <p className="mt-0.5 text-[12px] text-black/40">
                {unit.unit_id} · {unit.block}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <TextField
                label="ID e njësisë"
                value={form.unit_id ?? ""}
                onChange={(v) => set("unit_id", v)}
              />
              <SelectField
                label="Blloku"
                value={form.block ?? ""}
                onChange={(v) => set("block", v as Block)}
                options={BLOCKS}
                placeholder="Zgjidh"
              />
              <SelectField
                label="Lloji"
                value={form.type ?? ""}
                onChange={(v) => set("type", v as UnitType)}
                options={[...TYPES]}
                placeholder="Zgjidh"
              />
              <SelectField
                label="Niveli"
                value={form.level ?? ""}
                onChange={(v) => set("level", v as Level)}
                options={LEVELS}
                placeholder="Zgjidh"
              />
              <NumberField
                label="Sipërfaqja (m²)"
                value={form.size}
                onChange={(v) => set("size", v)}
              />
              <NumberField
                label="Çmimi (€)"
                value={form.price}
                onChange={(v) => set("price", v)}
              />
              <SelectField
                label="Kategoria"
                value={form.owner_category ?? ""}
                onChange={(v) => {
                  const nextCategory = v as OwnerCategory;
                  set("owner_category", nextCategory);
                  set(
                    "owner_name",
                    getDefaultOwnerName(
                      nextCategory,
                      ownerNameOptionsByCategory[nextCategory],
                    ),
                  );
                }}
                options={OWNER_CATEGORIES}
                placeholder="Zgjidh"
              />
              <SelectField
                label="Pronari"
                value={form.owner_name ?? ""}
                onChange={(v) => set("owner_name", v)}
                options={ownerNameOptions}
                placeholder="Zgjidh"
              />
              <SelectField
                label="Statusi"
                value={form.status ?? ""}
                onChange={(v) => set("status", v as UnitStatus)}
                options={STATUSES}
                placeholder="Zgjidh"
              />
              {form.status === "E rezervuar" && (
                <DateField
                  label="Skadon më"
                  value={form.reservation_expires_at}
                  onChange={(v) => set("reservation_expires_at", v)}
                />
              )}
              <label className="col-span-3 flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
                  Shënime
                </span>
                <input
                  type="text"
                  value={form.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                  className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] outline-none transition focus:border-[#003883]/30"
                />
              </label>
            </div>

            {isSaleTransition && (
              <EditModalSaleSection
                listingPrice={listingPrice}
                buyerName={buyerName}
                onBuyerNameChange={setBuyerName}
                saleDate={saleDate}
                onSaleDateChange={setSaleDate}
                finalPrice={finalPrice}
                onFinalPriceChange={setFinalPrice}
                paymentType={paymentType}
                onPaymentTypeChange={setPaymentType}
                installments={installments}
                onAddInstallment={addInstallment}
                onUpdateInstallment={updateInstallment}
                onRemoveInstallment={removeInstallment}
              />
            )}

            <div className="mt-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
                  Arsyeja e ndryshimit <span className="text-red-400">*</span>
                </span>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError("");
                  }}
                  placeholder="p.sh. Klienti kërkoi ndryshim të sipërfaqes"
                  className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
                />
              </label>
              {error && (
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-red-500">
                  <AlertCircle size={12} /> {error}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-[11px] border border-black/10 px-4 py-2 text-[13px] text-black/60 transition hover:bg-black/[0.02] disabled:opacity-50"
              >
                Anulo
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className={`flex items-center gap-2 rounded-[11px] px-4 py-2 text-[13px] text-white transition hover:opacity-90 disabled:opacity-60 ${
                  isSubmitting ? "cursor-not-allowed" : ""
                }`}
                style={{ backgroundColor: ACCENT }}
              >
                {isSubmitting && (
                  <span
                    aria-hidden="true"
                    className="inline-block h-[12px] w-[12px] animate-spin rounded-full border-[1.5px] border-white/40 border-t-white"
                  />
                )}
                {isSubmitting ? "Duke procesuar..." : "Ruaj ndryshimet"}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
