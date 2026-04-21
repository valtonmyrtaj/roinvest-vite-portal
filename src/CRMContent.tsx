import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUnits } from "./hooks/useUnits";
import {
  completeShowingSale,
  useCRM,
  type CRMShowing,
  type CreateShowingInput,
} from "./hooks/useCRM";
import { formatEuro as formatEuroCompact } from "./lib/formatCurrency";
import { ActivityTimeline } from "./crm-content/ActivityTimeline";
import { ConfirmDeleteModal } from "./crm-content/ConfirmDeleteModal";
import { DailyLogSection } from "./crm-content/DailyLogSection";
import {
  ShowingModal,
  ShowingsSection,
  type ShowingSaleCompletionInput,
  type ShowingSaveResult,
  type ShowingSaleToast,
} from "./crm-content/ShowingsSection";
import { PageHeader } from "./components/ui/PageHeader";
import { SOFT_EASE, sectionMotion } from "./crm-content/shared";
import "./crm-content/dailyDateSync";
import { PAGE_BG } from "./ui/tokens";
import { SkeletonRows } from "./components/SkeletonRows";

export default function CRMContent() {
  const {
    leads,
    showings,
    showingsLoading,
    dailyLog,
    dailyLogLoading,
    createShowing,
    updateShowing,
    deleteShowing,
    createDailyEntry,
    updateDailyEntry,
    deleteDailyEntry,
    fetchLeads,
    fetchShowings,
  } = useCRM();
  const { units, fetchUnits } = useUnits();

  const [showAddShowing, setShowAddShowing] = useState(false);
  const [editShowing, setEditShowing] = useState<CRMShowing | null>(null);
  const [deletingShowingId, setDeletingShowingId] = useState<string | null>(null);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [saleToast, setSaleToast] = useState<ShowingSaleToast | null>(null);

  const unitIds = units.map((unit) => unit.unit_id);

  useEffect(() => {
    if (!saleToast) return;
    const timeout = window.setTimeout(() => setSaleToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [saleToast]);

  const handleCreateShowing = async (data: CreateShowingInput): Promise<ShowingSaveResult> => {
    const result = await createShowing(data);
    if (result.error) {
      throw new Error(result.error);
    }

    if (data.outcome === "Bleu" && result.data) {
      const manualLeadName = data.manual_contact
        ? `${data.manual_contact.first_name} ${data.manual_contact.last_name}`.trim()
        : "";

      return {
        nextStep: "sale",
        draft: {
          showingId: result.data.id,
          unitId: result.data.unit_id,
          leadId: result.data.contact_id ?? data.lead_id ?? null,
          leadName:
            result.data.lead_name ||
            manualLeadName ||
            leads.find((lead) => lead.id === (data.lead_id ?? ""))?.name ||
            "",
          saleDate: result.data.date,
          notes: result.data.notes ?? null,
        },
      };
    }

    return { nextStep: "none" };
  };

  const handleEditShowing = async (data: CreateShowingInput): Promise<ShowingSaveResult> => {
    if (!editShowing) {
      return { nextStep: "none" };
    }

    const result = await updateShowing(editShowing.id, data);
    if (result.error) {
      throw new Error(result.error);
    }

    if (data.outcome === "Bleu" && result.data) {
      const manualLeadName = data.manual_contact
        ? `${data.manual_contact.first_name} ${data.manual_contact.last_name}`.trim()
        : "";

      return {
        nextStep: "sale",
        draft: {
          showingId: result.data.id,
          unitId: result.data.unit_id,
          leadId: result.data.contact_id ?? data.lead_id ?? null,
          leadName:
            result.data.lead_name ||
            manualLeadName ||
            leads.find((lead) => lead.id === (data.lead_id ?? ""))?.name ||
            "",
          saleDate: result.data.date,
          notes: result.data.notes ?? null,
        },
      };
    }

    return { nextStep: "none" };
  };

  const handleCompleteShowingSale = async (input: ShowingSaleCompletionInput) => {
    const result = await completeShowingSale(input);
    if (result.error) {
      throw new Error(result.error);
    }

    await fetchUnits();
    await fetchLeads();
    await fetchShowings();

    setSaleToast({
      unitId: input.unit_id,
      buyerName: input.buyer_name,
      finalPrice: input.final_price,
      paymentType: input.payment_type,
    });
    setTimelineRefreshKey((value) => value + 1);
  };

  const handleUpdateShowingStatus = async (id: string, status: "E planifikuar" | "E kryer" | "E anuluar") => {
    await updateShowing(id, { status });
  };

  const handleDeleteShowing = async () => {
    if (!deletingShowingId) return;
    await deleteShowing(deletingShowingId);
    setDeletingShowingId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: SOFT_EASE }}
      style={{ background: PAGE_BG }}
    >
      <AnimatePresence>
        {saleToast && (
          <motion.div
            key="crm-sale-toast"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="status"
            aria-live="polite"
            className="fixed left-1/2 top-6 z-[70] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 rounded-lg bg-white px-4 py-3 shadow-lg"
            style={{ borderLeft: "3px solid #003883" }}
          >
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-[2px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(60,122,87,0.12)" }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6.2L4.8 8.5L9.5 3.5"
                    stroke="#3c7a57"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-black/82">
                  Shitja u kompletua — {saleToast.unitId}
                </p>
                <p className="mt-1 text-[12px] text-black/52">
                  Blerësi: {saleToast.buyerName || "—"} · {formatEuroCompact(saleToast.finalPrice)} ·{" "}
                  {saleToast.paymentType}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddShowing && (
          <ShowingModal
            leads={leads}
            unitIds={unitIds}
            onClose={() => setShowAddShowing(false)}
            onSave={handleCreateShowing}
            onCompleteSale={handleCompleteShowingSale}
          />
        )}
        {editShowing && (
          <ShowingModal
            initial={editShowing}
            leads={leads}
            unitIds={unitIds}
            onClose={() => setEditShowing(null)}
            onSave={handleEditShowing}
            onCompleteSale={handleCompleteShowingSale}
          />
        )}
        {deletingShowingId && (
          <ConfirmDeleteModal
            label="këtë shfaqje"
            onClose={() => setDeletingShowingId(null)}
            onConfirm={handleDeleteShowing}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-[1220px] px-10 py-9">
        <motion.div {...sectionMotion()} className="mb-7">
          <PageHeader
            tone="brand"
            title="Aktiviteti CRM"
            subtitle="Monitorimi i aktivitetit ditor, shfaqjeve dhe ndryshimeve të fundit"
            className="mb-0"
          />
        </motion.div>

        <motion.div {...sectionMotion(0.02)} className="mb-7">
          <DailyLogSection
            entries={dailyLog}
            loading={dailyLogLoading}
            onCreate={createDailyEntry}
            onUpdate={updateDailyEntry}
            onDelete={deleteDailyEntry}
          />
        </motion.div>

        <motion.div {...sectionMotion(0.07)} className="mb-7">
          {showingsLoading ? (
            <div className="rounded-[18px] border border-[#e8e8ec] bg-white px-5 py-5" style={{ boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
              <SkeletonRows rows={4} />
            </div>
          ) : (
            <ShowingsSection
              showings={showings}
              onAdd={() => setShowAddShowing(true)}
              onUpdateStatus={handleUpdateShowingStatus}
              onDelete={(id) => setDeletingShowingId(id)}
              onEdit={(showing) => setEditShowing(showing)}
            />
          )}
        </motion.div>

        <motion.div {...sectionMotion(0.12)}>
          <ActivityTimeline refreshKey={timelineRefreshKey} />
        </motion.div>
      </div>
    </motion.div>
  );
}
