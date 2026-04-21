import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Trash2 } from "lucide-react";
import type { UnitStatus } from "../hooks/useUnits";
import {
  BLOCKS,
  type DraftUnit,
  LEVELS,
  STATUSES,
  TYPES,
  roomCategory,
} from "./shared";
import {
  DateField,
  NumberField,
  RoomNumberField,
  SelectField,
  TextField,
} from "./fields";

/**
 * A single editable draft-unit row inside the "Shto njësi të reja" list.
 * Owns only the ephemeral `touchedRooms` flags (so the apartment/lokal
 * room-field errors appear after the user actually touches the input,
 * not on initial render). All persistent state is raised to the parent
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
  const [touchedRooms, setTouchedRooms] = useState({
    bedrooms: false,
    bathrooms: false,
    toilets: false,
  });
  const set = (field: keyof DraftUnit, value: unknown) =>
    onChange({ ...draft, [field]: value });

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
            onClick={onDuplicate}
            className="flex items-center gap-1.5 rounded-[8px] border border-black/08 bg-white px-2.5 py-1 text-[11px] text-black/40 transition hover:text-black/70"
          >
            <Copy size={11} /> Duplikim
          </button>
          <button
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
        {(() => {
          const cat = roomCategory(draft.type as string | undefined);
          if (cat === "apartment")
            return (
              <>
                <RoomNumberField
                  label="Dhoma gjumi"
                  value={draft.bedrooms}
                  onChange={(v) => {
                    setTouchedRooms((t) => ({ ...t, bedrooms: true }));
                    set("bedrooms", v);
                  }}
                  placeholder="p.sh. 2"
                  error={
                    touchedRooms.bedrooms &&
                    (!draft.bedrooms || draft.bedrooms <= 0)
                      ? "Dhoma gjumi është e detyrueshme"
                      : undefined
                  }
                />
                <RoomNumberField
                  label="Banjo"
                  value={draft.bathrooms}
                  onChange={(v) => {
                    setTouchedRooms((t) => ({ ...t, bathrooms: true }));
                    set("bathrooms", v);
                  }}
                  placeholder="p.sh. 1"
                  error={
                    touchedRooms.bathrooms &&
                    (!draft.bathrooms || draft.bathrooms <= 0)
                      ? "Banjo është e detyrueshme"
                      : undefined
                  }
                />
              </>
            );
          if (cat === "lokal")
            return (
              <RoomNumberField
                label="Tualet"
                value={draft.toilets}
                onChange={(v) => {
                  setTouchedRooms((t) => ({ ...t, toilets: true }));
                  set("toilets", v);
                }}
                placeholder="p.sh. 1"
                error={
                  touchedRooms.toilets && (!draft.toilets || draft.toilets <= 0)
                    ? "Tualet është i detyrueshëm"
                    : undefined
                }
              />
            );
          return null;
        })()}
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
          options={STATUSES}
          placeholder="Zgjidh statusin"
        />
        {draft.status === "E rezervuar" && (
          <DateField
            label="Skadon më"
            value={draft.reservation_expires_at}
            onChange={(v) => set("reservation_expires_at", v)}
          />
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
