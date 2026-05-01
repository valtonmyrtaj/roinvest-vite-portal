import { supabase } from "../supabase";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

// ─── Domain enum ─────────────────────────────────────────────────────────────

/**
 * Literal union of the categories the owner_entities table accepts.
 * Kept local to this module so the api layer does not depend on any
 * consumer hook. Structurally identical to OwnerCategory in useUnits,
 * which means the hook can pass either type without casting.
 */
export type OwnerEntityCategory =
  | "Investitor"
  | "Pronarët e tokës"
  | "Kompani ndërtimore";

// ─── Row type ────────────────────────────────────────────────────────────────

/** The narrow projection the consumer actually reads. */
export interface OwnerEntityRow {
  id: string;
  category: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ─── Write-result contract (structured, code-preserving) ─────────────────────

/**
 * Structured error for owner-entity writes. Preserves the Postgres error
 * code so callers can make domain-level decisions (e.g., "for this table,
 * a unique-violation means the entity already exists and that is fine")
 * without substring-matching on the message.
 */
export interface OwnerEntityWriteError {
  message: string;
  /** Postgres error code, when the underlying driver provides one. */
  code: string | null;
}

/**
 * Result shape for owner-entity writes. Intentionally richer than
 * ApiResult<null> because the hook needs `error.code` to distinguish
 * unique-violation from a genuine failure.
 */
export type OwnerEntityWriteResult<TData = null> =
  | { data: TData; error: null }
  | { data: null; error: OwnerEntityWriteError };

/**
 * Named Postgres error code for a unique-constraint violation. Exposed
 * here so consumers never hard-code the raw "23505" literal, and so the
 * constant has a single canonical home.
 */
export const POSTGRES_UNIQUE_VIOLATION_CODE = "23505";

// ─── Reads ───────────────────────────────────────────────────────────────────

/**
 * List all owner entities, ordered by creation time ascending.
 * Returns the narrow { category, name } projection the consumer uses.
 */
const OWNER_ENTITY_DETAIL_SELECT =
  "id, category, name, contact_person, phone, notes, created_at, updated_at";
const OWNER_ENTITY_LEGACY_SELECT = "id, category, name, created_at, updated_at";

function toLegacyOwnerEntityRows(
  rows: Array<{
    id: string;
    category: string;
    name: string;
    created_at: string | null;
    updated_at: string | null;
  }>,
): OwnerEntityRow[] {
  return rows.map((row) => ({
    ...row,
    contact_person: null,
    phone: null,
    notes: null,
  }));
}

function isMissingContactColumnError(message: string): boolean {
  return (
    message.includes("contact_person") ||
    message.includes("phone") ||
    message.includes("notes")
  );
}

export async function listOwnerEntities(): Promise<ApiResult<OwnerEntityRow[]>> {
  const { data, error } = await supabase
    .from("owner_entities")
    .select(OWNER_ENTITY_DETAIL_SELECT)
    .order("created_at", { ascending: true });

  if (error) {
    if (!isMissingContactColumnError(error.message)) {
      return apiFail(error.message);
    }

    const legacyResult = await supabase
      .from("owner_entities")
      .select(OWNER_ENTITY_LEGACY_SELECT)
      .order("created_at", { ascending: true });

    if (legacyResult.error) return apiFail(legacyResult.error.message);
    return apiOk(toLegacyOwnerEntityRows(legacyResult.data ?? []));
  }

  return apiOk((data ?? []) as OwnerEntityRow[]);
}

// ─── Writes ──────────────────────────────────────────────────────────────────

/**
 * Insert a new owner entity. The api layer does NOT interpret any error
 * code as benign — that decision belongs to the caller. We simply surface
 * the code so the caller can decide.
 */
export async function createOwnerEntity({
  category,
  name,
  contactPerson,
  phone,
  notes,
}: {
  category: OwnerEntityCategory;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  notes?: string | null;
}): Promise<OwnerEntityWriteResult<OwnerEntityRow>> {
  const { data, error } = await supabase
    .from("owner_entities")
    .insert({
      category,
      name,
      contact_person: contactPerson || null,
      phone: phone || null,
      notes: notes || null,
    })
    .select(OWNER_ENTITY_DETAIL_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: error.message, code: error.code ?? null } };
  }
  return { data: data as OwnerEntityRow, error: null };
}

/**
 * Rename an owner entity identified by (category, currentName).
 * The caller supplies `updatedAt` so timing decisions (batching, skew)
 * stay consumer-side — the api just passes it through.
 */
export async function renameOwnerEntity({
  category,
  currentName,
  nextName,
  updatedAt,
}: {
  category: OwnerEntityCategory;
  currentName: string;
  nextName: string;
  updatedAt: string;
}): Promise<OwnerEntityWriteResult<OwnerEntityRow>> {
  const { data, error } = await supabase
    .from("owner_entities")
    .update({ name: nextName, updated_at: updatedAt })
    .eq("category", category)
    .eq("name", currentName)
    .select(OWNER_ENTITY_DETAIL_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: error.message, code: error.code ?? null } };
  }
  return { data: data as OwnerEntityRow, error: null };
}

/** Upsert editable contact details for an owner entity. */
export async function saveOwnerEntityDetails({
  id,
  category,
  name,
  contactPerson,
  phone,
  notes,
  updatedAt,
}: {
  id?: string | null;
  category: OwnerEntityCategory;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  notes?: string | null;
  updatedAt: string;
}): Promise<OwnerEntityWriteResult<OwnerEntityRow>> {
  if (id && !id.startsWith("temp:")) {
    const { data, error } = await supabase
      .from("owner_entities")
      .update({
        contact_person: contactPerson || null,
        phone: phone || null,
        notes: notes || null,
        updated_at: updatedAt,
      })
      .eq("id", id)
      .select(OWNER_ENTITY_DETAIL_SELECT)
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code ?? null } };
    }

    return { data: data as OwnerEntityRow, error: null };
  }

  return createOwnerEntity({
    category,
    name,
    contactPerson,
    phone,
    notes,
  });
}

/** Delete an owner entity identified by (category, name). */
export async function deleteOwnerEntity({
  category,
  name,
}: {
  category: OwnerEntityCategory;
  name: string;
}): Promise<OwnerEntityWriteResult> {
  const { error } = await supabase
    .from("owner_entities")
    .delete()
    .eq("category", category)
    .eq("name", name);

  if (error) {
    return { data: null, error: { message: error.message, code: error.code ?? null } };
  }
  return { data: null, error: null };
}
