import { supabase } from "../supabase";
import type { ApiResult } from "./_types";
import { apiFail, apiOk } from "./_types";

// ─── Digital marketing (marketing_data) ──────────────────────────────────────

export interface MarketingRow {
  id: string;
  year: number;
  month: number; // 1–12
  spend_facebook: number;
  views_facebook: number;
  views_tiktok: number;
  leads_facebook: number;
  leads_instagram: number;
  leads_tiktok: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingInput {
  year: number;
  month: number;
  spend_facebook: number;
  views_facebook: number;
  views_tiktok: number;
  leads_facebook: number;
  leads_instagram: number;
  leads_tiktok: number;
}

// ─── Offline marketing (marketing_offline) ───────────────────────────────────

export interface OfflineEntry {
  id: string;
  channel: string;
  description: string | null;
  amount: number;
  period_type: "Mujore" | "Vjetore";
  year: number;
  month: number | null; // 1–12, only for Mujore
  date: string;         // ISO date string
  created_at: string;
  updated_at?: string;
}

export interface OfflineInput {
  channel: string;
  description?: string | null;
  amount: number;
  period_type: "Mujore" | "Vjetore";
  year: number;
  month?: number | null;
  date: string;
}

const DIGITAL_VALUE_FIELDS: Array<keyof Pick<
  MarketingInput,
  | "spend_facebook"
  | "views_facebook"
  | "views_tiktok"
  | "leads_facebook"
  | "leads_instagram"
  | "leads_tiktok"
>> = [
  "spend_facebook",
  "views_facebook",
  "views_tiktok",
  "leads_facebook",
  "leads_instagram",
  "leads_tiktok",
];

function isValidMonth(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year > 0;
}

function validateDigitalInput(input: MarketingInput): string | null {
  if (!isValidYear(input.year)) return "Zgjidh vitin.";
  if (!isValidMonth(input.month)) return "Zgjidh muajin.";

  for (const field of DIGITAL_VALUE_FIELDS) {
    const value = input[field];
    if (!Number.isFinite(value) || value < 0) {
      return "Vlerat e marketingut digjital duhet të jenë 0 ose më shumë.";
    }
  }

  return null;
}

function validateOfflineInput(input: OfflineInput): string | null {
  if (!input.channel.trim()) return "Zgjidh kanalin.";
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "Shuma duhet të jetë më e madhe se 0.";
  }
  if (input.period_type !== "Mujore" && input.period_type !== "Vjetore") {
    return "Zgjidh periudhën.";
  }
  if (!isValidYear(input.year)) return "Zgjidh vitin.";
  if (input.period_type === "Mujore" && !isValidMonth(input.month ?? 0)) {
    return "Zgjidh muajin.";
  }
  if (!input.date) return "Zgjidh datën.";

  return null;
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export interface MarketingBundle {
  digital: MarketingRow[];
  offline: OfflineEntry[];
}

/** Fetch both the digital monthly table and the offline entries in parallel. */
export async function listMarketing(): Promise<ApiResult<MarketingBundle>> {
  const [digitalRes, offlineRes] = await Promise.all([
    supabase
      .from("marketing_data")
      .select("*")
      .order("year",  { ascending: true })
      .order("month", { ascending: true }),
    supabase
      .from("marketing_offline")
      .select("*")
      .order("date", { ascending: false }),
  ]);

  if (digitalRes.error) return apiFail(digitalRes.error.message);
  if (offlineRes.error) return apiFail(offlineRes.error.message);

  return apiOk({
    digital: (digitalRes.data ?? []) as MarketingRow[],
    offline: (offlineRes.data ?? []) as OfflineEntry[],
  });
}

// ─── Digital marketing writes ────────────────────────────────────────────────

/**
 * Upsert digital monthly data — updates if a row for {year, month} exists,
 * inserts otherwise.
 */
export async function saveMonthlyData(input: MarketingInput): Promise<ApiResult<null>> {
  const validationError = validateDigitalInput(input);
  if (validationError) return apiFail(validationError);

  const { data: existing, error: lookupError } = await supabase
    .from("marketing_data")
    .select("id")
    .eq("year", input.year)
    .eq("month", input.month)
    .maybeSingle();

  if (lookupError) return apiFail(lookupError.message);

  if (existing?.id) {
    const { error } = await supabase
      .from("marketing_data")
      .update({
        spend_facebook:  input.spend_facebook,
        views_facebook:  input.views_facebook,
        views_tiktok:    input.views_tiktok,
        leads_facebook:  input.leads_facebook,
        leads_instagram: input.leads_instagram,
        leads_tiktok:    input.leads_tiktok,
      })
      .eq("id", existing.id);
    if (error) return apiFail(error.message);
    return apiOk(null);
  }

  const { error } = await supabase.from("marketing_data").insert(input);
  if (error) return apiFail(error.message);
  return apiOk(null);
}

/**
 * Update an existing digital row by id. Rejects the edit if moving it would
 * collide with another {year, month} row.
 */
export async function updateDigitalEntry(
  id: string,
  input: MarketingInput,
): Promise<ApiResult<null>> {
  const validationError = validateDigitalInput(input);
  if (validationError) return apiFail(validationError);

  const { data: duplicate, error: duplicateError } = await supabase
    .from("marketing_data")
    .select("id")
    .eq("year", input.year)
    .eq("month", input.month)
    .neq("id", id)
    .maybeSingle();

  if (duplicateError) return apiFail(duplicateError.message);
  if (duplicate?.id) {
    return apiFail("Ekziston tashmë një hyrje digjitale për këtë vit dhe muaj.");
  }

  const { error } = await supabase
    .from("marketing_data")
    .update({
      year:            input.year,
      month:           input.month,
      spend_facebook:  input.spend_facebook,
      views_facebook:  input.views_facebook,
      views_tiktok:    input.views_tiktok,
      leads_facebook:  input.leads_facebook,
      leads_instagram: input.leads_instagram,
      leads_tiktok:    input.leads_tiktok,
      updated_at:      new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return apiFail(error.message);
  return apiOk(null);
}

/** Delete a digital entry by id. */
export async function deleteDigitalEntry(id: string): Promise<ApiResult<null>> {
  const { error } = await supabase.from("marketing_data").delete().eq("id", id);
  if (error) return apiFail(error.message);
  return apiOk(null);
}

// ─── Offline marketing writes ────────────────────────────────────────────────

/** Insert a new offline entry. */
export async function createOfflineEntry(input: OfflineInput): Promise<ApiResult<null>> {
  const validationError = validateOfflineInput(input);
  if (validationError) return apiFail(validationError);

  const { error } = await supabase.from("marketing_offline").insert(input);
  if (error) return apiFail(error.message);
  return apiOk(null);
}

/** Update an existing offline entry by id. */
export async function updateOfflineEntry(
  id: string,
  input: OfflineInput,
): Promise<ApiResult<null>> {
  const validationError = validateOfflineInput(input);
  if (validationError) return apiFail(validationError);

  const { error } = await supabase
    .from("marketing_offline")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return apiFail(error.message);
  return apiOk(null);
}

/** Delete an offline entry by id. */
export async function deleteOfflineEntry(id: string): Promise<ApiResult<null>> {
  const { error } = await supabase.from("marketing_offline").delete().eq("id", id);
  if (error) return apiFail(error.message);
  return apiOk(null);
}
