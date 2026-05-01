import type {
  Block,
  CreateUnitInput,
  OwnerCategory,
  UnitOrientation,
  UnitStatus,
} from "../hooks/useUnits";
import type { CompleteUnitSaleInput, SalePaymentType } from "../lib/api/sales";
import { CANONICAL_UNIT_TYPES, isApartmentStyleUnit } from "../lib/unitType";
import { NAVY } from "../ui/tokens";
export { LEVELS } from "../lib/unitLevel";

// ─── Brand / accent ──────────────────────────────────────────────────────────

export const ACCENT = NAVY;

// ─── Unit taxonomy (form + modal selectors) ──────────────────────────────────

export const BLOCKS: Block[] = ["Blloku A", "Blloku B", "Blloku C"];
export const TYPES = CANONICAL_UNIT_TYPES;
export const STATUSES: UnitStatus[] = ["Në dispozicion", "E rezervuar", "E shitur"];
export const DRAFT_UNIT_STATUSES: UnitStatus[] = ["Në dispozicion"];
export const MANUAL_UNIT_STATUSES: UnitStatus[] = ["Në dispozicion", "E shitur"];
export const OWNER_CATEGORIES: OwnerCategory[] = [
  "Investitor",
  "Pronarët e tokës",
  "Kompani ndërtimore",
];
export const ORIENTATION_OPTIONS: UnitOrientation[] = [
  "Veri",
  "Veri-Lindje",
  "Lindje",
  "Jug-Lindje",
  "Jug",
  "Jug-Perëndim",
  "Perëndim",
  "Veri-Perëndim",
];

export const OWNER_NAMES: Record<OwnerCategory, string[]> = {
  Investitor: ["UF Partners"],
  "Pronarët e tokës": [
    "Filan Selmani",
    "Besian Selmani",
    "Doktor Selmani",
    "Fistek Selmani",
  ],
  "Kompani ndërtimore": ["Ndertimi Company", "Molerat Company", "Rryma Company"],
};

function normalizeOwnerOption(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function getOwnerNameOptions(
  ownerCategory: OwnerCategory,
  dynamicOptions: string[] = [],
  preferredOptions: string[] = [],
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  [...preferredOptions, ...dynamicOptions, ...OWNER_NAMES[ownerCategory]].forEach((rawName) => {
    if (typeof rawName !== "string") return;

    const name = normalizeOwnerOption(rawName);
    if (!name) return;

    const key = name.toLocaleLowerCase("sq");
    if (seen.has(key)) return;

    seen.add(key);
    merged.push(name);
  });

  return merged;
}

export function getDefaultOwnerName(
  ownerCategory: OwnerCategory,
  dynamicOptions: string[] = [],
  preferredOptions: string[] = [],
): string {
  return getOwnerNameOptions(ownerCategory, dynamicOptions, preferredOptions)[0] ?? "";
}

// ─── Sale completion taxonomy ────────────────────────────────────────────────

export const SALE_PAYMENT_OPTIONS: SalePaymentType[] = [
  "Pagesë e plotë",
  "Me këste",
];

const SALE_SUCCESS_MONTHS_ALB = [
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
];

// ─── Page-local types ────────────────────────────────────────────────────────

/** Draft unit used in the "Shto njësi" list — partial because the user fills
 *  the row gradually. `_key` is a client-only stable id for keyed rendering. */
export type DraftUnit = Partial<CreateUnitInput> & { _key: string };

/** One row inside the installment editor of the sale-completion section. */
export type SaleInstallmentDraft = {
  due_date: string;
  amount: string;
  notes: string;
};

/** Discriminated payload handed from `EditModal` to the page-level save
 *  handler. `update` is a pure unit edit; `sale` is the
 *  status → "E shitur" transition that must also invoke `complete_unit_sale`. */
export type EditModalSavePayload =
  | {
      mode: "update";
      changes: Partial<CreateUnitInput>;
      reason: string;
    }
  | {
      mode: "sale";
      genericChanges: Partial<CreateUnitInput>;
      reason: string;
      sale: CompleteUnitSaleInput;
    };

export type ManualUnitReservationPayload = {
  contactName: string;
  contactPhone: string;
  expiresAt: string;
  notes: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Format an ISO date as Albanian "D Muaji YYYY" (e.g. "3 Prill 2026"). */
export function formatAlbanianDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  const monthIdx = Number(month) - 1;
  if (monthIdx < 0 || monthIdx > 11) return iso;
  return `${String(Number(day))} ${SALE_SUCCESS_MONTHS_ALB[monthIdx]} ${year}`;
}

/** Classify a unit type into the room-requirement bucket that drives which
 *  room fields appear in the form and which are required for validation. */
export function roomCategory(
  type: string | undefined,
): "apartment" | "lokal" | "garazhe" | "none" {
  if (!type) return "none";
  if (isApartmentStyleUnit(type)) return "apartment";
  if (type === "Lokal") return "lokal";
  if (type === "Garazhë") return "garazhe";
  return "none";
}

export function normalizeOptionalArea(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function emptyDraft(
  ownerCategory: OwnerCategory,
  ownerNameOptions: string[] = [],
): DraftUnit {
  return {
    _key: crypto.randomUUID(),
    owner_category: ownerCategory,
    owner_name: getDefaultOwnerName(ownerCategory, ownerNameOptions),
    status: "Në dispozicion",
    block: undefined,
    type: undefined,
    level: undefined,
    size: undefined,
    price: undefined,
    unit_id: "",
    reservation_expires_at: null,
    notes: "",
    bedrooms: undefined,
    bathrooms: undefined,
    toilets: undefined,
    orientation: undefined,
    has_storage: false,
    balcony_area: undefined,
    terrace_area: undefined,
  };
}

/** Full-row validity check used both for the per-draft save filter and the
 *  "Ruaj N njësi" counter label. Room metadata is optional and secondary;
 *  only the core operational fields are required to save a draft unit. */
export function isDraftValid(d: DraftUnit): boolean {
  const hasValidSize = typeof d.size === "number" && Number.isFinite(d.size) && d.size > 0;
  const hasValidPrice =
    typeof d.price === "number" && Number.isFinite(d.price) && d.price > 0;

  if (
    !(
      d.unit_id &&
      d.block &&
      d.type &&
      d.level &&
      hasValidSize &&
      hasValidPrice &&
      d.owner_name &&
      d.status
    )
  )
    return false;
  return true;
}
