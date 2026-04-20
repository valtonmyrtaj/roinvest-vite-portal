import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import type {
  CRMLead,
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

export function ShowingModal({
  initial,
  leads,
  unitIds,
  onClose,
  onSave,
  onCompleteSale,
}: {
  initial?: Partial<CRMShowing>;
  leads: CRMLead[];
  unitIds: string[];
  onClose: () => void;
  onSave: (data: CreateShowingInput) => Promise<ShowingSaveResult | void>;
  onCompleteSale: (input: ShowingSaleCompletionInput) => Promise<void>;
}) {
  const [contactMode, setContactMode] = useState<"existing" | "manual">(
    initial?.contact_id ? "existing" : "existing",
  );
  const [leadId, setLeadId] = useState(initial?.contact_id ?? "");
  const [unitId, setUnitId] = useState(initial?.unit_id ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [status, setStatus] = useState<ShowingStatus>(initial?.status ?? "E planifikuar");
  const [outcome, setOutcome] = useState<ShowingOutcomeValue>(
    (initial?.outcome as ShowingOutcomeValue) ?? "Pa rezultat",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saleDraft, setSaleDraft] = useState<ShowingSaleDraft | null>(null);

  const leadOptions = leads.map((lead) => lead.name);
  const leadIdByName = Object.fromEntries(leads.map((lead) => [lead.name, lead.id]));
  const selectedLeadName = leads.find((lead) => lead.id === leadId)?.name ?? "";

  const handleSave = async () => {
    if (contactMode === "existing" && !leadId) {
      setError("Zgjidhni kontaktin.");
      return;
    }

    if (contactMode === "manual") {
      if (!firstName.trim()) {
        setError("Plotësoni emrin.");
        return;
      }
      if (!lastName.trim()) {
        setError("Plotësoni mbiemrin.");
        return;
      }
      if (!phone.trim()) {
        setError("Plotësoni numrin e telefonit.");
        return;
      }
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

    const normalizedStatus: ShowingStatus = outcome === "Pa rezultat" ? status : "E kryer";

    setSaving(true);
    setError("");

    try {
      const result = await onSave({
        lead_id: contactMode === "existing" ? leadId : "",
        manual_contact:
          contactMode === "manual"
            ? {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone: phone.trim(),
              }
            : null,
        unit_id: unitId,
        scheduled_at: `${date}T${time || "00:00"}:00`,
        status: normalizedStatus,
        outcome,
        notes: notes || null,
      });

      if (result?.nextStep === "sale" && result.draft) {
        setSaleDraft(result.draft);
        return;
      }

      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Shfaqja nuk u ruajt dot.");
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
            <p className="text-[16px] font-semibold tracking-[-0.02em] text-black/90">
              {initial ? "Ndrysho shfaqjen" : "Shto shfaqje të re"}
            </p>
            <p className="mt-0.5 text-[12px] text-black/40">
              Kontakti, njësia dhe rezultati komercial i shfaqjes
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
          <div className="col-span-2 rounded-[14px] border border-black/08 bg-[#fafafc] p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
                Kontakti <span className="text-red-400">*</span>
              </span>
              <button
                onClick={() => {
                  setContactMode((current) => (current === "existing" ? "manual" : "existing"));
                  setError("");
                }}
                className="text-[12px] font-medium text-[#003883] transition hover:opacity-80"
              >
                {contactMode === "existing" ? "+ Kontakt i ri" : "Përdor kontakt ekzistues"}
              </button>
            </div>

            {contactMode === "existing" ? (
              <CustomSelect
                value={selectedLeadName}
                onChange={(value) => setLeadId(leadIdByName[value] ?? "")}
                options={leadOptions}
                placeholder="Zgjidh kontaktin"
                size="md"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
                    Emri <span className="text-red-400">*</span>
                  </span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
                    Mbiemri <span className="text-red-400">*</span>
                  </span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
                  />
                </label>
                <label className="col-span-2 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
                    Numri i telefonit <span className="text-red-400">*</span>
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
                  />
                </label>
              </div>
            )}
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
              value={outcome}
              onChange={(value) => setOutcome(value as ShowingOutcomeValue)}
              options={["Pa rezultat", "Rezervoi", "Bleu"]}
              placeholder="Zgjidh rezultatin"
              size="md"
            />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Data <span className="text-red-400">*</span>
            </span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
            />
          </label>
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
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
              Shënime
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Shënime opsionale..."
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
