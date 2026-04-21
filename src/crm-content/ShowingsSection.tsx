import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import type { CRMShowing, ShowingStatus } from "../hooks/useCRM";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { Card } from "./primitives";
import { fmtDateTime, NAVY, SOFT_EASE } from "./shared";
import { SHOWING_STYLE } from "./showings/shared";

export { ShowingModal } from "./showings/ShowingModal";
export type {
  ShowingOutcomeValue,
  ShowingPaymentType,
  ShowingSaleCompletionInput,
  ShowingSaleDraft,
  ShowingSaleToast,
  ShowingSaveResult,
} from "./showings/shared";

export function ShowingsSection({
  showings,
  onAdd,
  onUpdateStatus,
  onDelete,
  onEdit,
}: {
  showings: CRMShowing[];
  onAdd: () => void;
  onUpdateStatus: (id: string, status: ShowingStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (showing: CRMShowing) => void;
}) {
  const now = new Date();
  const upcoming = showings
    .filter((showing) => showing.status === "E planifikuar" && new Date(showing.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const past = showings
    .filter((showing) => showing.status !== "E planifikuar" || new Date(showing.scheduled_at) < now)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  function ShowingRow({ showing }: { showing: CRMShowing }) {
    const statusStyle = SHOWING_STYLE[showing.status];

    return (
      <div className="flex items-start justify-between gap-3 border-b border-[#f0f0f2] px-4 py-3 last:border-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-black/80">{showing.lead_name}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={showing.status}
                initial={{ opacity: 0.74, scale: 0.985, y: 1 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0.74, scale: 0.99, y: -1 }}
                transition={{ duration: 0.18, ease: SOFT_EASE }}
                className="rounded-full border border-white/70 px-2.5 py-0.5 text-[10.5px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                style={{ background: statusStyle.bg, color: statusStyle.color }}
              >
                {showing.status}
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="mt-0.5 text-[11.5px] text-black/45">
            {showing.unit_id} · {fmtDateTime(showing.scheduled_at)}
          </p>
          {showing.notes && <p className="mt-0.5 text-[11.5px] text-black/35">{showing.notes}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {showing.status === "E planifikuar" && (
            <>
              <button
                onClick={() => onUpdateStatus(showing.id, "E kryer")}
                title="Shëno si të kryer"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#e8e8ec] bg-white transition hover:border-[#3c7a57] hover:text-[#3c7a57]"
              >
                <CheckCircle2 size={13} />
              </button>
              <button
                onClick={() => onUpdateStatus(showing.id, "E anuluar")}
                title="Shëno si të anuluar"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#e8e8ec] bg-white transition hover:border-[#b14b4b] hover:text-[#b14b4b]"
              >
                <XCircle size={13} />
              </button>
            </>
          )}
          <button
            onClick={() => onEdit(showing)}
            className="rounded-[8px] border border-[#e8e8ec] bg-white px-2.5 py-1 text-[11px] text-black/40 transition hover:border-[#003883] hover:text-[#003883]"
          >
            Ndrysho
          </button>
          <button
            onClick={() => onDelete(showing.id)}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-red-100 bg-white text-red-400 transition hover:bg-red-50"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <CardSectionHeader
        title="Shfaqjet"
        subtitle={`${showings.length} gjithsej`}
        className="mb-5 border-b-0 px-0 py-0"
        right={
          <button
            onClick={onAdd}
            className="flex h-[38px] items-center gap-2 rounded-[11px] px-4 text-[13px] text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Plus size={14} strokeWidth={2.2} />
            Shto shfaqje
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <Card className="overflow-hidden p-0">
          <CardSectionHeader
            title="Të planifikuara"
            subtitle={`${upcoming.length} shfaqje`}
            className="px-4 py-3"
          />
          {upcoming.length === 0 ? (
            <div className="py-9 text-center text-[12.5px] text-black/30">Asnjë shfaqje e planifikuar</div>
          ) : (
            <div className="flex h-[320px] min-h-[320px] flex-col overflow-y-auto overscroll-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0">
              {upcoming.map((showing) => (
                <ShowingRow key={showing.id} showing={showing} />
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <CardSectionHeader
            title="Të kryera dhe të anuluara"
            subtitle={`${past.length} shfaqje`}
            className="px-4 py-3"
          />
          {past.length === 0 ? (
            <div className="py-9 text-center text-[12.5px] text-black/30">Asnjë shfaqje e regjistruar</div>
          ) : (
            <div className="flex h-[320px] min-h-[320px] flex-col overflow-y-auto overscroll-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0">
              {past.map((showing) => (
                <ShowingRow key={showing.id} showing={showing} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
