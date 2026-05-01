/**
 * Scoped print stylesheet for the Executive Reports page.
 *
 * Controls:
 *   • @page A4 portrait, 9mm margins
 *   • prints only `.executive-report-content`
 *   • hides shell/sidebar/topbar and `.executive-reports-print-hide` nodes
 *   • flattens shadows and tightens borders on `.executive-reports-card`
 *   • compacts KPI cards and tables for a controlled one-page A4 report
 *   • un-clips `.executive-reports-scroll` so tables print in full
 *
 */
export function ExecutiveReportsPrintStyle() {
  return (
    <style>{`
        @page {
          size: A4 portrait;
          margin: 7mm;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html,
          body {
            background: #fff !important;
            width: 100% !important;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          body * {
            visibility: hidden !important;
          }

          .executive-report-content,
          .executive-report-content * {
            visibility: visible !important;
          }

          nav,
          aside,
          header,
          [data-sidebar],
          [data-topbar],
          .sidebar,
          .Sidebar,
          .topbar,
          .Topbar,
          .app-sidebar,
          .app-topbar,
          .executive-reports-print-hide {
            display: none !important;
          }

          main {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .executive-report-content.executive-reports-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #1f2933 !important;
          }

          .executive-reports-card {
            box-shadow: none !important;
            border-color: #d9dce3 !important;
            border-radius: 10px !important;
            overflow: hidden !important;
          }

          .executive-report-content * {
            text-shadow: none !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
          }

          .executive-report-content .mb-12,
          .executive-report-content .mb-9,
          .executive-report-content .mb-8,
          .executive-report-content .mb-6,
          .executive-report-content .mt-12 {
            margin-bottom: 3mm !important;
            margin-top: 0 !important;
          }

          .executive-report-content .px-6,
          .executive-report-content .px-5 {
            padding-left: 6px !important;
            padding-right: 6px !important;
          }

          .executive-report-content .py-6,
          .executive-report-content .py-5,
          .executive-report-content .py-4 {
            padding-top: 5px !important;
            padding-bottom: 5px !important;
          }

          .executive-report-content > div:first-child {
            margin-bottom: 3mm !important;
          }

          .executive-report-content > div:first-child h1 {
            font-size: 19px !important;
            line-height: 1 !important;
          }

          .executive-report-content > div:first-child p {
            font-size: 9px !important;
          }

          .executive-reports-section {
            margin: 0 0 3mm !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .executive-reports-pagebreak {
            break-before: auto !important;
            page-break-before: auto !important;
          }

          .executive-reports-print-page-2 {
            break-before: auto !important;
            page-break-before: auto !important;
          }

          .executive-reports-scroll {
            max-height: none !important;
            overflow: visible !important;
          }

          .executive-reports-summary-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 4px !important;
          }

          .executive-reports-summary-card {
            min-height: 0 !important;
            border-radius: 8px !important;
            padding: 6px !important;
          }

          .executive-reports-summary-card > div:first-child {
            margin-bottom: 4px !important;
            gap: 4px !important;
          }

          .executive-reports-summary-card [class*="h-9"] {
            width: 22px !important;
            height: 22px !important;
            border-radius: 7px !important;
          }

          .executive-reports-summary-card svg,
          .executive-reports-marketing-card svg,
          .executive-reports-stat-card svg {
            width: 10px !important;
            height: 10px !important;
          }

          .executive-reports-summary-card span,
          .executive-reports-summary-card div,
          .executive-reports-summary-card p {
            font-size: 7.6px !important;
            line-height: 1.18 !important;
          }

          .executive-reports-summary-card > div:nth-child(2) {
            font-size: 14px !important;
            line-height: 1 !important;
          }

          .executive-reports-card > div[class*="border-b"] {
            padding: 5px 7px !important;
            gap: 4px !important;
          }

          .executive-reports-card > div[class*="border-b"] p:first-child {
            font-size: 10px !important;
            line-height: 1.1 !important;
            letter-spacing: -0.01em !important;
          }

          .executive-reports-card > div[class*="border-b"] p + p {
            margin-top: 2px !important;
            font-size: 7.5px !important;
            line-height: 1.2 !important;
          }

          .executive-report-content table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 7.4px !important;
          }

          .executive-report-content th,
          .executive-report-content td {
            padding: 3px 4px !important;
            font-size: 7.4px !important;
            line-height: 1.2 !important;
            white-space: normal !important;
          }

          .executive-report-content thead tr {
            background: #f3f6fb !important;
          }

          .executive-report-content .rounded-\\[18px\\] {
            border-radius: 8px !important;
          }

          .executive-reports-marketing-grid {
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 4px !important;
          }

          .executive-reports-marketing-card {
            border-radius: 8px !important;
            padding: 6px !important;
            box-shadow: none !important;
            min-height: 0 !important;
          }

          .executive-reports-marketing-card > div:first-child {
            margin-bottom: 4px !important;
            gap: 4px !important;
          }

          .executive-reports-marketing-card [class*="h-9"] {
            width: 22px !important;
            height: 22px !important;
            border-radius: 7px !important;
          }

          .executive-reports-marketing-card p:first-of-type {
            font-size: 14px !important;
            line-height: 1 !important;
          }

          .executive-reports-marketing-card p {
            margin-top: 2px !important;
            font-size: 7.5px !important;
            line-height: 1.2 !important;
          }

          .executive-reports-operational-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 4px !important;
          }

          .executive-reports-stat-card {
            min-height: 0 !important;
            border-radius: 8px !important;
            padding: 6px !important;
          }

          .executive-reports-stat-card > div:first-child {
            width: 22px !important;
            height: 22px !important;
            margin-bottom: 4px !important;
            border-radius: 7px !important;
          }

          .executive-reports-stat-card p:first-of-type {
            font-size: 14px !important;
            line-height: 1 !important;
          }

          .executive-reports-stat-card p {
            margin-top: 2px !important;
            font-size: 7.5px !important;
            line-height: 1.2 !important;
          }

          .executive-report-content footer {
            margin-top: 3mm !important;
            padding-top: 4px !important;
            font-size: 7.5px !important;
            letter-spacing: 0.12em !important;
          }
        }
      `}</style>
  );
}
