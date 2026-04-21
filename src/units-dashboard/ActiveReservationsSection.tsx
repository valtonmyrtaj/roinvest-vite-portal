import { useMemo } from "react";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { PillBadge } from "../components/ui/PillBadge";
import {
  TABULAR_HEADER_LABEL_CLASS,
  TABULAR_HEADER_ROW_CLASS,
} from "../components/ui/tabularHeader";
import type { Unit } from "../hooks/useUnits";
import { Card } from "./primitives";
import { fmtDateShort } from "./shared";

export function ActiveReservationsSection({ units }: { units: Unit[] }) {
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

  return (
    <div className="mt-5">
      <Card className="overflow-hidden p-0">
        <CardSectionHeader
          title="Rezervimet aktive"
          subtitle="Rezervimet e renditura sipas datës së skadimit"
        />

        <div className="overflow-x-auto">
          {activeReservations.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[12.5px] font-medium text-black/38">
                Nuk ka rezervime aktive për momentin
              </p>
              <p className="mt-1 text-[11.5px] text-black/26">
                Njësitë e rezervuara do të shfaqen këtu sipas datës së skadimit.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className={TABULAR_HEADER_ROW_CLASS}>
                  {["Njësia", "Pronari", "Skadon më", "Ditë mbetur", "Statusi"].map((col) => (
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

                  return (
                    <tr
                      key={u.id}
                      className="border-t border-[#eef0f4] transition hover:bg-[#fafbfd]"
                    >
                      <td className="px-5 py-3 text-[12.5px] font-semibold text-black/78">
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
