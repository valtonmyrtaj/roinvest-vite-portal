import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { SOFT_EASE } from "./shared";

export function ConfirmDeleteModal({
  label,
  error,
  onClose,
  onConfirm,
}: {
  label: string;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
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
        className="relative z-10 w-[400px] rounded-[20px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#fbeeee]">
          <AlertTriangle size={18} style={{ color: "#b14b4b" }} />
        </div>
        <p className="mt-4 text-[16px] font-semibold tracking-[-0.02em] text-black/90">
          Konfirmo fshirjen
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-black/45">
          A jeni i sigurt që doni të fshini <span className="font-semibold text-black/70">{label}</span>?
          Ky veprim nuk mund të kthehet.
        </p>
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
            onClick={onConfirm}
            className="rounded-[11px] px-4 py-2 text-[13px] text-white transition hover:opacity-90"
            style={{ backgroundColor: "#b14b4b" }}
          >
            Fshi
          </button>
        </div>
      </motion.div>
    </div>
  );
}
