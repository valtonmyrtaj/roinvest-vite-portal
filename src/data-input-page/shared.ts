import type {
  Block,
  CreateUnitInput,
  Level,
  OwnerCategory,
  UnitStatus,
} from "../hooks/useUnits";
import type { CompleteUnitSaleInput, SalePaymentType } from "../lib/api/sales";
import { NAVY } from "../ui/tokens";

// ─── Brand / accent ──────────────────────────────────────────────────────────

export const ACCENT = NAVY;

// ─── Unit taxonomy (form + modal selectors) ──────────────────────────────────

export const BLOCKS: Block[] = ["Blloku A", "Blloku B", "Blloku C"];
export const TYPES = ["Garazhë", "Lokal", "1+1", "2+1", "3+1"] as const;
export const LEVELS: Level[] = [
  "Garazhë",
  "Përdhesa",
  "Kati 1",
  "Kati 2",
  "Kati 3",
  "Kati 4",
  "Kati 5",
  "Kati 6",
  "Penthouse",
];
export const STATUSES: UnitStatus[] = ["Në dispozicion", "E rezervuar", "E shitur"];
export const OWNER_CATEGORIES: OwnerCategory[] = [
  "Investitor",
  "Pronarët e tokës",
  "Kompani ndërtimore",
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

const APARTMENT_TYPES = new Set<string>(["1+1", "2+1", "3+1"]);

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
  if (APARTMENT_TYPES.has(type)) return "apartment";
  if (type === "Lokal") return "lokal";
  if (type === "Garazhë") return "garazhe";
  return "none";
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
  };
}

/** Full-row validity check used both for the per-draft save filter and the
 *  "Ruaj N njësi" counter label. Apartment and local units have extra
 *  required room fields beyond the generic required set. */
export function isDraftValid(d: DraftUnit): boolean {
  if (
    !(
      d.unit_id &&
      d.block &&
      d.type &&
      d.level &&
      d.size &&
      d.price &&
      d.owner_name &&
      d.status
    )
  )
    return false;
  const cat = roomCategory(d.type as string | undefined);
  if (cat === "apartment") {
    if (!d.bedrooms || d.bedrooms <= 0) return false;
    if (!d.bathrooms || d.bathrooms <= 0) return false;
  }
  if (cat === "lokal") {
    if (!d.toilets || d.toilets <= 0) return false;
  }
  return true;
}
