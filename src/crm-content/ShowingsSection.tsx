import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, CheckCircle2, Plus, RotateCcw, Trash2, XCircle } from "lucide-react";
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

type ReservationActivityFilter = "all" | "active" | "closed" | "archive";

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
  const [reservationFilter, setReservationFilter] =
    useState<ReservationActivityFilter>("all");
  const now = new Date();
  const activeShowings = showings.filter((showing) => !showing.archived_at);
  const archivedShowings = showings
    .filter((showing) => showing.archived_at)
    .sort((a, b) => {
      const aArchived = a.archived_at ? new Date(a.archived_at).getTime() : 0;
      const bArchived = b.archived_at ? new Date(b.archived_at).getTime() : 0;
      return bArchived - aArchived;
    });
  const isArchiveView = reservationFilter === "archive";
  const activeReservationCount = activeShowings.filter((showing) => showing.active_reservation).length;
  const expiringSoonCount = activeShowings.filter((showing) => {
    const expiresAt = showing.active_reservation?.expires_at;
    if (!expiresAt) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(expiresAt).getTime() - now.getTime()) / 86400000,
    );
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  }).length;
  const closedReservationCount = activeShowings.filter(
    (showing) =>
      showing.latest_reservation &&
      showing.latest_reservation.status !== "Aktive",
  ).length;
  const recentlyClosedCount = activeShowings.filter((showing) => {
    const reservation = showing.latest_reservation;
    if (!reservation || reservation.status === "Aktive") return false;
    const daysSinceUpdate = Math.floor(
      (now.getTime() - new Date(reservation.updated_at).getTime()) / 86400000,
    );
    return daysSinceUpdate >= 0 && daysSinceUpdate <= 14;
  }).length;
  const reservationScopedShowings =
    reservationFilter === "archive"
      ? archivedShowings
      : reservationFilter === "active"
        ? activeShowings.filter((showing) => showing.active_reservation)
        : reservationFilter === "closed"
        ? activeShowings.filter(
            (showing) =>
              showing.latest_reservation &&
              showing.latest_reservation.status !== "Aktive",
          )
        : activeShowings;
  const upcoming = isArchiveView ? [] : reservationScopedShowings
    .filter(
      (showing) =>
        showing.status === "E planifikuar" &&
        new Date(showing.scheduled_at) >= now,
    )
    .sort((a, b) => compareShowingsForReservationView(a, b, reservationFilter));
  const past = isArchiveView ? archivedShowings : reservationScopedShowings
    .filter(
      (showing) =>
        isArchiveView ||
        showing.status !== "E planifikuar" ||
        new Date(showing.scheduled_at) < now,
    )
    .sort((a, b) => compareShowingsForReservationView(a, b, reservationFilter));
  const reservationFilterMeta = getReservationFilterMeta(reservationFilter);

  function ShowingRow({ showing }: { showing: CRMShowing }) {
    const [actionError, setActionError] = useState("");
    const statusStyle = SHOWING_STYLE[showing.status];
    const reservationMeta = showing.latest_reservation ?? showing.active_reservation ?? null;
    const isActiveReservation = reservationMeta?.status === "Aktive";
    const isArchived = Boolean(showing.archived_at);
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

    return (
      <div className="flex items-start justify-between gap-3 border-b border-[#f0f0f2] px-4 py-3.5 last:border-0">
        <div className="min-w-0 flex-1">
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
                style={{ background: statusStyle.bg, color: statusStyle.color }}
              >
                {showing.status}
              </motion.span>
            </AnimatePresence>
            {reservationMeta && isActiveReservation && (
              <span className="rounded-full border border-[#eadfbd] bg-[#fff8e8] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#b0892f] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                Rezervim aktiv
              </span>
            )}
            {isArchived && (
              <span className="rounded-full border border-[#dbe5f8] bg-[#f4f7fd] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#003883] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                Arkivuar
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
          {actionError && (
            <p className="mt-2 rounded-[10px] border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11.5px] text-red-600">
              {actionError}
            </p>
          )}
          {reservationMeta && (
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
          )}
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
    <div>
      <CardSectionHeader
        title="Shfaqjet"
        subtitle={
          activeReservationCount > 0
            ? `${activeShowings.length} aktive · ${activeReservationCount} me rezervim aktiv`
            : `${activeShowings.length} aktive`
        }
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

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <ReservationSummaryCard
          label="Rezervime aktive"
          value={activeReservationCount}
          detail="me afat të hapur tani"
          tone="active"
        />
        <ReservationSummaryCard
          label="Skadojnë shpejt"
          value={expiringSoonCount}
          detail="brenda 7 ditëve"
          tone="urgent"
        />
        <ReservationSummaryCard
          label="Të mbyllura së fundmi"
          value={recentlyClosedCount}
          detail={`${closedReservationCount} gjithsej të mbyllura`}
          tone="neutral"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#edf0f4] bg-[#fcfcfd] px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
            Filtri i rezervimeve
          </p>
          <p className="mt-1 text-[12px] text-black/42">
            {reservationFilterMeta.description}
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
              key: "active" as const,
              label: "Aktive",
              count: activeReservationCount,
            },
            {
              key: "closed" as const,
              label: "Të mbyllura",
              count: closedReservationCount,
            },
            {
              key: "archive" as const,
              label: "Arkivi",
              count: archivedShowings.length,
            },
          ].map((option) => {
            const isActive = reservationFilter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setReservationFilter(option.key)}
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
              </button>
            );
          })}
        </div>
      </div>

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
      <div className="grid grid-cols-2 gap-4">
        <Card className="overflow-hidden p-0">
          <CardSectionHeader
            title="Të planifikuara"
            subtitle={`${upcoming.length} shfaqje`}
            className="px-4 py-3"
          />
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <p className="text-[12.5px] font-medium text-black/42">
                Nuk ka shfaqje të planifikuara për momentin
              </p>
              <p className="mt-1 text-[11.5px] text-black/30">
                Shfaqjet e reja do të renditen këtu sapo të planifikohen.
              </p>
            </div>
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
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <p className="text-[12.5px] font-medium text-black/42">
                Ende nuk ka shfaqje të mbyllura
              </p>
              <p className="mt-1 text-[11.5px] text-black/30">
                Shfaqjet e kryera dhe të anuluara ruhen këtu.
              </p>
            </div>
          ) : (
            <div className="flex h-[320px] min-h-[320px] flex-col overflow-y-auto overscroll-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0">
              {past.map((showing) => (
                <ShowingRow key={showing.id} showing={showing} />
              ))}
            </div>
          )}
        </Card>
      </div>
      )}
    </div>
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

function ReservationSummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "active" | "urgent" | "neutral";
}) {
  const toneStyle =
    tone === "active"
      ? {
          border: "#efe6c8",
          background: "#fffdf8",
          value: "#b0892f",
        }
      : tone === "urgent"
        ? {
            border: "#f1dddd",
            background: "#fffafa",
            value: "#b14b4b",
          }
        : {
            border: "#e7ebf2",
            background: "#fbfcfe",
            value: NAVY,
          };

  return (
    <div
      className="rounded-[16px] border px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
      style={{
        borderColor: toneStyle.border,
        background: toneStyle.background,
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
        {label}
      </p>
      <p
        className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.04em]"
        style={{ color: toneStyle.value }}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] text-black/38">{detail}</p>
    </div>
  );
}

function compareShowingsForReservationView(
  a: CRMShowing,
  b: CRMShowing,
  filter: ReservationActivityFilter,
) {
  if (filter === "active") {
    const aExpiry = a.active_reservation?.expires_at
      ? new Date(a.active_reservation.expires_at).getTime()
      : Number.POSITIVE_INFINITY;
    const bExpiry = b.active_reservation?.expires_at
      ? new Date(b.active_reservation.expires_at).getTime()
      : Number.POSITIVE_INFINITY;
    if (aExpiry !== bExpiry) return aExpiry - bExpiry;
    return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
  }

  if (filter === "closed") {
    const aUpdated = a.latest_reservation?.updated_at
      ? new Date(a.latest_reservation.updated_at).getTime()
      : 0;
    const bUpdated = b.latest_reservation?.updated_at
      ? new Date(b.latest_reservation.updated_at).getTime()
      : 0;
    if (aUpdated !== bUpdated) return bUpdated - aUpdated;
    return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
  }

  if (a.status === "E planifikuar" && b.status === "E planifikuar") {
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  }

  return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
}

function getReservationFilterMeta(filter: ReservationActivityFilter) {
  if (filter === "active") {
    return {
      description:
        "Po shfaqen vetëm shfaqjet me rezervim aktiv, të renditura sipas afatit të skadimit.",
    };
  }
  if (filter === "closed") {
    return {
      description:
        "Po shfaqen vetëm shfaqjet me rezervim të mbyllur, të renditura sipas përditësimit më të fundit.",
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
      "Filtroni shfaqjet sipas aktivitetit të rezervimit për të kaluar më shpejt në rastet operative.",
  };
}
