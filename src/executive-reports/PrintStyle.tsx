/**
 * Scoped print stylesheet for the Executive Reports page.
 *
 * Controls:
 *   • @page A4 portrait, 12mm margins
 *   • hides sidebar/topbar and `.executive-reports-print-hide` nodes in print
 *   • flattens shadows and tightens borders on `.executive-reports-card`
 *   • keeps each `.executive-reports-section` on a single page
 *   • forces page breaks before `.executive-reports-pagebreak`
 *   • un-clips `.executive-reports-scroll` so tables print in full
 *
 * Also defines the screen-time progress-bar width transition that
 * animates HeroMetricCard bars when the selected period changes.
 */
export function ExecutiveReportsPrintStyle() {
  return (
    <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        @media print {
          body {
            background: #fff !important;
          }

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

          .executive-reports-root {
            max-width: none !important;
            padding: 0 !important;
          }

          .executive-reports-card {
            box-shadow: none !important;
            border-color: #d9dce3 !important;
          }

          .executive-reports-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .executive-reports-pagebreak {
            break-before: page;
            page-break-before: always;
          }

          .executive-reports-scroll {
            max-height: none !important;
            overflow: visible !important;
          }
        }

        @keyframes executiveSummaryProgress {
          from {
            transform: scaleX(0);
          }

          to {
            transform: scaleX(1);
          }
        }

        .executive-summary-metric [style*="width:"] {
          transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .executive-summary-metric [style*="width:"][style*="%"] {
          transform-origin: left center;
          animation: executiveSummaryProgress 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
  );
}
