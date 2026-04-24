import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Clock3, LayoutList, ScrollText, X } from "lucide-react";
import { EyebrowLabel } from "../components/ui/Eyebrow";
import { PillBadge } from "../components/ui/PillBadge";
import { SkeletonRows } from "../components/SkeletonRows";
import type { Unit, UnitHistory } from "../hooks/useUnits";
import { getUnitTypeDisplay } from "../lib/unitType";
import { NAVY } from "../ui/tokens";
import { fmtDateShort, fmtPrice, getDhomaDisplay, SQ_MONTHS_LONG, statusStyleFor } from "./shared";

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
  "id",
  "created_at",
  "updated_at",
]);

const OWNER_CATEGORY_STYLE = {
  background: "#f7f7f8",
  color: "rgba(15, 23, 42, 0.66)",
  border: "1px solid #e5e7eb",
} as const;

function notNull<T>(value: T | null): value is T {
  return value !== null;
}

function DetailSectionCard({
  title,
  items,
  className = "",
}: {
  title: string;
  items: DetailItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={`rounded-[20px] border border-[#e7ebf2] bg-white/92 px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)] ${className}`.trim()}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
        {title}
      </p>
      <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/26">
              {item.label}
            </p>
            <div className="mt-1.5 text-[13px] leading-[1.4] text-black/72" style={{ fontWeight: 600 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-black/[0.04] bg-white/78 px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.025)]">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.15em] text-black/28">
        {label}
      </p>
      <div
        className="mt-1.5 text-[14px] leading-[1.2] tracking-[-0.02em] text-black/76"
        style={{ fontWeight: 650 }}
      >
        {value}
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

function formatOptionalArea(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return `${value.toLocaleString("de-DE")} m²`;
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
  const [activeTab, setActiveTab] = useState<UnitDetailTab>(initialTab);
  const [history, setHistory] = useState<UnitHistory[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const loadingHistory = activeTab === "history" && !historyLoaded;

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
  const headerMeta = `${unit.block} · ${typeLabel} · ${unit.level} · ${unit.size} m²`;
  const noteText = unit.notes?.trim() ?? "";
  const balconyAreaLabel = formatOptionalArea(unit.balcony_area);
  const terraceAreaLabel = formatOptionalArea(unit.terrace_area);

  const unitDetails = useMemo<DetailItem[]>(
    () =>
      [
        { label: "Blloku", value: unit.block },
        { label: "Lloji", value: typeLabel },
        { label: "Niveli", value: unit.level },
        { label: "Sipërfaqja", value: `${unit.size} m²` },
        unit.orientation ? { label: "Orientimi", value: unit.orientation } : null,
        unit.floorplan_code ? { label: "Planimetria", value: unit.floorplan_code } : null,
        balconyAreaLabel ? { label: "Ballkoni", value: balconyAreaLabel } : null,
        terraceAreaLabel ? { label: "Terrasa", value: terraceAreaLabel } : null,
        unit.bedrooms && unit.bedrooms > 0
          ? { label: "Dhoma gjumi", value: String(unit.bedrooms) }
          : null,
        unit.bathrooms && unit.bathrooms > 0
          ? { label: "Banjo", value: String(unit.bathrooms) }
          : null,
        unit.toilets && unit.toilets > 0
          ? { label: "Tualete", value: String(unit.toilets) }
          : null,
      ].filter(notNull),
    [
      balconyAreaLabel,
      terraceAreaLabel,
      typeLabel,
      unit.bathrooms,
      unit.bedrooms,
      unit.block,
      unit.floorplan_code,
      unit.level,
      unit.orientation,
      unit.size,
      unit.toilets,
    ],
  );

  const operationalDetails = useMemo<DetailItem[]>(
    () =>
      [
        {
          label: "Statusi",
          value: (
            <PillBadge weight="medium" style={statusStyleFor(unit.status)}>
              {unit.status}
            </PillBadge>
          ),
        },
        {
          label: "Pronësia",
          value: (
            <PillBadge weight="medium" style={OWNER_CATEGORY_STYLE}>
              {unit.owner_category}
            </PillBadge>
          ),
        },
        { label: "Pronari", value: unit.owner_name || "—" },
        unit.created_at ? { label: "Krijuar më", value: formatDateTime(unit.created_at) } : null,
        unit.updated_at
          ? { label: "Përditësuar më", value: formatDateTime(unit.updated_at) }
          : null,
      ].filter(notNull),
    [unit.created_at, unit.owner_category, unit.owner_name, unit.status, unit.updated_at],
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
    () =>
      [
        unit.status === "E rezervuar" || unit.reservation_expires_at
          ? { label: "Gjendja", value: "Rezervim aktiv" }
          : null,
        unit.reservation_expires_at
          ? { label: "Skadon më", value: fmtDateShort(unit.reservation_expires_at) }
          : null,
      ].filter(notNull),
    [unit.reservation_expires_at, unit.status],
  );

  const formatFieldValue = (val: unknown, field?: string, snapshot?: Partial<Unit>): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "string" && val.trim() === "") return "—";
    const s = String(val);
    if (field === "type") {
      return getUnitTypeDisplay(s, snapshot?.level);
    }
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
    updated_at: "Përditësuar më",
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
    floorplan_code: "Planimetria",
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

  const newStatusColor = (next: Partial<Unit>, field: string) => {
    if (field === "status") return statusColor(next.status);
    if (field === "reservation_expires_at") return statusColor(next.status);
    if (field === "updated_at" && next.status !== undefined) return statusColor(next.status);
    return "#3c7a57";
  };

  const primaryPriceLabel = unit.final_price != null ? "Çmimi final" : "Çmimi";
  const primaryPriceValue = unit.final_price ?? unit.price;
  const roomSummary = getDhomaDisplay(unit);
  const roomSummaryLabel = roomSummary === "—" ? "—" : roomSummary;
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

      <motion.aside
        initial={{ x: 48, opacity: 0, scale: 0.985 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 48, opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-3 left-3 right-3 top-3 z-[80] flex flex-col overflow-hidden rounded-[28px] border border-black/[0.06] bg-[#fbfbfc] shadow-[-12px_28px_80px_rgba(15,23,42,0.18),0_10px_28px_rgba(15,23,42,0.08)] sm:bottom-5 sm:left-auto sm:right-5 sm:top-5 sm:w-[760px] sm:rounded-[32px]"
      >
        <div className="flex items-start justify-between border-b border-[#eef0f4] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/30">
              Detajet e njësisë
            </p>
            <p
              className="mt-2 text-[20px] font-semibold tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              {unit.unit_id}
            </p>
            <p className="mt-1 text-[13px] text-black/48">{headerMeta}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white/90 text-black/35 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-white hover:text-black/58"
          >
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-[#eef0f4] bg-white/82 px-6 py-3 backdrop-blur-xl">
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

        <div className="flex-1 overflow-y-auto bg-[#fbfbfc] px-6 py-5">
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "summary" ? (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                <div className="overflow-hidden rounded-[26px] border border-[#e7ebf2] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-5 px-5 py-5 md:flex-row md:items-stretch">
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <PillBadge weight="medium" style={statusStyleFor(unit.status)}>
                            {unit.status}
                          </PillBadge>
                          {unit.payment_type && (
                            <span className="inline-flex items-center rounded-full bg-white/86 px-2.5 py-1 text-[10.5px] font-semibold text-black/52 ring-1 ring-black/[0.06]">
                              {unit.payment_type}
                            </span>
                          )}
                        </div>

                        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-black/28">
                          Pronari
                        </p>
                        <p
                          className="mt-2 truncate text-[24px] leading-none tracking-[-0.04em]"
                          style={{ color: NAVY, fontWeight: 700 }}
                        >
                          {unit.owner_name || "—"}
                        </p>
                        <p className="mt-2 text-[13px] leading-[1.45] text-black/44">
                          {unit.owner_category}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-[260px] md:w-[270px]">
                      <div className="rounded-[20px] border border-[#dfe6f1] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/30">
                          {primaryPriceLabel}
                        </p>
                        <p
                          className="mt-2 text-[32px] leading-none tracking-[-0.05em]"
                          style={{ color: NAVY, fontWeight: 700 }}
                        >
                          {fmtPrice(primaryPriceValue)}
                        </p>

                        {unit.final_price != null && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                            <div className="rounded-[14px] bg-[#f5f7fb] px-3 py-2.5">
                              <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-black/28">
                                Lista
                              </p>
                              <p className="mt-1 text-[13px] leading-none tracking-[-0.03em] text-black/66">
                                {fmtPrice(unit.price)}
                              </p>
                            </div>
                            {priceDeltaLabel && (
                              <div className="rounded-[14px] bg-[#f5f7fb] px-3 py-2.5">
                                <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-black/28">
                                  Diferenca
                                </p>
                                <p className="mt-1 text-[13px] leading-none tracking-[-0.03em] text-black/66">
                                  {priceDeltaLabel}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {statusContext && (
                          <p className="mt-3 text-[11.5px] text-black/42">{statusContext}</p>
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

                  <div className="grid gap-2.5 border-t border-[#edf0f5] bg-white/56 p-3 sm:grid-cols-2 md:grid-cols-5">
                    <SummaryMetric label="Lloji" value={typeLabel} />
                    <SummaryMetric label="Niveli" value={unit.level} />
                    <SummaryMetric label="Sipërfaqja" value={`${unit.size} m²`} />
                    <SummaryMetric label="Orientimi" value={unit.orientation ?? "—"} />
                    <SummaryMetric label="Konfigurimi" value={roomSummaryLabel} />
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                  <DetailSectionCard title="Detajet e njësisë" items={unitDetails} />
                  <DetailSectionCard title="Konteksti operativ" items={operationalDetails} />
                </div>

                {saleDetails.length > 0 && (
                  <DetailSectionCard title="Konteksti i shitjes" items={saleDetails} />
                )}

                {saleDetails.length === 0 && reservationDetails.length > 0 && (
                  <DetailSectionCard title="Konteksti i rezervimit" items={reservationDetails} />
                )}

                {noteText && (
                  <div className="rounded-[20px] border border-[#e7ebf2] bg-white/92 px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                      Shënime
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-black/54">
                      {noteText}
                    </p>
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

                <div className="mb-5 grid gap-2.5 rounded-[20px] border border-black/[0.05] bg-white/86 p-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)] sm:grid-cols-3">
                  <div className="rounded-[16px] border border-black/[0.04] bg-[#fbfcfe] px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                      Statusi aktual
                    </p>
                    <div className="mt-2">
                      <PillBadge weight="medium" style={statusStyleFor(unit.status)}>
                        {unit.status}
                      </PillBadge>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-black/[0.04] bg-[#fbfcfe] px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                      Lloji
                    </p>
                    <p className="mt-2 text-[12.5px] font-medium text-[#003883]">{typeLabel}</p>
                  </div>

                  <div className="rounded-[16px] border border-black/[0.04] bg-[#fbfcfe] px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                      Pronari
                    </p>
                    <p className="mt-2 truncate text-[12.5px] font-medium text-[#003883]">
                      {unit.owner_name || "—"}
                    </p>
                  </div>
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
                        Ende pa histori
                      </p>
                      <p className="mt-1.5 text-[12.5px] leading-6 text-black/32">
                        Nuk ka ndryshime të regjistruara ende për këtë njësi. Sapo të ruhen
                        përditësime, ato do të shfaqen këtu.
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
                              {changedFields.length} fusha të përditësuara
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
                              <span className="break-words rounded-[14px] border border-[#f3dfdf] bg-[#fff8f8] px-3 py-2.5 text-[#b14b4b] line-through">
                                {formatFieldValue(prev[field as keyof Unit], field, prev)}
                              </span>
                              <ChevronRight size={12} className="mt-3 hidden text-black/24 sm:block" />
                              <span
                                className="break-words rounded-[14px] border border-[#e4ece7] bg-[#f7fbf8] px-3 py-2.5"
                                style={{ color: newStatusColor(next, field) }}
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
    </>
  );
}
