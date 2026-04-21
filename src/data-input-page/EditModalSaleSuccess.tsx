import { motion } from "framer-motion";
import { formatEuro as formatEuroCompact } from "../lib/formatCurrency";
import type { SalePaymentType } from "../lib/api/sales";
import { ACCENT, formatAlbanianDate } from "./shared";

export type SaleSuccessSnapshot = {
  unitRecordId: string;
  unitId: string;
  buyerName: string;
  finalPrice: number;
  paymentType: SalePaymentType;
  saleDate: string;
};

/**
 * The "Shitja u kompletua me sukses" overlay that replaces the
 * edit-form body once a sale transition has been persisted. Purely
 * presentational — the parent decides when to show it, and the
 * "Mbyll" button both signals the parent (to flash/highlight the row
 * in the registry) and dismisses the modal.
 *
 * Animation sequencing (icon scale-in → checkmark path draw → staggered
 * detail rows) is preserved verbatim from the pre-decomposition flow.
 */
export function EditModalSaleSuccess({
  success,
  onClose,
  onSaleSuccessDismiss,
}: {
  success: SaleSuccessSnapshot;
  onClose: () => void;
  onSaleSuccessDismiss?: (unitId: string) => void;
}) {
  const successRows = [
    { label: "Njësia", value: success.unitId },
    { label: "Blerësi", value: success.buyerName || "—" },
    { label: "Çmimi final", value: formatEuroCompact(success.finalPrice) },
    { label: "Lloji i pagesës", value: success.paymentType },
    { label: "Data e shitjes", value: formatAlbanianDate(success.saleDate) },
  ];

  return (
    <motion.div
      key="sale-success"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
      className="flex flex-col items-center py-3"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.25 }}
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "rgba(60,122,87,0.1)" }}
        aria-hidden="true"
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <motion.path
            d="M7 14.5L12 19.5L21 9.5"
            stroke="#3c7a57"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, delay: 0.35, ease: "easeOut" }}
          />
        </svg>
      </motion.div>

      <p className="mt-4 text-[16px] font-semibold tracking-[-0.02em] text-black/90">
        Shitja u regjistrua me sukses
      </p>

      <div className="mt-5 w-full">
        <div className="h-px w-full bg-[#edf0f4]" />
        <motion.ul
          initial="hidden"
          animate="visible"
          transition={{ delayChildren: 0.35, staggerChildren: 0.06 }}
          variants={{ hidden: {}, visible: {} }}
          className="flex flex-col"
        >
          {successRows.map((row, index) => (
            <motion.li
              key={row.label}
              variants={{
                hidden: { opacity: 0, x: -8 },
                visible: { opacity: 1, x: 0 },
              }}
              className={`flex items-center justify-between px-1 py-3 ${
                index < successRows.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <span className="text-xs uppercase tracking-wider text-gray-400">
                {row.label}
              </span>
              <span className="text-sm font-medium text-gray-900">{row.value}</span>
            </motion.li>
          ))}
        </motion.ul>
        <div className="h-px w-full bg-[#edf0f4]" />
      </div>

      <div className="mt-6 flex w-full justify-end">
        <button
          onClick={() => {
            onSaleSuccessDismiss?.(success.unitRecordId);
            onClose();
          }}
          className="rounded-[11px] px-5 py-2 text-[13px] text-white transition hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          Mbyll
        </button>
      </div>
    </motion.div>
  );
}
