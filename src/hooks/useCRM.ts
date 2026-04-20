import { useState, useEffect, useCallback, useRef } from "react";
import * as crmApi from "../lib/api/crm";
import * as unitsApi from "../lib/api/units";
import * as salesApi from "../lib/api/sales";
import {
  type SaleInstallmentInput,
  type SalePaymentType,
} from "../lib/api/sales";
import { apiFail, type ApiResult } from "../lib/api/_types";
import type { Database } from "../lib/database.types";

export type LeadStatus =
  | "I ri"
  | "Kontaktuar"
  | "I interesuar"
  | "Në negociata"
  | "Konvertuar"
  | "Refuzuar";

export type LeadSource =
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "Rekomandim"
  | "Tjetër";

export type ShowingStatus = "E planifikuar" | "E kryer" | "E anuluar";
export type ShowingOutcome = "Pa rezultat" | "Rezervoi" | "Bleu";

export interface CRMLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// CRMShowing uses `scheduled_at` internally (built from date+time) for display/sorting
// The actual DB columns are: contact_id, unit_id, date, time, status, notes
export interface CRMShowing {
  id: string;
  contact_id: string;   // DB column name
  lead_name?: string;   // joined from crm_leads
  unit_id: string;
  unit_record_id?: string | null;
  date: string;         // DB column: YYYY-MM-DD
  time: string | null;  // DB column: HH:MM text
  scheduled_at: string; // derived: date + time, for display/sorting
  status: ShowingStatus;
  outcome?: ShowingOutcome | null;
  notes: string | null;
  created_at: string;
}

export interface CreateLeadInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  status: LeadStatus;
  notes?: string | null;
}

// Matches what CRMContent sends (lead_id + scheduled_at)
// The hook translates these to the actual DB columns (contact_id, date, time)
export interface CreateShowingInput {
  lead_id: string;       // mapped → contact_id in DB
  unit_id: string;
  scheduled_at: string;  // ISO string, split → date + time for DB
  status: ShowingStatus;
  notes?: string | null;
}

export interface ManualShowingContactInput {
  first_name: string;
  last_name: string;
  phone: string;
}

export interface CreateShowingInput {
  manual_contact?: ManualShowingContactInput | null;
  outcome?: ShowingOutcome;
}

export interface CompleteShowingSaleInput {
  showing_id: string;
  unit_id: string;
  lead_id?: string | null;
  buyer_name: string;
  sale_date: string;
  final_price: number;
  payment_type: SalePaymentType;
  notes?: string | null;
  installments?: SaleInstallmentInput[];
}

function buildScheduledAt(date: string, time: string | null): string {
  return `${date}T${time ?? "00:00"}`;
}

function buildManualLeadName(input: ManualShowingContactInput): string {
  return `${input.first_name.trim()} ${input.last_name.trim()}`.trim();
}

const MANUAL_CONTACT_ROLLBACK_ERROR =
  "Shfaqja nuk u ruajt dot. Kontakti i ri u krijua, por nuk u fshi automatikisht. Verifikojeni manualisht.";

// Hook-scoped wrapper around unitsApi.findUnitRecordIdByCode that collapses
// both "DB failure" and "no row" into the same Albanian user-facing string
// the CRM surfaces — that product rule lives here, not in the api layer.
async function resolveUnitRecordId(
  unitCode: string,
): Promise<{ data?: string; error?: string }> {
  const { data, error } = await unitsApi.findUnitRecordIdByCode(unitCode);
  if (error) {
    return { error: "Njësia e zgjedhur nuk u gjet në regjistër." };
  }
  if (!data) {
    return { error: "Njësia e zgjedhur nuk u gjet në regjistër." };
  }
  return { data };
}

async function createManualShowingLead(
  input: ManualShowingContactInput,
): Promise<{ data?: { id: string; name: string }; error?: string }> {
  const fallbackName = buildManualLeadName(input);
  const { data, error } = await crmApi.createLead({
    name: fallbackName,
    phone: input.phone.trim(),
    source: "Shfaqje",
    status: "I ri",
  });

  if (error || !data?.id) {
    return { error: error ?? "Kontakti i ri nuk u krijua dot." };
  }

  return {
    data: {
      id: data.id,
      name: data.name ?? fallbackName,
    },
  };
}

async function rollbackManualShowingLead(leadId: string): Promise<string | null> {
  const { error } = await crmApi.deleteLead(leadId);
  return error ? MANUAL_CONTACT_ROLLBACK_ERROR : null;
}

export async function completeShowingSale(
  input: CompleteShowingSaleInput,
): Promise<ApiResult<Database["public"]["Functions"]["complete_unit_sale"]["Returns"]>> {
  const unitResolution = await resolveUnitRecordId(input.unit_id);
  if (unitResolution.error) {
    return apiFail(unitResolution.error);
  }
  if (!unitResolution.data) {
    return apiFail("Njësia e zgjedhur nuk u gjet në regjistër.");
  }

  const { data: activeReservationId, error: reservationError } =
    await salesApi.findActiveReservationIdByShowing(input.showing_id);

  if (reservationError) {
    return apiFail(reservationError);
  }

  return salesApi.completeUnitSale({
    unitRecordId: unitResolution.data,
    sale_date: input.sale_date,
    final_price: input.final_price,
    buyer_name: input.buyer_name,
    payment_type: input.payment_type,
    notes: input.notes ?? null,
    crm_lead_id: input.lead_id ?? null,
    installments: input.installments ?? [],
    showing_id: input.showing_id,
    reservation_id: activeReservationId ?? null,
    // CRM sale completion should only convert the reservation tied to this showing.
    autoResolveReservation: false,
  });
}

function mapShowingRow(row: Record<string, unknown>): CRMShowing {
  const date = (row.date as string) ?? "";
  const time = (row.time as string | null) ?? null;
  return {
    id: row.id as string,
    contact_id: row.contact_id as string,
    lead_name: (row.crm_leads as { name: string } | null)?.name ?? "—",
    unit_id: row.unit_id as string,
    date,
    time,
    scheduled_at: buildScheduledAt(date, time),
    status: row.status as ShowingStatus,
    outcome: (row.outcome as ShowingOutcome | null) ?? null,
    notes: row.notes as string | null,
    created_at: (row.created_at as string) ?? "",
  };
}

export interface DailyLogEntry {
  id: string;
  date: string;       // YYYY-MM-DD
  calls: number;
  contacts: number;
  showings: number;
  sales: number;
  comments: string | null;  // DB column is `comments`
  created_at: string;
}

export interface CreateDailyLogInput {
  date: string;
  calls: number;
  contacts: number;
  showings: number;
  sales: number;
  comments?: string | null;  // DB column is `comments`
}

const CACHE_TTL_MS = 60_000;

function hasFreshCache(hasData: boolean, lastFetch: number): boolean {
  return hasData && Date.now() - lastFetch <= CACHE_TTL_MS;
}

const crmCache: {
  leads: CRMLead[];
  showings: CRMShowing[];
  dailyLog: DailyLogEntry[];
  hasLeads: boolean;
  hasShowings: boolean;
  hasDailyLog: boolean;
  lastLeadsFetch: number;
  lastShowingsFetch: number;
  lastDailyLogFetch: number;
} = {
  leads: [],
  showings: [],
  dailyLog: [],
  hasLeads: false,
  hasShowings: false,
  hasDailyLog: false,
  lastLeadsFetch: 0,
  lastShowingsFetch: 0,
  lastDailyLogFetch: 0,
};

function toDateOnly(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return value.slice(0, 10);
}

export function useCRM() {
  const hasFreshLeads = hasFreshCache(crmCache.hasLeads, crmCache.lastLeadsFetch);
  const hasFreshShowings = hasFreshCache(crmCache.hasShowings, crmCache.lastShowingsFetch);
  const hasFreshDailyLog = hasFreshCache(crmCache.hasDailyLog, crmCache.lastDailyLogFetch);

  const [leads, setLeads] = useState<CRMLead[]>(() => crmCache.leads);
  const [showings, setShowings] = useState<CRMShowing[]>(() => crmCache.showings);
  const [dailyLog, setDailyLog] = useState<DailyLogEntry[]>(() => crmCache.dailyLog);
  const [loading, setLoading] = useState(!hasFreshLeads);
  const [showingsLoading, setShowingsLoading] = useState(!hasFreshShowings);
  const [dailyLogLoading, setDailyLogLoading] = useState(!hasFreshDailyLog);
  const isMountedRef = useRef(true);
  const leadsVersionRef = useRef(0);
  const showingsVersionRef = useRef(0);
  const dailyLogVersionRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadLeads = useCallback(async () => {
    const version = ++leadsVersionRef.current;
    const { data, error } = await crmApi.listLeads();

    if (!isMountedRef.current || version !== leadsVersionRef.current) {
      return;
    }

    if (error) {
      console.error("[useCRM] fetchLeads error:", error);
    }
    if (!error) {
      const next = (data ?? []) as CRMLead[];
      crmCache.leads = next;
      crmCache.hasLeads = true;
      crmCache.lastLeadsFetch = Date.now();
      setLeads(next);
    }
    setLoading(false);
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!hasFreshCache(crmCache.hasLeads, crmCache.lastLeadsFetch)) {
      setLoading(true);
    }
    await loadLeads();
  }, [loadLeads]);

  const loadShowings = useCallback(async () => {
    const version = ++showingsVersionRef.current;
    const { data, error } = await crmApi.listShowings();

    if (!isMountedRef.current || version !== showingsVersionRef.current) {
      return;
    }

    if (!error && data) {
      const mapped = data.map((row) =>
        mapShowingRow(row as unknown as Record<string, unknown>),
      );
      crmCache.showings = mapped;
      crmCache.hasShowings = true;
      crmCache.lastShowingsFetch = Date.now();
      setShowings(mapped);
    }
    setShowingsLoading(false);
  }, []);

  const fetchShowings = useCallback(async () => {
    if (!hasFreshCache(crmCache.hasShowings, crmCache.lastShowingsFetch)) {
      setShowingsLoading(true);
    }
    await loadShowings();
  }, [loadShowings]);

  const loadDailyLog = useCallback(async () => {
    const version = ++dailyLogVersionRef.current;
    const { data, error } = await crmApi.listDailyLog();

    if (!isMountedRef.current || version !== dailyLogVersionRef.current) {
      return;
    }

    if (error) console.error("[useCRM] fetchDailyLog error:", error);
    if (!error) {
      const next = (data ?? []) as DailyLogEntry[];
      crmCache.dailyLog = next;
      crmCache.hasDailyLog = true;
      crmCache.lastDailyLogFetch = Date.now();
      setDailyLog(next);
    }
    setDailyLogLoading(false);
  }, []);

  const fetchDailyLog = useCallback(async () => {
    if (!hasFreshCache(crmCache.hasDailyLog, crmCache.lastDailyLogFetch)) {
      setDailyLogLoading(true);
    }
    await loadDailyLog();
  }, [loadDailyLog]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      void loadLeads();
      void loadShowings();
      void loadDailyLog();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [loadDailyLog, loadLeads, loadShowings]);

  const createLead = async (input: CreateLeadInput) => {
    const { data, error } = await crmApi.createLead({
      ...input,
      updated_at: new Date().toISOString(),
    });
    if (error) return { error };

    const lead = data as CRMLead;
    leadsVersionRef.current += 1;
    setLeads((prev) => {
      const next = [lead, ...prev];
      crmCache.leads = next;
      crmCache.hasLeads = true;
      return next;
    });
    return { data: lead };
  };

  const updateLead = async (id: string, changes: Partial<CreateLeadInput>) => {
    const { data, error } = await crmApi.updateLead(id, {
      ...changes,
      updated_at: new Date().toISOString(),
    });
    if (error) return { error };
    const lead = data as CRMLead;
    leadsVersionRef.current += 1;
    setLeads((prev) => {
      const next = prev.map((l) => (l.id === id ? lead : l));
      crmCache.leads = next;
      crmCache.hasLeads = true;
      return next;
    });
    return { data: lead };
  };

  const deleteLead = async (id: string) => {
    const { error } = await crmApi.deleteLead(id);
    if (error) return { error };
    leadsVersionRef.current += 1;
    setLeads((prev) => {
      const next = prev.filter((lead) => lead.id !== id);
      crmCache.leads = next;
      crmCache.hasLeads = true;
      return next;
    });
    return {};
  };

  const createShowing = async (input: CreateShowingInput) => {
    const storedOutcome = input.outcome ?? "Pa rezultat";
    // Split scheduled_at into separate date and time columns
    const dateStr = input.scheduled_at.slice(0, 10); // YYYY-MM-DD
    const timeStr = input.scheduled_at.slice(11, 16) || null; // HH:MM or null

    const unitResolution = await resolveUnitRecordId(input.unit_id);
    if (unitResolution.error) {
      return { error: unitResolution.error };
    }

    let leadId = input.lead_id;
    let leadName: string | undefined;
    let createdLeadId: string | null = null;

    if (input.manual_contact) {
      const createdLead = await createManualShowingLead(input.manual_contact);
      if (createdLead.error || !createdLead.data) {
        return { error: createdLead.error ?? "Kontakti i ri nuk u krijua dot." };
      }
      leadId = createdLead.data.id;
      leadName = createdLead.data.name;
      createdLeadId = createdLead.data.id;
    }

    if (!leadId) {
      return { error: "Kontakti mungon." };
    }

    const payload = {
      contact_id: leadId, // DB column is contact_id, not lead_id
      unit_id: input.unit_id,
      unit_record_id: unitResolution.data,
      date: dateStr,
      time: timeStr,
      status: input.status,
      outcome: storedOutcome,
      notes: input.notes ?? null,
    };

    const { data, error } = await crmApi.createShowing(payload);

    if (error) {
      if (createdLeadId) {
        const rollbackError = await rollbackManualShowingLead(createdLeadId);
        if (rollbackError) {
          return { error: rollbackError };
        }
      }
      return { error };
    }

    // Refetch to ensure state is in sync with DB
    await fetchShowings();
    const mapped = mapShowingRow(data as unknown as Record<string, unknown>);
    return {
      data: {
        ...mapped,
        contact_id: leadId,
        lead_name: leadName ?? mapped.lead_name,
        unit_record_id: mapped.unit_record_id ?? unitResolution.data,
      },
    };
  };

  const updateShowing = async (id: string, changes: Partial<CreateShowingInput>) => {
    const dbChanges: Record<string, string | null | undefined> = {};
    let leadId = changes.lead_id;
    let createdLeadId: string | null = null;

    if (changes.unit_id) {
      const unitResolution = await resolveUnitRecordId(changes.unit_id);
      if (unitResolution.error) {
        return { error: unitResolution.error };
      }
      dbChanges.unit_record_id = unitResolution.data;
    }

    if (changes.manual_contact) {
      const createdLead = await createManualShowingLead(changes.manual_contact);
      if (createdLead.error || !createdLead.data) {
        return { error: createdLead.error ?? "Kontakti i ri nuk u krijua dot." };
      }
      leadId = createdLead.data.id;
      createdLeadId = createdLead.data.id;
    }

    if (leadId !== undefined) dbChanges.contact_id = leadId;
    if (changes.unit_id !== undefined) dbChanges.unit_id = changes.unit_id;
    if (changes.scheduled_at !== undefined) {
      dbChanges.date = changes.scheduled_at.slice(0, 10);
      dbChanges.time = changes.scheduled_at.slice(11, 16) || null;
    }
    if (changes.status !== undefined) dbChanges.status = changes.status;
    if (changes.outcome !== undefined) dbChanges.outcome = changes.outcome;
    if (changes.notes !== undefined) dbChanges.notes = changes.notes;
    if (changes.outcome && changes.outcome !== "Pa rezultat") {
      dbChanges.status = "E kryer";
    }

    const { data, error } = await crmApi.updateShowing(id, dbChanges);

    if (error) {
      if (createdLeadId) {
        const rollbackError = await rollbackManualShowingLead(createdLeadId);
        if (rollbackError) {
          return { error: rollbackError };
        }
      }
      return { error };
    }

    const mapped = mapShowingRow(data as unknown as Record<string, unknown>);
    showingsVersionRef.current += 1;
    setShowings((prev) => {
      const next = prev.map((showing) => (showing.id === id ? mapped : showing));
      crmCache.showings = next;
      crmCache.hasShowings = true;
      return next;
    });
    return { data: mapped };
  };

  const deleteShowing = async (id: string) => {
    const { error } = await crmApi.deleteShowing(id);
    if (error) return { error };
    showingsVersionRef.current += 1;
    setShowings((prev) => {
      const next = prev.filter((showing) => showing.id !== id);
      crmCache.showings = next;
      crmCache.hasShowings = true;
      return next;
    });
    return {};
  };

  const createDailyEntry = async (input: CreateDailyLogInput) => {
    const payload: CreateDailyLogInput = {
      ...input,
      date: toDateOnly(input.date),
      comments: input.comments ?? null,
    };

    const { data, error } = await crmApi.createDailyLogEntry(payload);
    if (error) return { error };

    if (data) {
      setDailyLog((prev) => {
        const next = data as DailyLogEntry;
        const deduped = prev.filter((entry) => entry.id !== next.id);
        const merged = [next, ...deduped].sort((a, b) => b.date.localeCompare(a.date));
        crmCache.dailyLog = merged;
        crmCache.hasDailyLog = true;
        return merged;
      });
    }

    await fetchDailyLog();
    return { data: data as unknown as DailyLogEntry };
  };

  const updateDailyEntry = async (id: string, changes: Partial<CreateDailyLogInput>) => {
    const { data, error } = await crmApi.updateDailyLogEntry(id, changes);
    if (error) return { error };
    dailyLogVersionRef.current += 1;
    setDailyLog((prev) => {
      const next = prev.map((entry) =>
        entry.id === id ? (data as DailyLogEntry) : entry,
      );
      crmCache.dailyLog = next;
      crmCache.hasDailyLog = true;
      return next;
    });
    return { data: data as unknown as DailyLogEntry };
  };

  const deleteDailyEntry = async (id: string) => {
    const { error } = await crmApi.deleteDailyLogEntry(id);
    if (error) return { error };
    dailyLogVersionRef.current += 1;
    setDailyLog((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      crmCache.dailyLog = next;
      crmCache.hasDailyLog = true;
      return next;
    });
    return {};
  };

  return {
    leads, loading, fetchLeads,
    showings, showingsLoading, fetchShowings,
    dailyLog, dailyLogLoading, fetchDailyLog,
    createLead, updateLead, deleteLead,
    createShowing, updateShowing, deleteShowing,
    createDailyEntry, updateDailyEntry, deleteDailyEntry,
  };
}
