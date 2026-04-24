import { useState } from "react";
import { motion } from "framer-motion";
import { Archive } from "lucide-react";
import { SOFT_EASE } from "./shared";

export function ArchiveShowingModal({
  label,
  error,
  onClose,
  onConfirm,
}: {
  label: string;
  error?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm(reason);
    } finally {
      setSaving(false);
    }
  };

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
        className="relative z-10 w-[440px] rounded-[20px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f7fd]">
          <Archive size={18} style={{ color: "#003883" }} />
        </div>
        <p className="mt-4 text-[16px] font-semibold tracking-[-0.02em] text-black/90">
          Arkivo shfaqjen
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-black/45">
          <span className="font-semibold text-black/70">{label}</span> do të hiqet nga rrjedha aktive,
          por historia dhe lidhjet me rezervimin ose shitjen ruhen.
        </p>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-black/35">
            Arsyeja
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Opsionale"
            rows={3}
            className="mt-1.5 w-full resize-none rounded-[12px] border border-black/10 bg-white px-3 py-2 text-[13px] text-black/75 outline-none transition placeholder:text-black/25 focus:border-[#003883]/30 focus:shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
          />
        </label>
        {error && (
          <p className="mt-3 rounded-[12px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] leading-relaxed text-red-600">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="rounded-[11px] border border-black/10 px-4 py-2 text-[13px] text-black/60 transition hover:bg-black/[0.02]"
          >
            Anulo
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="rounded-[11px] px-4 py-2 text-[13px] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "#003883" }}
          >
            {saving ? "Duke arkivuar..." : "Arkivo"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
