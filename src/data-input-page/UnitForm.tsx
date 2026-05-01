import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Copy, Trash2 } from "lucide-react";
import type { UnitStatus } from "../hooks/useUnits";
import {
  BLOCKS,
  DRAFT_UNIT_STATUSES,
  type DraftUnit,
  LEVELS,
  ORIENTATION_OPTIONS,
  TYPES,
  isDraftValid,
  roomCategory,
} from "./shared";
import {
  FIELD_LABEL_CLASS,
  NumberField,
  OptionalNumberField,
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
  const [showArchitectureDetails, setShowArchitectureDetails] = useState(
    () =>
      Boolean(
        draft.bedrooms ||
          draft.bathrooms ||
          draft.toilets ||
          draft.orientation ||
          draft.has_storage ||
          draft.balcony_area ||
          draft.terrace_area,
      ),
  );
  const set = (field: keyof DraftUnit, value: unknown) =>
    onChange({ ...draft, [field]: value });
  const roomDetailsCategory = roomCategory(draft.type as string | undefined);
  const hasRoomMetadata =
    draft.bedrooms != null || draft.bathrooms != null || draft.toilets != null;
  const hasArchitectureMetadata =
    hasRoomMetadata ||
    Boolean(
      draft.orientation ||
        draft.has_storage ||
        draft.balcony_area ||
        draft.terrace_area,
    );
  const architectureDetailsSummary =
    roomDetailsCategory === "apartment"
      ? hasRoomMetadata
        ? `${draft.bedrooms ?? "—"} dhoma gjumi · ${draft.bathrooms ?? "—"} banjo · ${draft.toilets ?? "—"} tualet`
        : "Orientim, tualet dhe terrasë"
      : roomDetailsCategory === "lokal"
        ? hasRoomMetadata
          ? `${draft.toilets ?? "—"} tualet`
          : "Orientim dhe tualete"
        : hasArchitectureMetadata
          ? "Detaje arkitekturore të plotësuara"
          : "Orientim dhe depo";
  const draftIsReady = isDraftValid(draft);
  const draftIdentitySummary = [
    draft.unit_id?.trim() || "Pa ID ende",
    draft.type,
    draft.block,
    draft.level,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" · ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="rounded-[16px] border border-[#edf0f5] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f9ff_100%)] p-4 shadow-[0_8px_18px_rgba(0,56,131,0.035)]"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-black/55">
              Njësia #{index + 1}
            </span>
            <span
              className={
                draftIsReady
                  ? "rounded-full border border-[#dcefe4] bg-[#f3fbf6] px-2 py-0.5 text-[10px] font-semibold text-[#3c7a57]"
                  : "rounded-full border border-[#e8ebf1] bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-black/38"
              }
            >
              {draftIsReady ? "Gati" : "Në plotësim"}
            </span>
          </div>
          <p className="mt-1 max-w-[720px] truncate text-[11px] font-medium text-black/38">
            {draftIdentitySummary}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex items-center gap-1.5 rounded-[8px] border border-transparent bg-white px-2.5 py-1 text-[11px] font-medium text-black/45 transition hover:border-black/[0.08] hover:text-black/70"
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TextField
          label="ID e njësisë"
          value={draft.unit_id ?? ""}
          onChange={(v) => set("unit_id", v)}
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
        />
        <NumberField
          label="Çmimi (€)"
          value={draft.price}
          onChange={(v) => set("price", v)}
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
          options={DRAFT_UNIT_STATUSES}
          placeholder="Zgjidh statusin"
        />

        <div className="col-span-1 rounded-[12px] border border-[#edf0f5] bg-white/55 lg:col-span-3">
          <button
            type="button"
            onClick={() => setShowArchitectureDetails((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
          >
            <div>
              <p className={FIELD_LABEL_CLASS}>Detaje arkitekturore</p>
              <p className="mt-1 text-[12px] text-black/42">{architectureDetailsSummary}</p>
            </div>
            <ChevronDown
              size={15}
              className={`shrink-0 text-black/35 transition-transform duration-200 ${
                showArchitectureDetails ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence initial={false}>
            {showArchitectureDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden border-t border-black/[0.06]"
              >
                <div className="grid grid-cols-1 gap-3 px-3 py-3 lg:grid-cols-3">
                  <SelectField
                    label="Orientimi"
                    value={draft.orientation ?? ""}
                    onChange={(v) => set("orientation", v || null)}
                    options={ORIENTATION_OPTIONS}
                    placeholder="Zgjidh"
                  />
                  <SelectField
                    label="Depo"
                    value={draft.has_storage ? "Po" : "Jo"}
                    onChange={(v) => set("has_storage", v === "Po")}
                    options={["Jo", "Po"]}
                    placeholder="Zgjidh"
                  />
                  {roomDetailsCategory === "apartment" ? (
                    <>
                      <RoomNumberField
                        label="Dhoma gjumi"
                        value={draft.bedrooms}
                        onChange={(v) => set("bedrooms", v)}
                      />
                      <RoomNumberField
                        label="Banjo"
                        value={draft.bathrooms}
                        onChange={(v) => set("bathrooms", v)}
                      />
                      <RoomNumberField
                        label="Tualet"
                        value={draft.toilets}
                        onChange={(v) => set("toilets", v)}
                      />
                      <OptionalNumberField
                        label="Terrasë (m²)"
                        value={draft.terrace_area}
                        onChange={(v) => set("terrace_area", v)}
                      />
                    </>
                  ) : roomDetailsCategory === "lokal" ? (
                    <RoomNumberField
                      label="Tualet"
                      value={draft.toilets}
                      onChange={(v) => set("toilets", v)}
                    />
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <label className="col-span-1 flex flex-col gap-1.5 lg:col-span-3">
          <span className={FIELD_LABEL_CLASS}>Shënime</span>
          <input
            type="text"
            value={draft.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            className="h-10 rounded-[11px] border border-black/10 bg-white px-3 text-[13px] text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
          />
        </label>
      </div>
    </motion.div>
  );
}
