import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Clock3, LayoutList, ScrollText, X } from "lucide-react";
import { EyebrowLabel } from "../components/ui/Eyebrow";
import { PillBadge } from "../components/ui/PillBadge";
import { SkeletonRows } from "../components/SkeletonRows";
import type { Unit, UnitHistory } from "../hooks/useUnits";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { formatContactPhone } from "../lib/phoneFormat";
import { getUnitTypeDisplay } from "../lib/unitType";
import { NAVY } from "../ui/tokens";
import { fmtDateShort, fmtPrice, SQ_MONTHS_LONG, statusStyleFor } from "./shared";

type UnitDetailTab = "summary" | "history";

type DetailItem = {
  label: string;
  value: ReactNode;
};

const HIDDEN_HISTORY_FIELDS = new Set([
  "buyer_lead_id",
  "crm_lead_id",
  "active_reservation_id",
  "active_reservation_showing_id",
  "has_active_reservation",
  "floorplan_code",
  "id",
  "created_at",
  "updated_at",
]);

function notNull<T>(value: T | null): value is T {
  return value !== null;
}

function DetailSectionCard({
  title,
  items,
  className = "",
  compact = false,
  gridClassName = "sm:grid-cols-2 md:grid-cols-3",
}: {
  title: string;
  items: DetailItem[];
  className?: string;
  compact?: boolean;
  gridClassName?: string;
}) {
  if (items.length === 0) return null;

  const shellSpacingClass = compact ? "px-5 py-4" : "px-5 py-4";
  const gridSpacingClass = compact ? "mt-3.5 gap-x-5 gap-y-3" : "mt-4 gap-x-5 gap-y-3";

  return (
    <div
      className={`rounded-[18px] border border-[#e7ecf3] bg-white ${shellSpacingClass} shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`.trim()}
    >
      <div className="flex items-center gap-2.5">
        <span className="h-4 w-[3px] rounded-full bg-[#003883]" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#003883]">
          {title}
        </p>
      </div>
      <div className={`grid ${gridSpacingClass} ${gridClassName}`}>
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/30">
              {item.label}
            </p>
            <div className="mt-1.5 text-[13px] leading-[1.4] text-[#003883]" style={{ fontWeight: 650 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = SQ_MONTHS_LONG[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

function isTimestamp(val: string) {
  return val.includes("T") && (val.includes("+") || val.includes("Z"));
}

function isDateOnly(val: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(val);
}

function isNumericValue(val: string) {
  return val.trim() !== "" && !Number.isNaN(Number(val));
}

function formatOptionalNumber(value: number | null | undefined): string {
  if (value == null || value <= 0) return "—";
  return String(value);
}

function formatUpdatedFieldsCount(count: number): string {
  return count === 1 ? "1 fushë e përditësuar" : `${count} fusha të përditësuara`;
}

export function UnitDetailDrawer({
  unit,
  onClose,
  fetchHistory,
  initialTab = "summary",
  onExtendReservation,
  onReleaseReservation,
}: {
  unit: Unit;
  onClose: () => void;
  fetchHistory: (id: string) => Promise<UnitHistory[]>;
  initialTab?: UnitDetailTab;
  onExtendReservation?: (unit: Unit) => void;
  onReleaseReservation?: (unit: Unit) => void;
}) {
  const drawerTitleId = useId();
  const [activeTab, setActiveTab] = useState<UnitDetailTab>(initialTab);
  const [history, setHistory] = useState<UnitHistory[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const loadingHistory = activeTab === "history" && !historyLoaded;

  useBodyScrollLock();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (activeTab !== "history" || historyLoaded) return;

    let isCancelled = false;

    void fetchHistory(unit.id)
      .then((nextHistory) => {
        if (isCancelled) return;
        setHistory(nextHistory);
        setHistoryLoaded(true);
      })
      .catch(() => {
        if (isCancelled) return;
        setHistory([]);
        setHistoryLoaded(true);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab, fetchHistory, historyLoaded, unit.id]);

  const typeLabel = getUnitTypeDisplay(unit.type, unit.level);
  const noteText = unit.notes?.trim() ?? "";
  const activeReservationContactPhone = formatContactPhone(unit.active_reservation_contact_phone);
  const activeReservationNote = unit.active_reservation_notes?.trim() ?? "";

  const unitProfileDetails = useMemo<DetailItem[]>(
    () =>
      [
        { label: "Blloku", value: unit.block },
        { label: "Lloji", value: typeLabel },
        { label: "Kati", value: unit.level },
        { label: "Sipërfaqja", value: `${unit.size} m²` },
        { label: "Dhoma gjumi", value: formatOptionalNumber(unit.bedrooms) },
        { label: "Banjo", value: formatOptionalNumber(unit.bathrooms) },
        { label: "Tualete", value: formatOptionalNumber(unit.toilets) },
        { label: "Orientimi", value: unit.orientation || "—" },
        { label: "Depo", value: unit.has_storage ? "Po" : "Jo" },
      ],
    [
      typeLabel,
      unit.bathrooms,
      unit.bedrooms,
      unit.block,
      unit.level,
      unit.orientation,
      unit.has_storage,
      unit.size,
      unit.toilets,
    ],
  );

  const saleDetails = useMemo<DetailItem[]>(
    () =>
      [
        unit.buyer_name ? { label: "Blerësi", value: unit.buyer_name } : null,
        unit.sale_date ? { label: "Data e shitjes", value: fmtDateShort(unit.sale_date) } : null,
        unit.payment_type ? { label: "Lloji i pagesës", value: unit.payment_type } : null,
        unit.final_price != null ? { label: "Çmimi final", value: fmtPrice(unit.final_price) } : null,
      ].filter(notNull),
    [unit.buyer_name, unit.final_price, unit.payment_type, unit.sale_date],
  );

  const reservationDetails = useMemo<DetailItem[]>(
    () => {
      const hasReservation = unit.status === "E rezervuar" || Boolean(unit.reservation_expires_at);
      if (!hasReservation) return [];

      return [
        { label: "Gjendja", value: "Rezervim aktiv" },
        { label: "Klienti", value: unit.active_reservation_contact_name || "—" },
        { label: "Telefoni", value: activeReservationContactPhone || "—" },
        {
          label: "Rezervuar më",
          value: unit.active_reservation_reserved_at
            ? formatDateTime(unit.active_reservation_reserved_at)
            : "—",
        },
        unit.reservation_expires_at
          ? { label: "Skadon më", value: fmtDateShort(unit.reservation_expires_at) }
          : null,
        activeReservationNote ? { label: "Shënim", value: activeReservationNote } : null,
      ].filter(notNull);
    },
    [
      activeReservationContactPhone,
      activeReservationNote,
      unit.active_reservation_contact_name,
      unit.active_reservation_reserved_at,
      unit.reservation_expires_at,
      unit.status,
    ],
  );

  const formatFieldValue = (val: unknown, field?: string, snapshot?: Partial<Unit>): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "string" && val.trim() === "") return "—";
    const s = String(val);
    if (field === "type") {
      return getUnitTypeDisplay(s, snapshot?.level);
    }
    if (field === "has_storage") return val ? "Po" : "Jo";
    if (field === "reservation_expires_at" || field === "sale_date") {
      if (isDateOnly(s)) return fmtDateShort(s);
      if (isTimestamp(s)) return fmtDateShort(s);
    }
    if (field === "size" && isNumericValue(s)) return `${Number(s).toLocaleString("de-DE")} m²`;
    if ((field === "balcony_area" || field === "terrace_area") && isNumericValue(s)) {
      return `${Number(s).toLocaleString("de-DE")} m²`;
    }
    if (field === "price" || field === "final_price" || field === "sale_price") {
      if (isNumericValue(s)) return fmtPrice(Number(s));
    }
    if (isTimestamp(s)) return formatDateTime(s);
    return s;
  };

  const fieldLabels: Record<string, string> = {
    status: "Statusi",
    reservation_expires_at: "Skadon më",
    notes: "Shënime",
    block: "Blloku",
    type: "Lloji",
    level: "Niveli",
    size: "Sipërfaqja",
    price: "Çmimi",
    sale_price: "Çmimi i shitjes",
    final_price: "Çmimi final",
    payment_type: "Lloji i pagesës",
    owner_category: "Pronësia",
    owner_name: "Pronari",
    unit_id: "Njësia",
    sale_date: "Data e shitjes",
    buyer_name: "Blerësi",
    bedrooms: "Dhoma gjumi",
    bathrooms: "Banjo",
    toilets: "Tualete",
    orientation: "Orientimi",
    has_storage: "Depo",
    balcony_area: "Ballkoni",
    terrace_area: "Terrasa",
  };

  const formatChangeReason = (reason: string) => {
    if (reason === "sale_completed") return "Shitje e përfunduar";
    return reason;
  };

  const changeReasonStyle = (reason: string) => {
    if (reason === "E rezervuar" || reason === "Rezervimi u zgjat") {
      return { background: "#fff8e8", color: "#b0892f" };
    }
    if (
      reason === "E shitur" ||
      reason === "sale_completed" ||
      reason === "Rezervimi u anulua" ||
      reason === "Rezervimi skadoi"
    ) {
      return { background: "#fbeeee", color: "#b14b4b" };
    }
    if (reason === "Në dispozicion") {
      return { background: "#edf7f1", color: "#3c7a57" };
    }
    return { background: "#EAF0FA", color: NAVY };
  };

  const visibleHistory = useMemo(
    () =>
      history
        .map((entry) => {
          const prev = entry.previous_data as Partial<Unit>;
          const next = entry.new_data as Partial<Unit>;
          const changedFields = Object.keys(next).filter((field) => {
            if (HIDDEN_HISTORY_FIELDS.has(field)) return false;

            return (
              formatFieldValue(prev[field as keyof Unit], field, prev) !==
              formatFieldValue(next[field as keyof Unit], field, next)
            );
          });

          return { entry, prev, next, changedFields };
        })
        .filter(({ changedFields }) => changedFields.length > 0),
    [history],
  );

  const statusColor = (status: string | undefined) =>
    status === "E rezervuar" ? "#b0892f" : status === "E shitur" ? "#b14b4b" : "#3c7a57";

  const changedValueColor = (next: Partial<Unit>, field: string) => {
    if (field === "status") return statusColor(next.status);
    return "rgba(15,23,42,0.72)";
  };

  const primaryPriceLabel = unit.final_price != null ? "Çmimi final" : "Çmimi";
  const primaryPriceValue = unit.final_price ?? unit.price;
  const priceDelta =
    unit.final_price != null && Number.isFinite(unit.price) ? unit.final_price - unit.price : null;
  const priceDeltaLabel =
    priceDelta === null || priceDelta === 0
      ? null
      : priceDelta < 0
        ? `${fmtPrice(Math.abs(priceDelta))} nën listë`
        : `${fmtPrice(priceDelta)} mbi listë`;
  const statusContext =
    unit.status === "E rezervuar" && unit.reservation_expires_at
      ? `Rezervuar deri më ${fmtDateShort(unit.reservation_expires_at)}`
      : unit.status === "E shitur" && unit.sale_date
        ? `Shitur më ${fmtDateShort(unit.sale_date)}`
        : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-[rgba(15,23,42,0.18)] backdrop-blur-[8px]"
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center px-4 py-4 sm:px-6 sm:py-8">
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={drawerTitleId}
          initial={{ y: 18, opacity: 0, scale: 0.975 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.975 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto flex max-h-[calc(100vh-32px)] w-full max-w-[680px] flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-[#fbfbfc] shadow-[0_28px_90px_rgba(15,23,42,0.22),0_10px_28px_rgba(15,23,42,0.10)] sm:max-h-[calc(100vh-64px)] sm:rounded-[28px]"
        >
          <div className="flex items-start justify-between border-b border-[#eef0f4] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] px-6 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/32">
                Detajet e njësisë
              </p>
              <p
                id={drawerTitleId}
                className="mt-1.5 text-[20px] font-semibold tracking-[-0.03em]"
                style={{ color: NAVY }}
              >
                {unit.unit_id}
              </p>
            </div>

            <button
              type="button"
              aria-label="Mbyll"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.06] bg-white/90 text-black/40 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-white hover:text-black/64"
            >
              <X size={15} />
            </button>
          </div>

          <div className="border-b border-[#eef0f4] bg-white/90 px-6 py-2.5 backdrop-blur-xl">
            <div className="inline-flex items-center gap-1 rounded-full border border-black/[0.06] bg-[#f8f9fc] p-1 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${
                  activeTab === "summary"
                    ? "bg-white text-[#003883] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                    : "text-black/46 hover:text-black/72"
                }`}
              >
                <LayoutList size={14} />
                Përmbledhje
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${
                  activeTab === "history"
                    ? "bg-white text-[#003883] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                    : "text-black/46 hover:text-black/72"
                }`}
              >
                <ScrollText size={14} />
                Histori
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain bg-[#fbfbfc] px-5 py-5 sm:px-6 sm:py-5">
            <AnimatePresence mode="wait" initial={false}>
              {activeTab === "summary" ? (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3.5"
                >
                  <div className="overflow-hidden rounded-[20px] border border-[#e7ecf3] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fc_100%)] shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                    <div className="grid gap-3.5 p-4 md:grid-cols-2 md:items-stretch md:gap-4">
                      <div className="flex min-w-0 flex-col">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PillBadge weight="medium" style={statusStyleFor(unit.status)}>
                            {unit.status}
                          </PillBadge>
                          {unit.payment_type && (
                            <span className="inline-flex items-center rounded-full bg-white/86 px-2.5 py-1 text-[10.5px] font-semibold text-black/52 ring-1 ring-black/[0.06]">
                              {unit.payment_type}
                            </span>
                          )}
                        </div>

                        <div className="mt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/32">
                            Pronari
                          </p>
                          <p
                            className="mt-1.5 truncate text-[22px] leading-[1.1] tracking-[-0.035em]"
                            style={{ color: NAVY, fontWeight: 700 }}
                          >
                            {unit.owner_name || "—"}
                          </p>
                          <p className="mt-1.5 text-[12.5px] leading-[1.45] text-black/48">
                            {unit.owner_category}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col rounded-[16px] border border-[#dde4f0] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/32">
                          {primaryPriceLabel}
                        </p>
                        <p
                          className="mt-1.5 text-[28px] leading-none tracking-[-0.045em]"
                          style={{ color: NAVY, fontWeight: 700 }}
                        >
                          {fmtPrice(primaryPriceValue)}
                        </p>

                        {unit.final_price != null && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-[12px] bg-[#f5f7fb] px-2.5 py-2">
                              <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-black/30">
                                Çmimi i listës
                              </p>
                              <p className="mt-1 text-[12px] leading-none tracking-[-0.02em] text-black/68">
                                {fmtPrice(unit.price)}
                              </p>
                            </div>
                            {priceDeltaLabel && (
                              <div className="rounded-[12px] bg-[#f5f7fb] px-2.5 py-2">
                                <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-black/30">
                                  Diferenca
                                </p>
                                <p className="mt-1 text-[12px] leading-none tracking-[-0.02em] text-black/68">
                                  {priceDeltaLabel}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {statusContext && (
                          <p className="mt-3 text-[11.5px] text-black/44">{statusContext}</p>
                        )}

                        {unit.status === "E rezervuar" &&
                          (onExtendReservation || onReleaseReservation) &&
                          unit.active_reservation_id && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {onExtendReservation && (
                                <button
                                  type="button"
                                  onClick={() => onExtendReservation(unit)}
                                  className="rounded-full border border-[#dce4f3] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#003883] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition hover:bg-[#f6f8fd]"
                                >
                                  Zgjat afatin
                                </button>
                              )}
                              {onReleaseReservation && (
                                <button
                                  type="button"
                                  onClick={() => onReleaseReservation(unit)}
                                  className="rounded-full border border-[#ecd6d6] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#8e4a4a] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition hover:bg-[#fff8f8]"
                                >
                                  Liro njësinë
                                </button>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  <DetailSectionCard
                    title="Profili i njësisë"
                    items={unitProfileDetails}
                    compact
                    gridClassName="sm:grid-cols-3"
                  />

                  {saleDetails.length > 0 && (
                    <DetailSectionCard
                      title="Detajet e shitjes"
                      items={saleDetails}
                      gridClassName="sm:grid-cols-2"
                    />
                  )}

                  {saleDetails.length === 0 && reservationDetails.length > 0 && (
                    <DetailSectionCard
                      title="Detajet e rezervimit"
                      items={reservationDetails}
                      gridClassName="sm:grid-cols-2"
                    />
                  )}

                  {noteText && (
                    <div className="rounded-[18px] border border-[#e7ecf3] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                      <div className="flex items-center gap-2.5">
                        <span className="h-4 w-[3px] rounded-full bg-[#003883]" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#003883]">
                          Shënime
                        </p>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-[13px] leading-[1.55] text-black/56">
                        {noteText}
                      </p>
                    </div>
                  )}

                  {(unit.created_at || unit.updated_at) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 pt-1 text-[10.5px] font-medium text-black/38">
                      {unit.created_at && (
                        <span>Krijuar më {formatDateTime(unit.created_at)}</span>
                      )}
                      {unit.created_at && unit.updated_at && (
                        <span className="h-1 w-1 rounded-full bg-black/20" aria-hidden />
                      )}
                      {unit.updated_at && (
                        <span>Përditësuar më {formatDateTime(unit.updated_at)}</span>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <EyebrowLabel as="p" className="text-black/32">
                      Historia e ndryshimeve
                    </EyebrowLabel>
                    <span className="rounded-full border border-black/[0.06] bg-white/84 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-black/34 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                      {loadingHistory ? "Duke ngarkuar" : `${visibleHistory.length} hyrje`}
                    </span>
                  </div>

                  {loadingHistory ? (
                    <SkeletonRows rows={4} />
                  ) : visibleHistory.length === 0 ? (
                    <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-dashed border-[#e6ebf2] bg-white/72 px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                      <div className="max-w-[280px]">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                          <Clock3 size={18} className="text-black/34" />
                        </div>
                        <p className="mt-4 text-[15px] font-medium tracking-[-0.02em] text-black/50">
                          Pa histori ndryshimesh
                        </p>
                        <p className="mt-1.5 text-[12.5px] leading-6 text-black/32">
                          Ndryshimet do të shfaqen këtu sapo të ruhen përditësime.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3.5">
                      {visibleHistory.map(({ entry: h, prev, next, changedFields }) => (
                        <div
                          key={h.id}
                          className="rounded-[20px] border border-black/[0.05] bg-white/88 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-medium text-black/42">
                                {formatDateTime(h.changed_at)}
                              </p>
                              <p className="mt-1 text-[11.5px] text-black/32">
                                {formatUpdatedFieldsCount(changedFields.length)}
                              </p>
                            </div>
                            {h.change_reason && (
                              <span
                                className="rounded-full border border-black/[0.04] px-2.5 py-1 text-[10.5px] font-medium shadow-[0_1px_1px_rgba(16,24,40,0.03)]"
                                style={changeReasonStyle(h.change_reason)}
                              >
                                {formatChangeReason(h.change_reason)}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col gap-2.5">
                            {changedFields.map((field) => (
                              <div
                                key={field}
                                className="grid gap-2.5 text-[12px] sm:grid-cols-[minmax(98px,116px)_minmax(0,1fr)_12px_minmax(0,1fr)] sm:items-start"
                              >
                                <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-black/34 sm:pt-3">
                                  {fieldLabels[field] ?? field.replace(/_/g, " ")}:
                                </span>
                                <span className="break-words rounded-[14px] border border-[#e8ebf0] bg-[#fafbfc] px-3 py-2.5 text-black/42 line-through decoration-black/24">
                                  {formatFieldValue(prev[field as keyof Unit], field, prev)}
                                </span>
                                <ChevronRight size={12} className="mt-3 hidden text-black/24 sm:block" />
                                <span
                                  className="break-words rounded-[14px] border border-[#e3e8ef] bg-[#fbfcfe] px-3 py-2.5"
                                  style={{ color: changedValueColor(next, field) }}
                                >
                                  {formatFieldValue(next[field as keyof Unit], field, next)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
      </div>
    </>
  );
}
