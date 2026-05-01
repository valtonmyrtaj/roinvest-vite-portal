import type { Payment } from "../hooks/usePayments";
import type { Unit } from "../hooks/useUnits";
import { formatEuro as fmtEur } from "../lib/formatCurrency";
import { getUnitContractValue } from "../lib/unitFinancials";
import { fmtDate, formatPaymentType, GOLD, GREEN, NAVY, RED } from "./shared";

const PRINT_FRAME_ID = "roinvest-payment-statement-print-frame";

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string | number | null | undefined) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function statementStatusLabel(payment: Payment) {
  if (payment.status === "E vonuar") return "E vonuar";
  return payment.status;
}

function statementStatusClass(payment: Payment) {
  if (payment.status === "E paguar") return "paid";
  if (payment.status === "Pjesërisht paguar") return "partial";
  if (payment.status === "E vonuar") return "late";
  return "pending";
}

function buildInstallmentRows(payments: Payment[]) {
  if (payments.length === 0) {
    return `
      <tr>
        <td colspan="7" class="empty">Nuk ka këste të regjistruara.</td>
      </tr>
    `;
  }

  return payments
    .map((payment, index) => {
      const paidDate = payment.last_receipt_date ?? payment.paid_date;
      const remainingAmount = Math.max(payment.remaining_amount, 0);
      const displayNumber = index + 1;

      return `
        <tr>
          <td class="installment">#${displayNumber}</td>
          <td>${escapeHtml(fmtEur(payment.amount))}</td>
          <td>${escapeHtml(fmtDate(payment.due_date))}</td>
          <td>${escapeHtml(fmtDate(paidDate))}</td>
          <td>
            <span class="status ${statementStatusClass(payment)}">
              ${escapeHtml(statementStatusLabel(payment))}
            </span>
          </td>
          <td>${escapeHtml(fmtEur(payment.paid_amount))}</td>
          <td>${escapeHtml(fmtEur(remainingAmount))}</td>
        </tr>
      `;
    })
    .join("");
}

function buildStatementHtml({
  unit,
  payments,
  paidAmount,
}: {
  unit: Unit;
  payments: Payment[];
  paidAmount: number;
}) {
  const finalPrice = getUnitContractValue(unit);
  const pendingAmount = Math.max(finalPrice - paidAmount, 0);
  const paymentType = formatPaymentType(unit.payment_type);
  const paidPercent = finalPrice > 0 ? Math.min(Math.round((paidAmount / finalPrice) * 100), 100) : 0;
  const generatedDate = fmtDate(todayIso());
  const title = `Pasqyra e pagesave - ${unit.unit_id}`;

  return `<!doctype html>
    <html lang="sq">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: A4;
            margin: 14mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #f4f6fb;
            color: #1f2933;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .sheet {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 16mm;
          }

          .topbar {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
            border-bottom: 1px solid #e7ecf4;
            padding-bottom: 18px;
          }

          .eyebrow,
          .label,
          th {
            color: rgba(0, 0, 0, 0.38);
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.15em;
            text-transform: uppercase;
          }

          h1 {
            margin: 8px 0 0;
            color: ${NAVY};
            font-size: 28px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .meta {
            margin-top: 8px;
            color: rgba(0, 0, 0, 0.52);
            font-size: 12px;
            line-height: 1.45;
          }

          .brand {
            color: ${NAVY};
            font-size: 16px;
            font-weight: 800;
            text-align: right;
          }

          .generated {
            margin-top: 8px;
            color: rgba(0, 0, 0, 0.44);
            font-size: 11px;
            text-align: right;
          }

          .summary {
            display: grid;
            grid-template-columns: 1.2fr 1fr 1fr 1fr;
            gap: 10px;
            margin-top: 18px;
          }

          .card {
            border: 1px solid #e5ebf4;
            border-radius: 14px;
            padding: 12px;
            background: #fbfcff;
          }

          .card strong {
            display: block;
            margin-top: 7px;
            color: ${NAVY};
            font-size: 19px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .card .green {
            color: ${GREEN};
          }

          .card .gold {
            color: ${GOLD};
          }

          .details {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px 18px;
            margin-top: 18px;
            border: 1px solid #e8edf5;
            border-radius: 16px;
            padding: 14px;
          }

          .value {
            margin-top: 5px;
            color: rgba(0, 0, 0, 0.72);
            font-size: 12px;
            font-weight: 650;
            line-height: 1.35;
          }

          .progress {
            margin-top: 16px;
            border: 1px solid #e8edf5;
            border-radius: 999px;
            height: 9px;
            overflow: hidden;
            background: #eef2f7;
          }

          .progress span {
            display: block;
            width: ${paidPercent}%;
            height: 100%;
            background: ${GREEN};
          }

          .progress-note {
            margin-top: 7px;
            color: rgba(0, 0, 0, 0.48);
            font-size: 11px;
          }

          .section-title {
            margin: 20px 0 10px;
            color: ${NAVY};
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border: 1px solid #e8edf5;
            border-radius: 14px;
            font-size: 11px;
          }

          thead {
            background: #f7f9fc;
          }

          th,
          td {
            border-bottom: 1px solid #edf1f6;
            padding: 10px 9px;
            text-align: left;
            vertical-align: middle;
          }

          tr:last-child td {
            border-bottom: 0;
          }

          .installment {
            color: ${NAVY};
            font-weight: 800;
          }

          .status {
            display: inline-flex;
            border-radius: 999px;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: 800;
            line-height: 1;
            white-space: nowrap;
          }

          .status.paid,
          .status.partial {
            background: #edf7f1;
            color: ${GREEN};
          }

          .status.pending {
            background: #fff8e8;
            color: ${GOLD};
          }

          .status.late {
            background: #fbeeee;
            color: ${RED};
          }

          .empty {
            color: rgba(0, 0, 0, 0.42);
            padding: 18px;
            text-align: center;
          }

          .footer {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            margin-top: 18px;
            border-top: 1px solid #e7ecf4;
            padding-top: 12px;
            color: rgba(0, 0, 0, 0.42);
            font-size: 10px;
            line-height: 1.45;
          }

          @media print {
            body {
              background: #ffffff;
            }

            .sheet {
              width: auto;
              min-height: auto;
              margin: 0;
              padding: 0;
            }

            tr,
            .card,
            .details {
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <main class="sheet">
          <header class="topbar">
            <div>
              <div class="eyebrow">Pasqyra e pagesave</div>
              <h1>${escapeHtml(unit.unit_id)}</h1>
              <div class="meta">
                ${escapeHtml(unit.block)} · ${escapeHtml(unit.type)} · ${escapeHtml(unit.level)} · ${escapeHtml(unit.size)} m²
              </div>
            </div>
            <div>
              <div class="brand">Roinvest</div>
              <div class="generated">Gjeneruar më ${escapeHtml(generatedDate)}</div>
            </div>
          </header>

          <section class="summary">
            <div class="card">
              <div class="label">Blerësi</div>
              <strong>${escapeHtml(unit.buyer_name)}</strong>
            </div>
            <div class="card">
              <div class="label">Çmimi final</div>
              <strong>${escapeHtml(fmtEur(finalPrice))}</strong>
            </div>
            <div class="card">
              <div class="label">Arkëtuar</div>
              <strong class="green">${escapeHtml(fmtEur(paidAmount))}</strong>
            </div>
            <div class="card">
              <div class="label">Në pritje</div>
              <strong class="gold">${escapeHtml(fmtEur(pendingAmount))}</strong>
            </div>
          </section>

          <section class="details">
            <div>
              <div class="label">Lloji i pagesës</div>
              <div class="value">${escapeHtml(paymentType)}</div>
            </div>
            <div>
              <div class="label">Data e shitjes</div>
              <div class="value">${escapeHtml(fmtDate(unit.sale_date))}</div>
            </div>
            <div>
              <div class="label">Pronari</div>
              <div class="value">${escapeHtml(unit.owner_name)}</div>
            </div>
            <div>
              <div class="label">Statusi</div>
              <div class="value">${escapeHtml(unit.status)}</div>
            </div>
          </section>

          <div class="progress"><span></span></div>
          <div class="progress-note">
            ${escapeHtml(fmtEur(paidAmount))} arkëtuar nga ${escapeHtml(fmtEur(finalPrice))} · ${paidPercent}%
          </div>

          <h2 class="section-title">Lista e kësteve</h2>
          <table>
            <thead>
              <tr>
                <th>Kësti</th>
                <th>Shuma</th>
                <th>Afati</th>
                <th>Paguar më</th>
                <th>Statusi</th>
                <th>Arkëtuar</th>
                <th>Mbetur</th>
              </tr>
            </thead>
            <tbody>
              ${buildInstallmentRows(payments)}
            </tbody>
          </table>

          <footer class="footer">
            <span>Ky dokument është pasqyrë informative e pagesave për njësinë e zgjedhur.</span>
            <span>${escapeHtml(unit.unit_id)} · ${escapeHtml(generatedDate)}</span>
          </footer>
        </main>
      </body>
    </html>`;
}

export function exportPaymentStatementPdf({
  unit,
  payments,
  paidAmount,
}: {
  unit: Unit;
  payments: Payment[];
  paidAmount: number;
}) {
  document.getElementById(PRINT_FRAME_ID)?.remove();

  const printFrame = document.createElement("iframe");
  printFrame.id = PRINT_FRAME_ID;
  printFrame.title = "Pasqyra e pagesave";
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  printFrame.style.opacity = "0";
  printFrame.style.pointerEvents = "none";

  document.body.appendChild(printFrame);

  const frameWindow = printFrame.contentWindow;
  const frameDocument = frameWindow?.document;

  if (!frameWindow || !frameDocument) {
    printFrame.remove();
    return false;
  }

  const cleanup = () => {
    printFrame.remove();
  };

  frameDocument.open();
  frameDocument.write(buildStatementHtml({ unit, payments, paidAmount }));
  frameDocument.close();

  frameWindow.addEventListener("afterprint", cleanup, { once: true });

  window.requestAnimationFrame(() => {
    frameWindow.focus();
    frameWindow.print();
  });

  return true;
}
