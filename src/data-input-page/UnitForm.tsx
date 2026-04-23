import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Copy, Trash2 } from "lucide-react";
import type { UnitStatus } from "../hooks/useUnits";
import {
  BLOCKS,
  type DraftUnit,
  LEVELS,
  MANUAL_UNIT_STATUSES,
  TYPES,
  roomCategory,
} from "./shared";
import {
  NumberField,
  RoomNumberField,
  SelectField,
  TextField,
} from "./fields";

/**
 * A single editable draft-unit row inside the "Shto njësi të reja" list.
 * Keeps only lightweight local UI state such as the optional plan-details
 * disclosure. All persistent draft state is raised to the parent
 * via `onChange` — `onRemove` / `onDuplicate` trigger list-level edits.
 */
export function UnitForm({
  draft,
  ownerNameOptions,
  onChange,
  onRemove,
  onDuplicate,
  index,
}: {
  draft: DraftUnit;
  ownerNameOptions: string[];
  onChange: (d: DraftUnit) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  index: number;
}) {
  const [showPlanDetails, setShowPlanDetails] = useState(
    () => Boolean(draft.bedrooms || draft.bathrooms || draft.toilets),
  );
  const set = (field: keyof DraftUnit, value: unknown) =>
    onChange({ ...draft, [field]: value });
  const roomDetailsCategory = roomCategory(draft.type as string | undefined);
  const supportsPlanDetails =
    roomDetailsCategory === "apartment" || roomDetailsCategory === "lokal";
  const hasRoomMetadata =
    draft.bedrooms != null || draft.bathrooms != null || draft.toilets != null;
  const planDetailsSummary =
    roomDetailsCategory === "apartment"
      ? hasRoomMetadata
        ? `${draft.bedrooms ?? "—"} dhoma gjumi · ${draft.bathrooms ?? "—"} banjo`
        : "Opsionale për ofertat dhe referencën e planit"
      : roomDetailsCategory === "lokal"
        ? hasRoomMetadata
          ? `${draft.toilets ?? "—"} tualet`
          : "Opsionale për ofertat dhe referencën e planit"
        : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="rounded-[14px] border border-black/[0.07] bg-[#fafafa] p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-black/40">
          Njësia #{index + 1}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex items-center gap-1.5 rounded-[8px] border border-black/08 bg-white px-2.5 py-1 text-[11px] text-black/40 transition hover:text-black/70"
          >
            <Copy size={11} /> Duplikim
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1.5 rounded-[8px] border border-red-100 bg-white px-2.5 py-1 text-[11px] text-red-400 transition hover:bg-red-50"
          >
            <Trash2 size={11} /> Fshi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TextField
          label="ID e njësisë"
          value={draft.unit_id ?? ""}
          onChange={(v) => set("unit_id", v)}
          placeholder="p.sh. BA-01"
        />
        <SelectField
          label="Blloku"
          value={draft.block ?? ""}
          onChange={(v) => set("block", v)}
          options={BLOCKS}
          placeholder="Zgjidh bllokun"
        />
        <SelectField
          label="Lloji"
          value={draft.type ?? ""}
          onChange={(v) => set("type", v)}
          options={[...TYPES]}
          placeholder="Zgjidh llojin"
        />
        <SelectField
          label="Niveli"
          value={draft.level ?? ""}
          onChange={(v) => set("level", v)}
          options={LEVELS}
          placeholder="Zgjidh nivelin"
        />
        <NumberField
          label="Sipërfaqja (m²)"
          value={draft.size}
          onChange={(v) => set("size", v)}
          placeholder="p.sh. 90"
        />
        <NumberField
          label="Çmimi (€)"
          value={draft.price}
          onChange={(v) => set("price", v)}
          placeholder="p.sh. 180000"
        />
        <SelectField
          label="Pronari"
          value={draft.owner_name ?? ""}
          onChange={(v) => set("owner_name", v)}
          options={ownerNameOptions}
          placeholder="Zgjidh pronarin"
        />
        <SelectField
          label="Statusi"
          value={draft.status ?? ""}
          onChange={(v) => set("status", v as UnitStatus)}
          options={MANUAL_UNIT_STATUSES}
          placeholder="Zgjidh statusin"
        />

        {supportsPlanDetails && (
          <div className="col-span-3 rounded-[12px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
            <button
              type="button"
              onClick={() => setShowPlanDetails((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
                  Detaje të planit
                </p>
                <p className="mt-1 text-[12px] text-black/42">{planDetailsSummary}</p>
              </div>
              <ChevronDown
                size={15}
                className={`shrink-0 text-black/35 transition-transform duration-200 ${
                  showPlanDetails ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {showPlanDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden border-t border-black/[0.06]"
                >
                  <div className="grid grid-cols-3 gap-3 px-3 py-3">
                    {roomDetailsCategory === "apartment" ? (
                      <>
                        <RoomNumberField
                          label="Dhoma gjumi"
                          value={draft.bedrooms}
                          onChange={(v) => set("bedrooms", v)}
                          placeholder="p.sh. 2"
                        />
                        <RoomNumberField
                          label="Banjo"
                          value={draft.bathrooms}
                          onChange={(v) => set("bathrooms", v)}
                          placeholder="p.sh. 1"
                        />
                      </>
                    ) : (
                      <RoomNumberField
                        label="Tualet"
                        value={draft.toilets}
                        onChange={(v) => set("toilets", v)}
                        placeholder="p.sh. 1"
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <label className="col-span-3 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
            Shënime
          </span>
          <input
            type="text"
            value={draft.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Shënime operative, nëse duhen"
            className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
          />
        </label>
      </div>
    </motion.div>
  );
}
