import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import { DatePickerField } from "../../components/ui/DatePickerField";
import type {
  CRMShowing,
  CreateShowingInput,
  ShowingStatus,
} from "../../hooks/useCRM";
import { SOFT_EASE } from "../shared";
import { ShowingSaleCompletionModal } from "./ShowingSaleCompletionModal";
import type {
  ShowingOutcomeValue,
  ShowingSaleCompletionInput,
  ShowingSaleDraft,
  ShowingSaveResult,
} from "./shared";
import { SHOWING_STATUSES } from "./shared";

const OUTCOME_LABELS: Record<ShowingOutcomeValue, string> = {
  "Pa rezultat": "Pa rezultat",
  Rezervoi: "E rezervuar",
  Bleu: "E shitur",
};

const OUTCOME_VALUES_BY_LABEL = Object.fromEntries(
  Object.entries(OUTCOME_LABELS).map(([value, label]) => [label, value]),
) as Record<string, ShowingOutcomeValue>;

export function ShowingModal({
  initial,
  unitIds,
  onClose,
  onSave,
  onCompleteSale,
}: {
  initial?: Partial<CRMShowing>;
  unitIds: string[];
  onClose: () => void;
  onSave: (data: CreateShowingInput) => Promise<ShowingSaveResult | void>;
  onCompleteSale: (input: ShowingSaleCompletionInput) => Promise<void>;
}) {
  const [unitId, setUnitId] = useState(initial?.unit_id ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [status, setStatus] = useState<ShowingStatus>(initial?.status ?? "E planifikuar");
  const [outcome, setOutcome] = useState<ShowingOutcomeValue>(
    (initial?.outcome as ShowingOutcomeValue) ?? "Pa rezultat",
  );
  const [reservationExpiresAt, setReservationExpiresAt] = useState("");
  const [clientName, setClientName] = useState(
    initial?.manual_contact_name ?? (!initial?.contact_id ? initial?.lead_name ?? "" : ""),
  );
  const [clientPhone, setClientPhone] = useState(initial?.manual_contact_phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saleDraft, setSaleDraft] = useState<ShowingSaleDraft | null>(null);

  const needsReservationExpiry =
    outcome === "Rezervoi" && (initial?.outcome as ShowingOutcomeValue | undefined) !== "Rezervoi";

  const handleSave = async () => {
    const trimmedClientName = clientName.trim();
    const trimmedClientPhone = clientPhone.trim();

    if (!trimmedClientName) {
      setError("Shkruani klientin.");
      return;
    }

    if (!trimmedClientPhone) {
      setError("Shkruani numrin e telefonit.");
      return;
    }

    if (!unitId) {
      setError("Zgjidhni njësinë.");
      return;
    }

    if (!date) {
      setError("Zgjidhni datën.");
      return;
    }

    if (outcome !== "Pa rezultat" && status === "E anuluar") {
      setError("Një shfaqje e anuluar nuk mund të ketë rezultat rezervimi ose shitjeje.");
      return;
    }

    if (needsReservationExpiry && !reservationExpiresAt) {
      setError("Zgjidhni datën e skadimit të rezervimit.");
      return;
    }

    const normalizedStatus: ShowingStatus = outcome === "Pa rezultat" ? status : "E kryer";

    setSaving(true);
    setError("");

    try {
      const result = await onSave({
        lead_id: null,
        manual_contact: {
          name: trimmedClientName,
          phone: trimmedClientPhone,
        },
        unit_id: unitId,
        scheduled_at: `${date}T${time || "00:00"}:00`,
        status: normalizedStatus,
        outcome,
        reservation_expires_at: needsReservationExpiry ? reservationExpiresAt : null,
        notes: notes || null,
      });

      if (result?.nextStep === "sale" && result.draft) {
        setSaleDraft(result.draft);
        return;
      }

      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Shfaqja nuk u ruajt. Kontrolloni të dhënat dhe provoni përsëri.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (saleDraft) {
    return (
      <ShowingSaleCompletionModal
        draft={saleDraft}
        onClose={onClose}
        onComplete={onCompleteSale}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14, ease: SOFT_EASE }}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: 0.18, ease: SOFT_EASE }}
        className="relative z-10 w-[560px] rounded-[20px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[16px] font-semibold tracking-[-0.02em] text-[#003883]">
              {initial ? "Ndrysho shfaqjen" : "Regjistro shfaqje të re"}
            </p>
            <p className="mt-0.5 text-[12px] text-black/40">
              Regjistro klientin, njësinë dhe rezultatin komercial në një hyrje të vetme.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/05"
          >
            <X size={16} className="text-black/40" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-[14px] border border-[#e8e8ec] bg-[#fbfcff] p-4">
            <div className="mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
                Klienti <span className="text-red-400">*</span>
              </span>
              <p className="mt-1 text-[11.5px] text-black/35">
                Shkruaj emrin, mbiemrin dhe numrin e telefonit për këtë shfaqje.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
                  Klienti <span className="text-red-400">*</span>
                </span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Emër dhe mbiemër"
                  className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
                  Telefoni <span className="text-red-400">*</span>
                </span>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  placeholder="Numri i telefonit"
                  className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Njësia <span className="text-red-400">*</span>
            </span>
            <CustomSelect
              value={unitId}
              onChange={setUnitId}
              options={unitIds}
              placeholder="Zgjidh njësinë"
              size="md"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Statusi
            </span>
            <CustomSelect
              value={status}
              onChange={(value) => setStatus(value as ShowingStatus)}
              options={[...SHOWING_STATUSES]}
              placeholder="Zgjidh statusin"
              size="md"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Rezultati
            </span>
            <CustomSelect
              value={OUTCOME_LABELS[outcome]}
              onChange={(value) => setOutcome(OUTCOME_VALUES_BY_LABEL[value] ?? "Pa rezultat")}
              options={Object.values(OUTCOME_LABELS)}
              placeholder="Zgjidh rezultatin"
              size="md"
            />
          </div>
          <DatePickerField
            label="Data"
            value={date}
            onChange={(next) => setDate(next ?? "")}
            required
            labelClassName="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-black/35"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Ora
            </span>
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
            />
          </label>
          {needsReservationExpiry && (
            <DatePickerField
              label="Skadon më"
              value={reservationExpiresAt}
              onChange={(next) => setReservationExpiresAt(next ?? "")}
              required
              labelClassName="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-black/35"
            />
          )}
          {needsReservationExpiry && (
            <p className="col-span-2 -mt-1 text-[11.5px] text-black/40">
              Me ruajtjen e kësaj shfaqjeje do të krijohet edhe rezervimi autoritativ i njësisë.
            </p>
          )}
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Shënime
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Detaje operative, përshtypje ose hapa pasues"
              rows={2}
              className="resize-none rounded-[11px] border border-black/10 bg-white px-3 py-2.5 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
            />
          </label>
        </div>

        {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="rounded-[11px] border border-black/10 px-4 py-2 text-[13px] text-black/60 transition hover:bg-black/[0.02]"
          >
            Anulo
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-[11px] px-4 py-2 text-[13px] text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#003883" }}
          >
            {saving ? "Duke ruajtur..." : initial ? "Ruaj ndryshimet" : "Shto shfaqjen"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
