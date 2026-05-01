import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, CheckCircle2, ChevronDown, Plus, RotateCcw, Trash2, XCircle } from "lucide-react";
import type { CRMShowing, ShowingStatus } from "../hooks/useCRM";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { Card } from "./primitives";
import { fmtDate, fmtDateTime, NAVY, SOFT_EASE } from "./shared";
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

type ShowingPipelineFilter =
  | "all"
  | "planned"
  | "completed"
  | "reserved"
  | "sold"
  | "archive";

export function ShowingsSection({
  showings,
  onAdd,
  onUpdateStatus,
  onArchive,
  onRestore,
  onDelete,
  onEdit,
  onExtendReservation,
  onReleaseReservation,
}: {
  showings: CRMShowing[];
  onAdd: () => void;
  onUpdateStatus: (id: string, status: ShowingStatus) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => Promise<{ error?: string }>;
  onDelete: (id: string) => void;
  onEdit: (showing: CRMShowing) => void;
  onExtendReservation?: (showing: CRMShowing) => void;
  onReleaseReservation?: (showing: CRMShowing) => void;
}) {
  const [showingFilter, setShowingFilter] =
    useState<ShowingPipelineFilter>("all");
  const activeShowings = showings.filter((showing) => !showing.archived_at);
  const archivedShowings = showings
    .filter((showing) => showing.archived_at)
    .sort((a, b) => {
      const aArchived = a.archived_at ? new Date(a.archived_at).getTime() : 0;
      const bArchived = b.archived_at ? new Date(b.archived_at).getTime() : 0;
      return bArchived - aArchived;
    });
  const isArchiveView = showingFilter === "archive";
  const plannedCount = activeShowings.filter(
    (showing) => showing.status === "E planifikuar",
  ).length;
  const reservedCount = activeShowings.filter(isReservedShowing).length;
  const soldCount = activeShowings.filter(isSoldShowing).length;
  const completedCount = activeShowings.filter(isCompletedShowing).length;
  const showingScopedShowings =
    showingFilter === "archive"
      ? archivedShowings
      : showingFilter === "planned"
        ? activeShowings.filter(
            (showing) => showing.status === "E planifikuar",
          )
      : showingFilter === "completed"
        ? activeShowings.filter(isCompletedShowing)
      : showingFilter === "reserved"
        ? activeShowings.filter(isReservedShowing)
      : showingFilter === "sold"
        ? activeShowings.filter(isSoldShowing)
        : activeShowings;
  const visibleShowings = isArchiveView
    ? archivedShowings
    : [...showingScopedShowings].sort((a, b) =>
        compareShowingsForPipelineView(a, b, showingFilter),
      );
  const showingFilterMeta = getShowingFilterMeta(showingFilter);
  const showingListEmptyMeta = getShowingListEmptyMeta(showingFilter);

  function ShowingRow({ showing }: { showing: CRMShowing }) {
    const [actionError, setActionError] = useState("");
    const [isReservationOpen, setIsReservationOpen] = useState(false);
    const statusMeta = getShowingPipelineMeta(showing);
    const reservationMeta = showing.latest_reservation ?? showing.active_reservation ?? null;
    const isActiveReservation = reservationMeta?.status === "Aktive";
    const isArchived = Boolean(showing.archived_at);
    const isSold = isSoldShowing(showing);
    const isReserved = !isSold && isReservedShowing(showing);
    const canToggleReservation = Boolean(reservationMeta);
    const hasLinkedHistory = Boolean(reservationMeta || showing.outcome === "Bleu");
    const canArchive =
      !isArchived &&
      !isActiveReservation &&
      (showing.status === "E kryer" || showing.status === "E anuluar");
    const canDelete = !isArchived && !hasLinkedHistory;
    const reservationTone = getReservationTone(reservationMeta?.status ?? null);

    const handleRestore = async () => {
      setActionError("");
      const result = await onRestore(showing.id);
      if (result.error) setActionError(result.error);
    };

    const toggleReservationDetails = () => {
      if (!canToggleReservation) return;
      setIsReservationOpen((open) => !open);
    };

    return (
      <div className="flex items-start justify-between gap-3 border-b border-[#f0f0f2] px-4 py-3.5 last:border-0">
        <div className="min-w-0 flex-1">
          <div
            role={canToggleReservation ? "button" : undefined}
            tabIndex={canToggleReservation ? 0 : undefined}
            onClick={toggleReservationDetails}
            onKeyDown={(event) => {
              if (!canToggleReservation) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleReservationDetails();
              }
            }}
            className={
              canToggleReservation
                ? "cursor-pointer rounded-[12px] outline-none transition hover:bg-black/[0.015] focus-visible:ring-2 focus-visible:ring-[#dbe5f8]"
                : ""
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-black/80">{showing.lead_name}</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={showing.status}
                  initial={{ opacity: 0.74, scale: 0.985, y: 1 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0.74, scale: 0.99, y: -1 }}
                  transition={{ duration: 0.18, ease: SOFT_EASE }}
                  className="rounded-full border border-white/70 px-2.5 py-0.5 text-[10.5px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                  style={{ background: statusMeta.bg, color: statusMeta.color }}
                >
                  {statusMeta.label}
                </motion.span>
              </AnimatePresence>
              {isReserved && (
                <span className="rounded-full border border-[#eadfbd] bg-[#fff8e8] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#b0892f] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  E rezervuar
                </span>
              )}
              {isSold && (
                <span className="rounded-full border border-[#d6e8dc] bg-[#edf7f1] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#3c7a57] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  E shitur
                </span>
              )}
              {isArchived && (
                <span className="rounded-full border border-[#dbe5f8] bg-[#f4f7fd] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#003883] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  Arkivuar
                </span>
              )}
              {reservationMeta && (
                <span
                  aria-hidden="true"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#e8ebf1] bg-white text-black/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                >
                  <motion.span
                    animate={{ rotate: isReservationOpen ? 180 : 0 }}
                    transition={{ duration: 0.18, ease: SOFT_EASE }}
                    className="flex"
                  >
                    <ChevronDown size={12} strokeWidth={2.2} />
                  </motion.span>
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11.5px] text-black/45">
              {showing.unit_id} · {fmtDateTime(showing.scheduled_at)}
            </p>
            {showing.notes && <p className="mt-0.5 text-[11.5px] text-black/35">{showing.notes}</p>}
            {isArchived && (
              <p className="mt-1 text-[11.5px] text-black/35">
                Arkivuar më {fmtDate(showing.archived_at!)}
                {showing.archive_reason ? ` · ${showing.archive_reason}` : ""}
              </p>
            )}
          </div>
          {actionError && (
            <p className="mt-2 rounded-[10px] border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11.5px] text-red-600">
              {actionError}
            </p>
          )}
          <AnimatePresence initial={false}>
            {reservationMeta && isReservationOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -4 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: SOFT_EASE }}
                className="overflow-hidden"
              >
                <div
                  className="mt-2.5 rounded-[14px] border px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
                  style={{
                    borderColor: reservationTone.border,
                    background: reservationTone.bg,
                  }}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                      style={{
                        borderColor: reservationTone.badgeBorder,
                        background: reservationTone.badgeBg,
                        color: reservationTone.badgeText,
                      }}
                    >
                      {reservationTone.label}
                    </span>
                    <span className="text-[11.5px] text-black/38">
                      Përditësuar më {fmtDate(reservationMeta.updated_at)}
                    </span>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                        Rezervuar më
                      </p>
                      <p className="mt-1 text-[12.5px] font-medium text-black/68">
                        {fmtDate(reservationMeta.reserved_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                        {reservationTone.secondaryLabel}
                      </p>
                      <p className="mt-1 text-[12.5px] font-medium text-black/68">
                        {getReservationSecondaryValue(reservationMeta)}
                      </p>
                    </div>
                  </div>
                  {reservationMeta.notes && (
                    <div className="mt-2.5 border-t border-black/[0.06] pt-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                        {isActiveReservation ? "Shënimi i rezervimit" : "Shënimi i fundit"}
                      </p>
                      <p className="mt-1 text-[11.5px] leading-5 text-black/44">
                        {reservationMeta.notes}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 items-start gap-1.5 pt-0.5">
          {isArchived ? (
            <button
              onClick={handleRestore}
              className="flex h-7 items-center gap-1.5 rounded-[8px] border border-[#dbe5f8] bg-white px-2.5 text-[11px] font-semibold text-[#003883] transition hover:bg-[#f6f8fd]"
            >
              <RotateCcw size={12} />
              Rikthe
            </button>
          ) : (
            <>
              {isActiveReservation && onExtendReservation && (
                <button
                  onClick={() => onExtendReservation(showing)}
                  className="rounded-[8px] border border-[#dce4f3] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#003883] transition hover:bg-[#f6f8fd]"
                >
                  Zgjat
                </button>
              )}
              {isActiveReservation && onReleaseReservation && (
                <button
                  onClick={() => onReleaseReservation(showing)}
                  className="rounded-[8px] border border-[#ecd6d6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#8e4a4a] transition hover:bg-[#fff8f8]"
                >
                  Liro
                </button>
              )}
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
              {canArchive && (
                <button
                  onClick={() => onArchive(showing.id)}
                  className="flex h-7 items-center gap-1.5 rounded-[8px] border border-[#dbe5f8] bg-white px-2.5 text-[11px] font-semibold text-[#003883] transition hover:bg-[#f6f8fd]"
                >
                  <Archive size={12} />
                  Arkivo
                </button>
              )}
              <button
                onClick={() => onEdit(showing)}
                className="rounded-[8px] border border-[#e8e8ec] bg-white px-2.5 py-1 text-[11px] text-black/40 transition hover:border-[#003883] hover:text-[#003883]"
              >
                Ndrysho
              </button>
              {canDelete && (
                <button
                  onClick={() => onDelete(showing.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-red-100 bg-white text-red-400 transition hover:bg-red-50"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardSectionHeader
        title="Shfaqjet"
        subtitle={`${activeShowings.length} shfaqje · ${plannedCount} të planifikuara`}
        className="px-5 py-4"
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

      <div className="space-y-4 px-5 py-5">
        <div className="grid gap-2.5 md:grid-cols-4">
          <ShowingPipelineSummaryCard
            label="Të planifikuara"
            value={plannedCount}
            tone="planned"
          />
          <ShowingPipelineSummaryCard
            label="Të kryera"
            value={completedCount}
            tone="completed"
          />
          <ShowingPipelineSummaryCard
            label="Të rezervuara"
            value={reservedCount}
            tone="reserved"
          />
          <ShowingPipelineSummaryCard
            label="Të shitura"
            value={soldCount}
            tone="sold"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#edf0f4] bg-[#fcfcfd] px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
              Filtri i shfaqjeve
            </p>
            <p className="mt-1 text-[12px] text-black/42">
              {showingFilterMeta.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                key: "all" as const,
                label: "Të gjitha",
                count: activeShowings.length,
              },
              {
                key: "planned" as const,
                label: "Të planifikuara",
                count: plannedCount,
              },
              {
                key: "completed" as const,
                label: "Të kryera",
                count: completedCount,
              },
              {
                key: "reserved" as const,
                label: "Të rezervuara",
                count: reservedCount,
              },
              {
                key: "sold" as const,
                label: "Të shitura",
                count: soldCount,
              },
              {
                key: "archive" as const,
                label: "Arkivi",
                count: archivedShowings.length,
              },
            ].map((option) => {
              const isActive = showingFilter === option.key;
              return (
                <motion.button
                  key={option.key}
                  layout
                  type="button"
                  onClick={() => setShowingFilter(option.key)}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.18, ease: SOFT_EASE }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition ${
                    isActive
                      ? "border-[#dbe5f8] bg-[#f4f7fd] text-[#003883]"
                      : "border-[#e8ebf1] bg-white text-black/46 hover:border-[#dbe5f8] hover:text-[#003883]"
                  }`}
                >
                  <span>{option.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-[1px] text-[10px] font-semibold ${
                      isActive ? "bg-white text-[#003883]" : "bg-[#f5f7fb] text-black/38"
                    }`}
                  >
                    {option.count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={showingFilter}
            initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
            transition={{ duration: 0.18, ease: SOFT_EASE }}
          >
            {isArchiveView ? (
              <Card className="overflow-hidden p-0">
                <CardSectionHeader
                  title="Arkivi"
                  subtitle={`${archivedShowings.length} shfaqje`}
                  className="px-4 py-3"
                />
                {archivedShowings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                    <p className="text-[12.5px] font-medium text-black/42">
                      Nuk ka shfaqje të arkivuara
                    </p>
                    <p className="mt-1 text-[11.5px] text-black/30">
                      Shfaqjet e arkivuara ruhen këtu pa humbur lidhjet historike.
                    </p>
                  </div>
                ) : (
                  <div className="flex h-[360px] min-h-[360px] flex-col overflow-y-auto overscroll-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0">
                    {archivedShowings.map((showing) => (
                      <ShowingRow key={showing.id} showing={showing} />
                    ))}
                  </div>
                )}
              </Card>
            ) : (
              <Card className="overflow-hidden p-0">
                <CardSectionHeader
                  title="Lista e shfaqjeve"
                  subtitle={`${visibleShowings.length} shfaqje`}
                  className="px-4 py-3"
                />
                {visibleShowings.length === 0 ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
                    <p className="text-[12.5px] font-medium text-black/42">
                      {showingListEmptyMeta.title}
                    </p>
                    <p className="mt-1 text-[11.5px] text-black/30">
                      {showingListEmptyMeta.description}
                    </p>
                  </div>
                ) : (
                  <div className="flex h-[360px] min-h-[360px] flex-col overflow-y-auto overscroll-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0">
                    {visibleShowings.map((showing) => (
                      <ShowingRow key={showing.id} showing={showing} />
                    ))}
                  </div>
                )}
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}

function getReservationTone(status: string | null) {
  if (status === "Aktive") {
    return {
      label: "Rezervim aktiv",
      secondaryLabel: "Skadon më",
      bg: "#fffdf8",
      border: "#efe6c8",
      badgeBg: "#fff8e8",
      badgeBorder: "#eadfbd",
      badgeText: "#b0892f",
    };
  }
  if (status === "E konvertuar") {
    return {
      label: "Rezervim i konvertuar",
      secondaryLabel: "Konvertuar më",
      bg: "#f7fbf8",
      border: "#dcebdd",
      badgeBg: "#edf7f1",
      badgeBorder: "#d6e8dc",
      badgeText: "#3c7a57",
    };
  }
  if (status === "E anuluar") {
    return {
      label: "Rezervim i anuluar",
      secondaryLabel: "Anuluar më",
      bg: "#fff9f9",
      border: "#f0dddd",
      badgeBg: "#fbeeee",
      badgeBorder: "#ecd6d6",
      badgeText: "#8e4a4a",
    };
  }
  if (status === "E skaduar") {
    return {
      label: "Rezervim i skaduar",
      secondaryLabel: "Skadoi më",
      bg: "#fffafa",
      border: "#f1dddd",
      badgeBg: "#fbeeee",
      badgeBorder: "#ecd6d6",
      badgeText: "#b14b4b",
    };
  }
  return {
    label: "Rezervim",
    secondaryLabel: "Përditësuar më",
    bg: "#fbfcfe",
    border: "#e7ebf2",
    badgeBg: "#f5f7fb",
    badgeBorder: "#e2e6ee",
    badgeText: "rgba(0,0,0,0.52)",
  };
}

function getReservationSecondaryValue(reservation: NonNullable<CRMShowing["latest_reservation"]>) {
  if (reservation.status === "Aktive") {
    return reservation.expires_at ? fmtDate(reservation.expires_at) : "Pa afat të regjistruar";
  }
  if (reservation.status === "E skaduar" && reservation.expires_at) {
    return fmtDate(reservation.expires_at);
  }
  return fmtDate(reservation.updated_at);
}

function ShowingPipelineSummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "planned" | "completed" | "reserved" | "sold";
}) {
  const toneStyle = (() => {
    if (tone === "planned") {
      return {
        border: "#dbe5f8",
        background: "#f4f7fd",
        value: NAVY,
      };
    }
    if (tone === "completed") {
      return {
        border: "#e7ebf2",
        background: "#fbfcfe",
        value: "rgba(0,0,0,0.56)",
      };
    }
    if (tone === "reserved") {
      return {
        border: "#efe6c8",
        background: "#fffdf8",
        value: "#b0892f",
      };
    }
    if (tone === "sold") {
      return {
        border: "#d6e8dc",
        background: "#f7fbf8",
        value: "#2f6b4f",
      };
    }
    return {
      border: "#e7ebf2",
      background: "#fbfcfe",
      value: NAVY,
    };
  })();

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 10px 22px rgba(16,24,40,0.06)" }}
      transition={{ duration: 0.18, ease: SOFT_EASE }}
      className="rounded-[14px] border px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
      style={{
        borderColor: toneStyle.border,
        background: toneStyle.background,
      }}
    >
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-black/28">
        {label}
      </p>
      <p
        className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.04em]"
        style={{ color: toneStyle.value }}
      >
        {value}
      </p>
    </motion.div>
  );
}

function isReservedShowing(showing: CRMShowing) {
  return (
    !isSoldShowing(showing) &&
    (showing.outcome === "Rezervoi" || Boolean(showing.active_reservation))
  );
}

function isSoldShowing(showing: CRMShowing) {
  return showing.outcome === "Bleu";
}

function isCompletedShowing(showing: CRMShowing) {
  return (
    showing.status === "E kryer" &&
    !isReservedShowing(showing) &&
    !isSoldShowing(showing)
  );
}

function getShowingPipelineMeta(showing: CRMShowing) {
  return {
    label: showing.status,
    ...SHOWING_STYLE[showing.status],
  };
}

function compareShowingsForPipelineView(
  a: CRMShowing,
  b: CRMShowing,
  filter: ShowingPipelineFilter,
) {
  if (filter === "planned") {
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  }

  if (filter === "reserved") {
    const aExpiry = a.active_reservation?.expires_at
      ? new Date(a.active_reservation.expires_at).getTime()
      : Number.POSITIVE_INFINITY;
    const bExpiry = b.active_reservation?.expires_at
      ? new Date(b.active_reservation.expires_at).getTime()
      : Number.POSITIVE_INFINITY;
    if (aExpiry !== bExpiry) return aExpiry - bExpiry;
    return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
  }

  if (filter === "completed" || filter === "sold") {
    return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
  }

  if (a.status === "E planifikuar" && b.status === "E planifikuar") {
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  }

  return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
}

function getShowingFilterMeta(filter: ShowingPipelineFilter) {
  if (filter === "planned") {
    return {
      description:
        "Po shfaqen vetëm vizitat e planifikuara, të renditura sipas datës së afërt.",
    };
  }
  if (filter === "completed") {
    return {
      description:
        "Po shfaqen vetëm vizitat e kryera pa rezultat rezervimi ose shitjeje.",
    };
  }
  if (filter === "reserved") {
    return {
      description:
        "Po shfaqen shfaqjet që kanë krijuar rezervim dhe lidhen me afatet e njësive.",
    };
  }
  if (filter === "sold") {
    return {
      description:
        "Po shfaqen shfaqjet që janë konvertuar në shitje.",
    };
  }
  if (filter === "archive") {
    return {
      description:
        "Po shfaqen shfaqjet e arkivuara. Ato ruhen si histori dhe mund të rikthehen kur duhet.",
    };
  }
  return {
    description:
      "Filtroni shfaqjet sipas fazës: planifikuar, kryer, rezervuar ose shitur.",
  };
}

function getShowingListEmptyMeta(filter: ShowingPipelineFilter) {
  if (filter === "planned") {
    return {
      title: "Nuk ka shfaqje të planifikuara",
      description: "Vizitat e planifikuara do të shfaqen këtu sapo të regjistrohen.",
    };
  }
  if (filter === "completed") {
    return {
      title: "Nuk ka shfaqje të kryera",
      description: "Vizitat e kryera pa rezervim ose shitje do të renditen këtu.",
    };
  }
  if (filter === "reserved") {
    return {
      title: "Nuk ka shfaqje të rezervuara",
      description: "Rezervimet e krijuara nga CRM do të shfaqen këtu dhe në afatet e njësive.",
    };
  }
  if (filter === "sold") {
    return {
      title: "Nuk ka shfaqje të shitura",
      description: "Shitjet e krijuara nga shfaqjet do të renditen këtu.",
    };
  }
  return {
    title: "Nuk ka shfaqje të regjistruara",
    description: "Shfaqjet e reja do të renditen këtu sapo të planifikohen.",
  };
}
