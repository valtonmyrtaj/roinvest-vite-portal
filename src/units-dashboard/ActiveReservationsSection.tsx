import { useMemo } from "react";
import { SectionEyebrow } from "../components/ui/Eyebrow";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { PillBadge } from "../components/ui/PillBadge";
import {
  TABULAR_HEADER_LABEL_CLASS,
  TABULAR_HEADER_ROW_CLASS,
} from "../components/ui/tabularHeader";
import { SkeletonRows } from "../components/SkeletonRows";
import type { Unit } from "../hooks/useUnits";
import { Card } from "./primitives";
import { fmtDateShort } from "./shared";

export function ActiveReservationsSection({
  units,
  loading = false,
  onExtendReservation,
  onReleaseReservation,
  onOpenUnitDetails,
}: {
  units: Unit[];
  loading?: boolean;
  onExtendReservation?: (unit: Unit) => void;
  onReleaseReservation?: (unit: Unit) => void;
  onOpenUnitDetails?: (unit: Unit) => void;
}) {
  const showActions = Boolean(onExtendReservation || onReleaseReservation);
  const activeReservations = useMemo(
    () =>
      units
        .filter((u) => u.status === "E rezervuar" && u.reservation_expires_at)
        .sort(
          (a, b) =>
            new Date(a.reservation_expires_at!).getTime() -
            new Date(b.reservation_expires_at!).getTime(),
        ),
    [units],
  );

  const expiringSoonCount = useMemo(
    () =>
      activeReservations.filter((u) => {
        const expiry = new Date(u.reservation_expires_at!);
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);
        const daysLeft = Math.round(
          (expiry.getTime() - todayMidnight.getTime()) / 86400000,
        );
        return daysLeft >= 0 && daysLeft <= 7;
      }).length,
    [activeReservations],
  );

  const subtitle = loading
    ? "Duke ngarkuar rezervimet aktive"
    : activeReservations.length === 0
      ? "Nuk ka rezervime që kërkojnë ndjekje për momentin"
      : expiringSoonCount > 0
        ? `${expiringSoonCount} skadojnë brenda 7 ditëve të ardhshme`
        : "Rezervimet e renditura sipas datës së skadimit";

  return (
    <div className="mt-6">
      <SectionEyebrow
        className="mb-4"
        label="Njësitë e rezervuara"
        detail={
          loading
            ? "duke ngarkuar ndjekjen"
            : activeReservations.length === 0
              ? "pa afate që kërkojnë vëmendje"
              : `${activeReservations.length} njësi me afat rezervimi`
        }
      />

      <Card className="overflow-hidden p-0">
        <CardSectionHeader
          title="Afatet e rezervimeve"
          subtitle={subtitle}
          className="bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f9ff_100%)] px-6 pb-5 pt-4"
          titleStyle={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "0em",
            lineHeight: 1.18,
          }}
          subtitleStyle={{
            fontSize: 11.75,
            fontWeight: 500,
            lineHeight: 1.35,
          }}
          right={
            <span className="rounded-full border border-[#e7ebf2] bg-[#fbfcfe] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-black/32">
              {loading ? "Duke ngarkuar" : `${activeReservations.length} aktive`}
            </span>
          }
        />

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-5 py-6">
              <SkeletonRows rows={4} />
            </div>
          ) : activeReservations.length === 0 ? (
            <div className="px-5 py-6">
              <div className="flex min-h-[148px] items-center justify-center rounded-[14px] border border-dashed border-[#e5eaf1] bg-[#fcfcfd] px-4 text-center">
                <div>
                  <p className="text-[12.5px] font-medium text-black/42">
                    Nuk ka njësi të rezervuara për momentin.
                  </p>
                  <p className="mt-1 text-[11.5px] text-black/28">
                    Sapo një njësi të rezervohet, afati i saj do të shfaqet këtu për ndjekje.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className={TABULAR_HEADER_ROW_CLASS}>
                  {[
                    "Njësia",
                    "Pronari",
                    "Skadon më",
                    "Ditë mbetur",
                    "Statusi",
                    ...(showActions ? ["Veprime"] : []),
                  ].map((col) => (
                    <th
                      key={col}
                      className={`px-5 py-2.5 ${TABULAR_HEADER_LABEL_CLASS}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeReservations.map((u) => {
                  const expiry = new Date(u.reservation_expires_at!);
                  const todayMidnight = new Date();
                  todayMidnight.setHours(0, 0, 0, 0);
                  expiry.setHours(0, 0, 0, 0);
                  const daysLeft = Math.round(
                    (expiry.getTime() - todayMidnight.getTime()) / 86400000,
                  );

                  let chipText: string;
                  let chipCls: string;
                  if (daysLeft < 0) {
                    chipText = "Skaduar";
                    chipCls = "bg-[#fbeeee] text-[#b14b4b]";
                  } else if (daysLeft === 0) {
                    chipText = "Skadon sot";
                    chipCls = "bg-[#fbeeee] text-[#b14b4b]";
                  } else if (daysLeft <= 7) {
                    chipText = `${daysLeft} ditë`;
                    chipCls = "bg-[#fff4e0] text-[#7a5c10]";
                  } else if (daysLeft <= 14) {
                    chipText = `${daysLeft} ditë`;
                    chipCls = "bg-[#fefce8] text-[#7a6510]";
                  } else {
                    chipText = `${daysLeft} ditë`;
                    chipCls = "bg-[#edf7f1] text-[#3c7a57]";
                  }

                  const daysDisplay =
                    daysLeft < 0
                      ? `${Math.abs(daysLeft)} ditë më parë`
                      : daysLeft === 0
                        ? "Sot"
                        : `${daysLeft} ditë`;
                  const isClickable = Boolean(onOpenUnitDetails);

                  return (
                    <tr
                      key={u.id}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      aria-label={isClickable ? `Hap detajet për ${u.unit_id}` : undefined}
                      onClick={isClickable ? () => onOpenUnitDetails?.(u) : undefined}
                      onKeyDown={
                        isClickable
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onOpenUnitDetails?.(u);
                              }
                            }
                          : undefined
                      }
                      className={`border-t border-[#eef0f4] transition hover:bg-[#fafbfd] ${
                        isClickable
                          ? "cursor-pointer focus-visible:bg-[#f8fbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#003883]/14"
                          : ""
                      }`}
                    >
                      <td className="px-5 py-3 text-[12.5px] font-normal text-black/72">
                        {u.unit_id}
                      </td>
                      <td className="px-5 py-3 text-[12.5px] text-black/58">
                        {u.owner_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-[12.5px] text-black/58">
                        {fmtDateShort(u.reservation_expires_at)}
                      </td>
                      <td className="px-5 py-3 text-[12.5px] text-black/58">
                        {daysDisplay}
                      </td>
                      <td className="px-5 py-3">
                        <PillBadge className={chipCls}>
                          {chipText}
                        </PillBadge>
                      </td>
                      {showActions && (
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {onExtendReservation && u.active_reservation_id && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onExtendReservation(u);
                                }}
                                className="rounded-full border border-[#dce4f3] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#003883] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition hover:bg-[#f6f8fd]"
                              >
                                Zgjat
                              </button>
                            )}
                            {onReleaseReservation && u.active_reservation_id && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onReleaseReservation(u);
                                }}
                                className="rounded-full border border-[#ecd6d6] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#8e4a4a] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition hover:bg-[#fff8f8]"
                              >
                                Liro
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
