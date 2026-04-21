import type { Payment } from "../hooks/usePayments";
import type { Unit } from "../hooks/useUnits";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import {
  TABULAR_HEADER_LABEL_CLASS,
  TABULAR_HEADER_ROW_CLASS,
} from "../components/ui/tabularHeader";
import { Card, PaymentStatusBadge } from "./primitives";
import { fmtDate, triggerOnActionKey } from "./shared";
import { formatEuro as fmtEur } from "../lib/formatCurrency";

export type UpcomingPaymentRow = {
  payment: Payment;
  unit: Unit;
};

export function SalesUpcomingPayments({
  upcomingPayments,
  onOpenPaymentPlan,
  highlightedUnitId,
  paymentsSectionPulse,
}: {
  upcomingPayments: UpcomingPaymentRow[];
  onOpenPaymentPlan: (unit: Unit) => void | Promise<void>;
  highlightedUnitId: string | null;
  paymentsSectionPulse: boolean;
}) {
  return (
    <Card
      className={`overflow-hidden p-0 transition-all duration-300 ${
        paymentsSectionPulse ? "ring-2 ring-[#003883]/12 ring-offset-2 ring-offset-[#f8f8fa]" : ""
      }`}
    >
      <CardSectionHeader
        title="Pagesat e ardhshme"
        subtitle="Këstët e papaguara të renditura sipas datës së skadimit"
        className="px-6 py-5"
        bodyClassName="max-w-[500px]"
      />

      <div className="overflow-x-auto">
        {upcomingPayments.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-[13px] font-medium text-black/40">
              Nuk ka pagesa të ardhshme për momentin
            </p>
            <p className="mt-1 text-[11.5px] text-black/28">
              Këstet e papaguara do të renditen këtu sapo të kenë afat skadimi.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className={TABULAR_HEADER_ROW_CLASS}>
                {["Njësia", "Blerësi", "Kësti #", "Shuma", "Data e skadimit", "Statusi"].map((label) => (
                  <th
                    key={label}
                    className={`px-6 py-3 ${TABULAR_HEADER_LABEL_CLASS}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcomingPayments.map(({ payment, unit }) => (
                <tr
                  key={payment.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Hap planin e pagesave për ${unit.unit_id}`}
                  onClick={() => {
                    void onOpenPaymentPlan(unit);
                  }}
                  onKeyDown={(event) =>
                    triggerOnActionKey(event, () => {
                      void onOpenPaymentPlan(unit);
                    })
                  }
                  className={`group cursor-pointer border-t border-[#eef0f4] outline-none transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[inset_0_0_0_9999px_rgba(17,24,39,0.018)] focus-visible:shadow-[inset_0_0_0_9999px_rgba(17,24,39,0.018),0_0_0_1px_rgba(0,56,131,0.12)] ${
                    highlightedUnitId === unit.id ? "bg-[#f4f7fc]" : ""
                  }`}
                  style={{
                    backgroundColor:
                      highlightedUnitId === unit.id
                        ? "#f4f7fc"
                        : payment.status === "E vonuar"
                          ? "rgba(177,75,75,0.04)"
                          : "transparent",
                  }}
                >
                  <td className="px-6 py-4 text-[13px] font-semibold text-black/78 transition-colors group-hover:text-black/88 group-focus-visible:text-black/88">
                    {unit.unit_id}
                  </td>
                  <td className="px-6 py-4 text-[13px] text-black/58 transition-colors group-hover:text-black/68 group-focus-visible:text-black/68">
                    {unit.buyer_name ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-[13px] text-black/58 transition-colors group-hover:text-black/68 group-focus-visible:text-black/68">
                    #{payment.installment_number}
                  </td>
                  <td className="px-6 py-4 text-[13px] text-black/78 transition-colors group-hover:text-black/88 group-focus-visible:text-black/88">
                    {fmtEur(payment.amount)}
                  </td>
                  <td className="px-6 py-4 text-[13px] text-black/58 transition-colors group-hover:text-black/68 group-focus-visible:text-black/68">
                    {fmtDate(payment.due_date)}
                  </td>
                  <td className="px-6 py-4">
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
