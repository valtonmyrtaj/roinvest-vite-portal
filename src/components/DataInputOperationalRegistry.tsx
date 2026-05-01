import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PillBadge } from "./ui/PillBadge";
import { CardSectionHeader } from "./ui/CardSectionHeader";
import { SectionEyebrow } from "./ui/Eyebrow";
import {
  TABULAR_HEADER_LABEL_CLASS,
  TABULAR_HEADER_ROW_CLASS,
} from "./ui/tabularHeader";
import { LEVELS } from "../lib/unitLevel";
import type { Payment } from "../hooks/usePayments";
import { getUnitContractValue, getUnitFinalSalePrice } from "../lib/unitFinancials";
import { normalizeCompatibleUnitFields } from "../lib/unitCompatibility";
import { CANONICAL_UNIT_TYPES, getUnitTypeDisplay } from "../lib/unitType";

export interface RegistryUnit {
  id: string;
  unit_id?: string | null;
  block?: string | null;
  size?: string | number | null;
  type?: string | null;
  typology?: string | null;
  level?: string | number | null;
  floor?: string | number | null;
  owner_category?: string | null;
  owner_name?: string | null;
  area?: string | number | null;
  gross_area?: string | number | null;
  price?: string | number | null;
  final_price?: string | number | null;
  status?: string | null;
  payment_type?: string | null;
  sale_date?: string | null;
}

interface DataInputOperationalRegistryProps {
  units: RegistryUnit[];
  payments?: Payment[];
  onEdit: (unit: RegistryUnit) => void;
  highlightedUnitId?: string | null;
  /** Unit row that should briefly flash after a just-completed sale. */
  flashUnitId?: string | null;
  onPaymentNavigate?: (unit: RegistryUnit) => void;
}

interface RegistryRow {
  unit: RegistryUnit;
  unitId: string;
  block: string;
  type: string;
  level: string;
  ownerCategory: string;
  ownerName: string;
  area: number | null;
  status: string;
  price: number | null;
  paymentType: string | null;
  nextPayment: Payment | null;
  paymentCount: number;
}

const ALL_OWNERSHIP = "Të gjitha kategoritë";
const ALL_OWNERS = "Të gjithë pronarët";
const ALL_BLOCKS = "Të gjitha blloqet";
const ALL_TYPES = "Të gjitha llojet";
const ALL_LEVELS = "Të gjitha nivelet";
const ALL_STATUSES = "Të gjitha statuset";

const TYPE_FILTER_OPTIONS = [ALL_TYPES, ...CANONICAL_UNIT_TYPES] as const;
const registryCategoryPillStyle = {
  background: "#f7f7f8",
  color: "rgba(15,23,42,0.66)",
  border: "1px solid #e5e7eb",
} as const;

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const sortLabels = (values: string[]) => values.sort((left, right) => left.localeCompare(right, "sq"));

const normalizeOwnershipCategory = (value: string | null | undefined): string => {
  if (!value) {
    return "Pa kategorizim";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.includes("invest")) {
    return "Investitor";
  }

  if (normalized.includes("tok") || normalized.includes("pronar")) {
    return "Pronarët e tokës";
  }

  if (
    normalized.includes("kompani") ||
    normalized.includes("ndërt") ||
    normalized.includes("ndert")
  ) {
    return "Kompani ndërtimore";
  }

  return value;
};

const statusStyleFor = (status: string) => {
  if (status === "Në dispozicion") {
    return {
      background: "#eef7f1",
      color: "#6f9a7f",
      border: "1px solid transparent",
      fontWeight: 400,
    };
  }

  if (status === "E rezervuar") {
    return {
      background: "#fff8ea",
      color: "#c29634",
      border: "1px solid transparent",
      fontWeight: 400,
    };
  }

  if (status === "E shitur") {
    return {
      background: "#fcf0f0",
      color: "#cb7676",
      border: "1px solid transparent",
      fontWeight: 400,
    };
  }

  return {
    background: "#f4f4f6",
    color: "rgba(0,0,0,0.44)",
    border: "1px solid transparent",
    fontWeight: 400,
  };
};

const formatCurrency = (value: number | null) => {
  if (value === null) {
    return "-";
  }

  return currencyFormatter.format(value);
};

const formatArea = (value: number | null) => {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value)} m²`;
};

const SQ_MONTHS = [
  "Janar",
  "Shkurt",
  "Mars",
  "Prill",
  "Maj",
  "Qershor",
  "Korrik",
  "Gusht",
  "Shtator",
  "Tetor",
  "Nëntor",
  "Dhjetor",
] as const;

const normalizePaymentType = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("këst") || normalized.includes("kest")) {
    return "Me këste";
  }
  if (normalized.includes("plot")) {
    return "Pagesë e plotë";
  }
  return value;
};

const formatCompactDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "—";
  return `${String(day).padStart(2, "0")} ${SQ_MONTHS[month - 1]} ${year}`;
};

const getPaymentFollowUp = (row: RegistryRow) => {
  if (row.status !== "E shitur") {
    return { primary: "—", secondary: null, secondaryClassName: "text-black/32" };
  }

  const paymentType = normalizePaymentType(row.paymentType);

  if (paymentType === "Pagesë e plotë") {
    if (row.nextPayment) {
      return {
        primary: "Pagesë e plotë",
        secondary:
          row.nextPayment.status === "E vonuar"
            ? `Në vonesë · ${formatCompactDate(row.nextPayment.due_date)}`
            : `Për pagesë · ${formatCompactDate(row.nextPayment.due_date)}`,
        secondaryClassName:
          row.nextPayment.status === "E vonuar" ? "text-[#b14b4b]" : "text-black/38",
      };
    }

    return {
      primary: "Pagesë e plotë",
      secondary: row.paymentCount > 0 ? "E arkëtuar plotësisht" : "Pagesa nuk është regjistruar ende",
      secondaryClassName: "text-black/38",
    };
  }

  if (paymentType === "Me këste") {
    if (row.nextPayment) {
      return {
        primary: "Me këste",
        secondary: `Kësti #${row.nextPayment.installment_number} · ${formatCompactDate(row.nextPayment.due_date)}`,
        secondaryClassName:
          row.nextPayment.status === "E vonuar" ? "text-[#b14b4b]" : "text-black/38",
      };
    }

    return {
      primary: "Me këste",
      secondary: row.paymentCount > 0 ? "Të gjitha të paguara" : "Këstet nuk janë regjistruar ende",
      secondaryClassName: "text-black/38",
    };
  }

  if (row.nextPayment) {
    return {
      primary: "Plani i pagesave",
      secondary: `Kësti #${row.nextPayment.installment_number} · ${formatCompactDate(row.nextPayment.due_date)}`,
      secondaryClassName:
        row.nextPayment.status === "E vonuar" ? "text-[#b14b4b]" : "text-black/38",
    };
  }

  if (row.paymentCount > 0) {
    return {
      primary: "Plani i pagesave",
      secondary: "Të gjitha të paguara",
      secondaryClassName: "text-black/38",
    };
  }

  return {
    primary: "Plani i pagesave",
    secondary: "Nuk është regjistruar ende",
    secondaryClassName: "text-black/38",
  };
};

const FilterSelect = ({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[];
  onChange: (next: string) => void;
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={placeholder}
        onClick={() => setOpen((current) => !current)}
        className="flex h-[42px] w-full items-center justify-between rounded-[13px] border border-[#e4e7ed] bg-white px-3 text-[13px] font-normal text-black/66 shadow-none outline-none transition hover:border-[#dcdce2] focus-visible:border-[#c8d3e8] focus-visible:ring-2 focus-visible:ring-[#003883]/8"
      >
        <span className="truncate font-normal">{value || placeholder}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-black/30 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-[16px] border border-[#e8e8ec] bg-white p-1 shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
          <div className="max-h-72 overflow-auto">
            {options.map((option) => {
              const isSelected = option === value;

              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex h-10 w-full items-center justify-between rounded-[12px] px-3 text-left text-[13px] font-normal transition ${
                    isSelected
                      ? "bg-[#f3f7ff] text-[#003883]"
                      : "text-black/66 hover:bg-[#f7f7fa]"
                  }`}
                >
                  <span className="truncate font-normal">{option}</span>
                  <span className="ml-3 flex w-4 justify-center">
                    {isSelected ? <Check size={14} className="text-[#003883]" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export function DataInputOperationalRegistry({
  units,
  payments = [],
  onEdit,
  highlightedUnitId = null,
  flashUnitId = null,
  onPaymentNavigate,
}: DataInputOperationalRegistryProps) {
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const [searchTerm, setSearchTerm] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState(ALL_OWNERSHIP);
  const [ownerFilter, setOwnerFilter] = useState(ALL_OWNERS);
  const [blockFilter, setBlockFilter] = useState(ALL_BLOCKS);
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [levelFilter, setLevelFilter] = useState(ALL_LEVELS);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);

  const paymentsByUnitId = useMemo(() => {
    const next = new Map<string, Payment[]>();

    payments.forEach((payment) => {
      const current = next.get(payment.unit_id) ?? [];
      current.push(payment);
      next.set(payment.unit_id, current);
    });

    next.forEach((unitPayments, unitId) => {
      next.set(
        unitId,
        [...unitPayments].sort((left, right) => left.due_date.localeCompare(right.due_date)),
      );
    });

    return next;
  }, [payments]);

  const rows = useMemo<RegistryRow[]>(
    () =>
      units.map((unit) => {
        const unitPayments = paymentsByUnitId.get(unit.id) ?? [];
        const nextPayment =
          unitPayments.find((payment) => payment.status !== "E paguar") ?? null;
        const normalizedUnit = normalizeCompatibleUnitFields(unit as unknown as Record<string, unknown>);
        const finalSalePrice = getUnitFinalSalePrice(unit);

        return {
          unit,
          unitId: normalizedUnit.unitId || unit.id,
          block: unit.block?.trim() || "-",
          type: getUnitTypeDisplay(unit.type ?? normalizedUnit.type, normalizedUnit.level),
          level: normalizedUnit.level,
          ownerCategory: normalizeOwnershipCategory(unit.owner_category),
          ownerName: unit.owner_name?.trim() || "Pa pronar",
          area: normalizedUnit.area,
          status: unit.status?.trim() || "Në dispozicion",
          price:
            finalSalePrice !== null
              ? getUnitContractValue(unit)
              : normalizedUnit.listingPrice,
          paymentType: normalizePaymentType(unit.payment_type),
          nextPayment,
          paymentCount: unitPayments.length,
        };
      }),
    [paymentsByUnitId, units],
  );

  const ownershipOptions = useMemo(
    () => [ALL_OWNERSHIP, ...sortLabels(Array.from(new Set(rows.map((row) => row.ownerCategory))))],
    [rows],
  );

  const ownerScopedRows = useMemo(
    () =>
      ownershipFilter === ALL_OWNERSHIP
        ? rows
        : rows.filter((row) => row.ownerCategory === ownershipFilter),
    [ownershipFilter, rows],
  );

  const ownerOptions = useMemo(
    () => [ALL_OWNERS, ...sortLabels(Array.from(new Set(ownerScopedRows.map((row) => row.ownerName))))],
    [ownerScopedRows],
  );

  const blockOptions = useMemo(
    () => [ALL_BLOCKS, ...sortLabels(Array.from(new Set(rows.map((row) => row.block))))],
    [rows],
  );

  // Hardcoded — options are always the four category labels, not derived from raw data
  const typeOptions = [...TYPE_FILTER_OPTIONS];

  const levelOptions = useMemo(() => [ALL_LEVELS, ...LEVELS], []);

  const statusOptions = useMemo(
    () => [ALL_STATUSES, ...sortLabels(Array.from(new Set(rows.map((row) => row.status))))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      if (normalizedSearch && !row.unitId.toLowerCase().includes(normalizedSearch)) {
        return false;
      }

      if (ownershipFilter !== ALL_OWNERSHIP && row.ownerCategory !== ownershipFilter) {
        return false;
      }

      if (ownerFilter !== ALL_OWNERS && row.ownerName !== ownerFilter) {
        return false;
      }

      if (blockFilter !== ALL_BLOCKS && row.block !== blockFilter) {
        return false;
      }

      if (typeFilter !== ALL_TYPES) {
        if (row.type !== typeFilter) return false;
      }

      if (levelFilter !== ALL_LEVELS && row.level !== levelFilter) {
        return false;
      }

      if (statusFilter !== ALL_STATUSES && row.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [
    blockFilter,
    levelFilter,
    ownerFilter,
    ownershipFilter,
    rows,
    searchTerm,
    statusFilter,
    typeFilter,
  ]);

  const activeFilterCount = [
    searchTerm.trim(),
    ownershipFilter !== ALL_OWNERSHIP ? ownershipFilter : "",
    ownerFilter !== ALL_OWNERS ? ownerFilter : "",
    blockFilter !== ALL_BLOCKS ? blockFilter : "",
    typeFilter !== ALL_TYPES ? typeFilter : "",
    levelFilter !== ALL_LEVELS ? levelFilter : "",
    statusFilter !== ALL_STATUSES ? statusFilter : "",
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;
  const toolbarPrimaryMeta = `${filteredRows.length} njësi në listë`;
  const toolbarSecondaryMeta = hasActiveFilters
    ? `${activeFilterCount} filtra aktivë`
    : "Pa filtra shtesë";

  const handleClearFilters = () => {
    setSearchTerm("");
    setOwnershipFilter(ALL_OWNERSHIP);
    setOwnerFilter(ALL_OWNERS);
    setBlockFilter(ALL_BLOCKS);
    setTypeFilter(ALL_TYPES);
    setLevelFilter(ALL_LEVELS);
    setStatusFilter(ALL_STATUSES);
  };

  useEffect(() => {
    if (!highlightedUnitId) return;
    const highlightedRow = rowRefs.current.get(highlightedUnitId);
    if (!highlightedRow) return;
    highlightedRow.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedUnitId]);

  return (
    <section
      data-operational-registry="true"
      className="mx-auto max-w-[1280px] px-5 py-7 sm:px-6 md:px-10 md:py-8"
    >
      <SectionEyebrow
        className="mb-4"
        label="Regjistri i njësive"
        detail="lista e plotë e stokut"
      />

      <div className="overflow-hidden rounded-[20px] border border-[#e6e8ee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_42px_rgba(15,23,42,0.035)]">
        <CardSectionHeader
          title="Regjistri"
          subtitle={`${filteredRows.length} nga ${rows.length} njësi në listë`}
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
              {hasActiveFilters ? `${activeFilterCount} filtra aktivë` : "Pamje e plotë"}
            </span>
          }
        />

        <div className="border-b border-[#eef0f4] bg-[#fcfcfd] px-5 pb-3 pt-4">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.65fr)_repeat(6,minmax(0,0.95fr))]">
            <label className="md:col-span-2 xl:col-span-1">
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Kërko sipas ID-së
              </span>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-[42px] w-full rounded-[13px] border border-[#e4e7ed] bg-white pl-9 pr-3 text-[13px] font-normal text-black/70 outline-none transition placeholder:font-normal placeholder:text-black/24 focus:border-[#c8d3e8] focus:shadow-[0_0_0_3px_rgba(0,56,131,0.05)]"
                />
              </div>
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Blloku
              </span>
              <FilterSelect
                options={blockOptions}
                value={blockFilter}
                onChange={setBlockFilter}
                placeholder="Të gjitha blloqet"
              />
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Lloji
              </span>
              <FilterSelect
                options={typeOptions}
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="Të gjitha llojet"
              />
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Niveli
              </span>
              <FilterSelect
                options={levelOptions}
                value={levelFilter}
                onChange={setLevelFilter}
                placeholder="Të gjitha nivelet"
              />
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Statusi
              </span>
              <FilterSelect
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Të gjitha statuset"
              />
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Pronësia
              </span>
              <FilterSelect
                options={ownershipOptions}
                value={ownershipFilter}
                onChange={(next) => {
                  setOwnershipFilter(next);
                  setOwnerFilter(ALL_OWNERS);
                }}
                placeholder="Të gjitha pronësitë"
              />
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Pronari
              </span>
              <FilterSelect
                options={ownerOptions}
                value={ownerFilter}
                onChange={setOwnerFilter}
                placeholder="Të gjithë pronarët"
              />
            </label>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0f4] pt-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
              <span className="font-medium text-black/48">{toolbarPrimaryMeta}</span>
              <span className="inline-block h-[4px] w-[4px] rounded-full bg-black/[0.14]" />
              <span className="text-black/34">{toolbarSecondaryMeta}</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-[10px] border border-[#dbe3f2] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#003883] transition hover:bg-[#f8fbff]"
              >
                Pastro filtrat
              </button>
            )}
          </div>
        </div>

          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[1160px] text-[12px] font-normal">
              <thead className="sticky top-0 z-10">
                <tr className={TABULAR_HEADER_ROW_CLASS}>
                  {[
                    "Njësia",
                    "Blloku",
                    "Lloji",
                    "Niveli",
                    "Pronësia",
                    "Pronari",
                    "Sipërfaqja",
                    "Statusi",
                    "Pagesa",
                    "Çmimi",
                    "Veprim",
                  ].map((heading, index) => (
                    <th
                      key={heading}
                      className={`whitespace-nowrap py-3 ${TABULAR_HEADER_LABEL_CLASS} ${
                        index === 0
                          ? "pl-6 pr-3 text-left"
                          : index === 4
                            ? "pl-4 pr-3 text-left"
                          : index === 8
                            ? "px-3 text-left"
                            : index === 9
                            ? "pl-3 pr-3 text-right"
                            : index === 10
                              ? "pl-3 pr-6 text-center"
                              : index >= 7
                                ? "px-3 text-center"
                                : "px-3 text-left"
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr className="border-t border-[#f0f0f2]">
                    <td colSpan={11} className="py-16 text-center">
                      <p className="text-[13px] font-medium text-black/40">
                        {units.length === 0
                          ? "Nuk ka njësi të regjistruara ende për këtë kategori."
                          : "Asnjë njësi nuk përputhet me filtrat aktualë."}
                      </p>
                      <p className="mt-1 text-[11.5px] text-black/28">
                        {units.length === 0
                          ? "Shto hyrjen e parë më sipër për ta nisur regjistrin."
                          : "Rishikoni filtrat për ta rikthyer listën e plotë."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const paymentFollowUp = getPaymentFollowUp(row);
                    const isHighlighted = highlightedUnitId === row.unit.id;
                    const isFlashing = flashUnitId === row.unit.id;
                    const hasInteractivePaymentContext =
                      row.status === "E shitur" && !!onPaymentNavigate;

                    const rowRefCallback = (node: HTMLTableRowElement | null) => {
                      if (node) {
                        rowRefs.current.set(row.unit.id, node);
                      } else {
                        rowRefs.current.delete(row.unit.id);
                      }
                    };

                    const commonCells = (
                      <>
                        <td className="whitespace-nowrap py-4 pl-6 pr-3 text-[13px] font-normal text-black/78">
                          {row.unitId}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-black/60">{row.block}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-black/70">{row.type}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-black/60">{row.level}</td>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-left">
                          <PillBadge weight="medium" style={registryCategoryPillStyle}>
                            {row.ownerCategory}
                          </PillBadge>
                        </td>
                        <td className="max-w-[220px] truncate whitespace-nowrap px-3 py-4 text-black/60">
                          {row.ownerName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-left text-black/60">
                          {formatArea(row.area)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-center">
                          <PillBadge weight="normal" style={statusStyleFor(row.status)}>
                            {row.status}
                          </PillBadge>
                        </td>
                        <td className="px-3 py-4 text-left">
                          {hasInteractivePaymentContext ? (
                            <button
                              type="button"
                              onClick={() => onPaymentNavigate?.(row.unit)}
                              className="group min-w-[140px] rounded-[10px] px-2 py-1 text-left transition hover:bg-[#f8f9fc] focus-visible:bg-[#f8f9fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003883]/10"
                              aria-label={`Hap pagesat për ${row.unitId} në Shitjet`}
                            >
                              <p className="whitespace-nowrap text-[11px] font-normal text-black/62 transition group-hover:text-[#003883]">
                                {paymentFollowUp.primary}
                              </p>
                              {paymentFollowUp.secondary ? (
                                <p
                                  className={`mt-1 whitespace-nowrap text-[10.5px] font-normal transition group-hover:opacity-80 ${paymentFollowUp.secondaryClassName}`}
                                >
                                  {paymentFollowUp.secondary}
                                </p>
                              ) : null}
                            </button>
                          ) : (
                            <div className="min-w-[140px] px-2 py-1">
                              <p className="whitespace-nowrap text-[11px] font-normal text-black/62">
                                {paymentFollowUp.primary}
                              </p>
                              {paymentFollowUp.secondary ? (
                                <p className={`mt-1 whitespace-nowrap text-[10.5px] font-normal ${paymentFollowUp.secondaryClassName}`}>
                                  {paymentFollowUp.secondary}
                                </p>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-3 pr-3 text-right text-[13px] font-semibold text-black/75">
                          {formatCurrency(row.price)}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-3 pr-6 text-center">
                          <button
                            type="button"
                            onClick={() => onEdit(row.unit)}
                            className="rounded-[8px] border border-[#e8e8ec] bg-[#fbfcfe] px-2.5 py-1 text-[11px] font-medium text-black/42 transition hover:border-[#003883] hover:text-[#003883]"
                          >
                            Ndrysho
                          </button>
                        </td>
                      </>
                    );

                    if (isFlashing) {
                      return (
                        <motion.tr
                          key={row.unit.id}
                          ref={rowRefCallback}
                          initial={{ backgroundColor: "rgba(177,75,75,0.08)" }}
                          animate={{ backgroundColor: "rgba(255,255,255,0)" }}
                          transition={{ duration: 2, ease: "easeOut" }}
                          className="border-t border-[#f0f0f2]"
                        >
                          {commonCells}
                        </motion.tr>
                      );
                    }

                    return (
                      <tr
                        key={row.unit.id}
                        ref={rowRefCallback}
                        className="border-t border-[#f0f0f2] transition hover:bg-[#fafafc]"
                        style={{
                          backgroundColor: isHighlighted ? "rgba(234,240,250,0.72)" : undefined,
                          boxShadow: isHighlighted ? "inset 3px 0 0 #003883" : undefined,
                        }}
                      >
                        {commonCells}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      </div>
    </section>
  );
}
