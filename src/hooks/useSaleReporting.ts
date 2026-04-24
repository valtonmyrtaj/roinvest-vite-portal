import { useCallback, useEffect, useRef, useState } from "react";
import { reporting } from "../lib/api";
import type {
  ReportingMetricsRow,
  ReportingMonthlySeriesRow,
  ReportingTypologyBreakdownRow,
} from "../lib/api/reporting";
import type { OwnerCategory } from "./useUnits";

export type SaleReportingOwnerScope = OwnerCategory | "all";

export interface SaleReportingMetrics {
  ownerScope: SaleReportingOwnerScope;
  periodYear: number | null;
  periodMonth: number | null;
  soldUnits: number;
  contractedValue: number;
  collectedValue: number;
  pendingValue: number;
  hasPaymentData: boolean;
}

export interface SaleReportingMonthlySeriesPoint {
  ownerScope: SaleReportingOwnerScope;
  seriesYear: number;
  monthNumber: number;
  monthLabel: string;
  monthShortLabel: string;
  soldUnits: number;
  contractedValue: number;
}

export interface SaleReportingTypologyBreakdownItem {
  ownerScope: SaleReportingOwnerScope;
  periodYear: number;
  periodMonth: number | null;
  typology: string;
  typologyOrder: number;
  soldUnits: number;
  contractedValue: number;
  unitRecordIds: string[];
  saleIds: string[];
}

function normalizeOwnerScope(
  ownerScope: string | null | undefined,
  fallbackOwnerScope: SaleReportingOwnerScope,
): SaleReportingOwnerScope {
  return ownerScope === "Investitor" ||
    ownerScope === "Pronarët e tokës" ||
    ownerScope === "Kompani ndërtimore" ||
    ownerScope === "all"
    ? ownerScope
    : fallbackOwnerScope;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeRow(
  row: ReportingMetricsRow,
  fallbackOwnerScope: SaleReportingOwnerScope,
): SaleReportingMetrics {
  return {
    ownerScope: normalizeOwnerScope(row.owner_scope, fallbackOwnerScope),
    periodYear: row.period_year ?? null,
    periodMonth: row.period_month ?? null,
    soldUnits: toNumber(row.sold_units),
    contractedValue: toNumber(row.contracted_value),
    collectedValue: toNumber(row.collected_value),
    pendingValue: toNumber(row.pending_value),
    hasPaymentData: Boolean(row.has_payment_data),
  };
}

function normalizeMonthlySeriesRow(
  row: ReportingMonthlySeriesRow,
  fallbackOwnerScope: SaleReportingOwnerScope,
): SaleReportingMonthlySeriesPoint {
  return {
    ownerScope: normalizeOwnerScope(row.owner_scope, fallbackOwnerScope),
    seriesYear: toNumber(row.series_year),
    monthNumber: toNumber(row.month_number),
    monthLabel: row.month_label,
    monthShortLabel: row.month_short_label,
    soldUnits: toNumber(row.sold_units),
    contractedValue: toNumber(row.contracted_value),
  };
}

function normalizeTypologyBreakdownRow(
  row: ReportingTypologyBreakdownRow,
  fallbackOwnerScope: SaleReportingOwnerScope,
): SaleReportingTypologyBreakdownItem {
  return {
    ownerScope: normalizeOwnerScope(row.owner_scope, fallbackOwnerScope),
    periodYear: toNumber(row.period_year),
    periodMonth: row.period_month ?? null,
    typology: row.typology,
    typologyOrder: toNumber(row.typology_order),
    soldUnits: toNumber(row.sold_units),
    contractedValue: toNumber(row.contracted_value),
    unitRecordIds: Array.isArray(row.unit_record_ids) ? row.unit_record_ids : [],
    saleIds: Array.isArray(row.sale_ids) ? row.sale_ids : [],
  };
}

export function useSaleReporting({
  ownerScope = "all",
  year = null,
  month = null,
  enabled = true,
}: {
  ownerScope?: SaleReportingOwnerScope;
  year?: number | null;
  month?: number | null;
  enabled?: boolean;
}) {
  const [metrics, setMetrics] = useState<SaleReportingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);

  const fetchMetrics = useCallback(
    async (isActive: () => boolean = () => true) => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;

      setLoading(true);
      setError(null);

      const { data, error: apiError } = await reporting.getSaleMetrics({
        ownerScope,
        year,
        month,
      });

      if (!isActive() || latestRequestIdRef.current !== requestId) {
        return;
      }

      if (apiError) {
        setError(apiError);
        setLoading(false);
        return;
      }

      const row = data?.[0];

      setMetrics(
        row
          ? normalizeRow(row, ownerScope)
          : {
              ownerScope,
              periodYear: year,
              periodMonth: month,
              soldUnits: 0,
              contractedValue: 0,
              collectedValue: 0,
              pendingValue: 0,
              hasPaymentData: false,
            },
      );
      setLoading(false);
    },
    [month, ownerScope, year],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isCancelled = false;

    Promise.resolve().then(() => {
      if (!isCancelled) {
        void fetchMetrics(() => !isCancelled);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [enabled, fetchMetrics]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    await fetchMetrics();
  }, [enabled, fetchMetrics]);

  return {
    metrics,
    loading: enabled ? loading : false,
    error: enabled ? error : null,
    refresh,
  };
}

export function useSaleMonthlySeries({
  ownerScope = "all",
  year,
}: {
  ownerScope?: SaleReportingOwnerScope;
  year: number | null;
}) {
  const [series, setSeries] = useState<SaleReportingMonthlySeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      if (year === null) {
        setSeries([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: apiError } = await reporting.getSaleMonthlySeries({
        ownerScope,
        year,
      });

      if (isCancelled) {
        return;
      }

      if (apiError) {
        setError(apiError);
        setLoading(false);
        return;
      }

      setSeries((data ?? []).map((row) => normalizeMonthlySeriesRow(row, ownerScope)));
      setLoading(false);
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [ownerScope, year]);

  return {
    series,
    loading,
    error,
  };
}

export function useSaleTypologyBreakdown({
  ownerScope = "all",
  year,
  month = null,
}: {
  ownerScope?: SaleReportingOwnerScope;
  year: number | null;
  month?: number | null;
}) {
  const [rows, setRows] = useState<SaleReportingTypologyBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      if (year === null) {
        setRows([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: apiError } = await reporting.getSaleTypologyBreakdown({
        ownerScope,
        year,
        month,
      });

      if (isCancelled) {
        return;
      }

      if (apiError) {
        setError(apiError);
        setLoading(false);
        return;
      }

      setRows((data ?? []).map((row) => normalizeTypologyBreakdownRow(row, ownerScope)));
      setLoading(false);
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [month, ownerScope, year]);

  return {
    rows,
    loading,
    error,
  };
}
