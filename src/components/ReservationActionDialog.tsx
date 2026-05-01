import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarRange, RefreshCw, Undo2, X } from "lucide-react";
import type { Unit } from "../hooks/useUnits";
import { todayIsoDate } from "../lib/reservationExpiry";
import { NAVY } from "../ui/tokens";
import { DatePickerField } from "./ui/DatePickerField";
import { fmtDateShort, statusStyleFor } from "../units-dashboard/shared";
import { PillBadge } from "./ui/PillBadge";

export type ReservationActionMode = "extend" | "release";

export function ReservationActionDialog({
  unit,
  mode,
  onClose,
  onSubmit,
}: {
  unit: Unit;
  mode: ReservationActionMode;
  onClose: () => void;
  onSubmit: (payload: { expiresAt?: string; notes?: string }) => Promise<void>;
}) {
  const [expiresAt, setExpiresAt] = useState(unit.reservation_expires_at?.slice(0, 10) ?? todayIsoDate());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const title = mode === "extend" ? "Zgjat rezervimin" : "Liro njësinë";
  const actionLabel = mode === "extend" ? "Ruaj afatin" : "Liro njësinë";
  const Icon = mode === "extend" ? RefreshCw : Undo2;
  const minDate = todayIsoDate();
  const currentExpiryDate = unit.reservation_expires_at?.slice(0, 10) ?? null;
  const metaLine = useMemo(
    () => `${unit.block} · ${unit.level} · ${unit.size} m²`,
    [unit.block, unit.level, unit.size],
  );

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (!saving) onClose();
    };

    window.addEventListener("keydown", handleEscape, true);
    return () => {
      window.removeEventListener("keydown", handleEscape, true);
    };
  }, [onClose, saving]);

  const handleSubmit = async () => {
    if (mode === "extend") {
      if (!expiresAt) {
        setError("Zgjidhni datën e re të skadimit.");
        return;
      }

      if (currentExpiryDate && expiresAt === currentExpiryDate) {
        setError("Zgjidhni një datë të re për ta zgjatur rezervimin.");
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      await onSubmit({
        ...(mode === "extend" ? { expiresAt } : {}),
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Veprimi nuk u ruajt. Provoni përsëri.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[rgba(15,23,42,0.22)] backdrop-blur-[6px]"
        onClick={saving ? undefined : onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-[460px] rounded-[26px] border border-black/[0.06] bg-[#fbfbfc] shadow-[-12px_28px_80px_rgba(15,23,42,0.18),0_10px_28px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-start justify-between border-b border-[#eef0f4] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/30">
              Menaxhimi i rezervimit
            </p>
            <p className="mt-2 text-[19px] font-semibold tracking-[-0.03em]" style={{ color: NAVY }}>
              {title}
            </p>
            <p className="mt-1 text-[12.5px] text-black/46">
              {unit.unit_id} · {metaLine}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white/90 text-black/35 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-white hover:text-black/58 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-[20px] border border-[#e7ebf2] bg-white/92 px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                  Njësia
                </p>
                <p className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.04em]" style={{ color: NAVY }}>
                  {unit.unit_id}
                </p>
              </div>
              <PillBadge weight="medium" style={statusStyleFor(unit.status)}>
                {unit.status}
              </PillBadge>
            </div>

            {unit.reservation_expires_at && (
              <p className="mt-3 text-[11.5px] text-black/42">
                Afati aktual: {fmtDateShort(unit.reservation_expires_at)}
              </p>
            )}
          </div>

          {mode === "extend" ? (
            <div className="rounded-[20px] border border-[#e7ebf2] bg-white/92 px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/28">
                <CalendarRange size={14} />
                Afati i ri
              </div>
              <DatePickerField
                className="mt-3"
                label="Skadon më"
                min={minDate}
                value={expiresAt}
                onChange={(next) => setExpiresAt(next ?? "")}
                required
                size="lg"
                labelClassName="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-black/30"
              />
              <p className="mt-2 text-[11.5px] leading-5 text-black/38">
                Afati i ri do të përditësohet në rezervim, në pasqyrën e njësisë dhe në histori.
              </p>
            </div>
          ) : (
            <div className="rounded-[20px] border border-[#f1dede] bg-[#fffafb] px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
              <p className="text-[12.5px] font-medium text-black/62">
                Kjo do ta mbyllë rezervimin aktiv dhe do ta kthejë njësinë në statusin{" "}
                <span className="font-semibold text-black/78">Në dispozicion</span>.
              </p>
              <p className="mt-2 text-[11.5px] leading-5 text-black/38">
                Veprimi ruhet në historikun e njësisë dhe e liron njësinë për përdorim të mëtejshëm operativ.
              </p>
            </div>
          )}

          <div className="rounded-[20px] border border-[#e7ebf2] bg-white/92 px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-black/30">
                {mode === "extend" ? "Shënim opsional" : "Arsye ose shënim"}
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder={
                  mode === "extend"
                    ? "p.sh. klienti kërkoi edhe 3 ditë për konfirmim"
                    : "p.sh. rezervimi u lirua me kërkesë të klientit"
                }
                className="min-h-[90px] rounded-[12px] border border-black/10 bg-white px-3 py-2.5 text-[13px] leading-5 text-black/80 outline-none transition focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
              />
            </label>
            <p className="mt-2 text-[11.5px] leading-5 text-black/38">
              Nëse e lini bosh, shënimi aktual i rezervimit mbetet i pandryshuar.
            </p>
          </div>

          {error && <p className="text-[12px] text-[#b14b4b]">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#eef0f4] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-[12px] border border-black/[0.08] bg-white px-4 py-2.5 text-[12.5px] font-medium text-black/56 transition hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Anulo
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60 ${
              mode === "extend" ? "bg-[#003883]" : "bg-[#8e4a4a]"
            }`}
          >
            <Icon size={14} />
            {saving
              ? mode === "extend"
                ? "Duke ruajtur..."
                : "Duke liruar..."
              : actionLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
