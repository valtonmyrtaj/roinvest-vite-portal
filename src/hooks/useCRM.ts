import { useState, useEffect, useCallback, useRef } from "react";
import * as crmApi from "../lib/api/crm";
import * as reservationsApi from "../lib/api/reservations";
import * as unitsApi from "../lib/api/units";
import * as salesApi from "../lib/api/sales";
import type { ActiveReservationDetail } from "../lib/api/reservations";
import { toReservationExpiryTimestamp } from "../lib/reservationExpiry";
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

export interface CRMActiveReservation {
  reservation_id: string;
  contact_id: string | null;
  reserved_at: string;
  expires_at: string | null;
  notes: string | null;
  status: string;
  updated_at: string;
}

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
  active_reservation?: CRMActiveReservation | null;
  latest_reservation?: CRMActiveReservation | null;
  notes: string | null;
  archived_at: string | null;
  archive_reason: string | null;
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
  reservation_expires_at?: string | null;
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
const RESERVATION_EXPIRES_AT_REQUIRED_ERROR =
  "Zgjidhni datën e skadimit të rezervimit.";
const ACTIVE_RESERVATION_CONFLICT_ERROR =
  "Njësia ka tashmë një rezervim aktiv. Përdorni rezervimin ekzistues ose zgjidhni njësi tjetër.";
const SHOWING_ACTIVE_RESERVATION_LOCK_ERROR =
  "Kjo shfaqje ka rezervim aktiv të lidhur. Ndryshimet që prekin rezervimin duhet të bëhen nga rrjedha kanonike e rezervimeve.";
const LEAD_DELETE_LINKED_HISTORY_ERROR =
  "Kontakti nuk mund të fshihet sepse ka histori të lidhur me shfaqje, rezervime ose shitje.";
const SHOWING_DELETE_LINKED_HISTORY_ERROR =
  "Shfaqja nuk mund të fshihet sepse ka histori të lidhur me rezervim ose shitje.";
const RESERVATION_CREATE_ROLLBACK_ERROR =
  "Rezervimi nuk u krijua dot. Shfaqja u ruajt, por nuk u fshi automatikisht. Verifikojeni manualisht.";
const RESERVATION_UPDATE_ROLLBACK_ERROR =
  "Rezervimi nuk u krijua dot. Shfaqja u përditësua, por nuk u rikthye automatikisht. Verifikojeni manualisht.";

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

  const { data: activeReservationLink, error: reservationError } =
    await reservationsApi.findActiveReservationLinkByUnit(unitResolution.data);

  if (reservationError) {
    return apiFail(reservationError);
  }

  if (
    activeReservationLink &&
    activeReservationLink.showing_id &&
    activeReservationLink.showing_id !== input.showing_id
  ) {
    return apiFail(
      "Njësia ka rezervim aktiv të lidhur me një tjetër shfaqje. Shitja duhet të kompletohet nga rrjedha e atij rezervimi.",
    );
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
    reservation_id: activeReservationLink?.reservation_id ?? null,
    // CRM sale completion should only convert the reservation tied to this showing.
    autoResolveReservation: false,
  });
}

function mapShowingRow(row: Record<string, unknown>): CRMShowing {
  const activeReservation =
    (row.active_reservation as CRMActiveReservation | null | undefined) ?? null;
  const date = (row.date as string) ?? "";
  const time = (row.time as string | null) ?? null;
  return {
    id: row.id as string,
    contact_id: row.contact_id as string,
    lead_name: (row.crm_leads as { name: string } | null)?.name ?? "—",
    unit_id: row.unit_id as string,
    unit_record_id: (row.unit_record_id as string | null) ?? null,
    date,
    time,
    scheduled_at: buildScheduledAt(date, time),
    status: row.status as ShowingStatus,
    outcome: (row.outcome as ShowingOutcome | null) ?? null,
    active_reservation: activeReservation,
    latest_reservation:
      (row.latest_reservation as CRMActiveReservation | null | undefined) ?? activeReservation,
    notes: row.notes as string | null,
    archived_at: (row.archived_at as string | null) ?? null,
    archive_reason: (row.archive_reason as string | null) ?? null,
    created_at: (row.created_at as string) ?? "",
  };
}

function indexActiveReservationsByShowingId(
  rows: ActiveReservationDetail[],
): Record<string, CRMActiveReservation> {
  return (rows ?? []).reduce<Record<string, CRMActiveReservation>>((acc, row) => {
    if (!row.showing_id) return acc;
    acc[row.showing_id] = {
      reservation_id: row.reservation_id,
      contact_id: row.contact_id,
      reserved_at: row.reserved_at,
      expires_at: row.expires_at,
      notes: row.notes,
      status: row.status,
      updated_at: row.updated_at,
    };
    return acc;
  }, {});
}

function indexLatestReservationsByShowingId(
  rows: ActiveReservationDetail[],
): Record<string, CRMActiveReservation> {
  return (rows ?? []).reduce<Record<string, CRMActiveReservation>>((acc, row) => {
    if (!row.showing_id || acc[row.showing_id]) return acc;
    acc[row.showing_id] = {
      reservation_id: row.reservation_id,
      contact_id: row.contact_id,
      reserved_at: row.reserved_at,
      expires_at: row.expires_at,
      notes: row.notes,
      status: row.status,
      updated_at: row.updated_at,
    };
    return acc;
  }, {});
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
    const [showingsResult, reservationsResult] = await Promise.all([
      crmApi.listShowings(),
      reservationsApi.listShowingReservationDetails(),
    ]);

    if (!isMountedRef.current || version !== showingsVersionRef.current) {
      return;
    }

    if (!showingsResult.error && showingsResult.data) {
      const latestReservationsByShowingId =
        reservationsResult.error === null
          ? indexLatestReservationsByShowingId(reservationsResult.data ?? [])
          : {};
      const activeReservationsByShowingId =
        reservationsResult.error === null
          ? indexActiveReservationsByShowingId(
              (reservationsResult.data ?? []).filter((row) => row.status === "Aktive"),
            )
          : {};
      const mapped = showingsResult.data.map((row) =>
        mapShowingRow({
          ...(row as unknown as Record<string, unknown>),
          active_reservation:
            activeReservationsByShowingId[(row as { id: string }).id] ?? null,
          latest_reservation:
            latestReservationsByShowingId[(row as { id: string }).id] ?? null,
        }),
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
    const dependencies = await crmApi.getLeadDeleteDependencies(id);
    if (dependencies.error) return { error: dependencies.error };
    if (
      dependencies.data &&
      (
        dependencies.data.showingsCount > 0 ||
        dependencies.data.reservationsCount > 0 ||
        dependencies.data.salesCount > 0 ||
        dependencies.data.buyerUnitsCount > 0
      )
    ) {
      return { error: LEAD_DELETE_LINKED_HISTORY_ERROR };
    }

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

    if (storedOutcome === "Rezervoi") {
      if (!input.reservation_expires_at) {
        return { error: RESERVATION_EXPIRES_AT_REQUIRED_ERROR };
      }

      const { data: activeReservation, error: activeReservationError } =
        await reservationsApi.findActiveReservationLinkByUnit(unitResolution.data!);

      if (activeReservationError) {
        return { error: activeReservationError };
      }

      if (activeReservation) {
        return { error: ACTIVE_RESERVATION_CONFLICT_ERROR };
      }
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

    if (!data) {
      return { error: "Shfaqja nuk u kthye nga serveri pas ruajtjes." };
    }

    let createdReservation: CRMActiveReservation | null = null;

    if (storedOutcome === "Rezervoi") {
      const reservationResult = await reservationsApi.createUnitReservation({
        unitRecordId: unitResolution.data!,
        contactId: leadId,
        showingId: data.id,
        reservedAt: input.scheduled_at,
        expiresAt: toReservationExpiryTimestamp(input.reservation_expires_at!),
        notes: input.notes ?? null,
      });

      if (reservationResult.error) {
        const { error: rollbackShowingError } = await crmApi.deleteShowing(data.id);

        if (createdLeadId && !rollbackShowingError) {
          const rollbackLeadError = await rollbackManualShowingLead(createdLeadId);
          if (rollbackLeadError) {
            return { error: rollbackLeadError };
          }
        }

        if (rollbackShowingError) {
          return { error: RESERVATION_CREATE_ROLLBACK_ERROR };
        }

        return { error: reservationResult.error };
      }

      if (!reservationResult.data) {
        return { error: "Rezervimi nuk u kthye nga serveri pas ruajtjes." };
      }

      createdReservation = {
        reservation_id: reservationResult.data,
        contact_id: leadId,
        reserved_at: input.scheduled_at,
        expires_at: toReservationExpiryTimestamp(input.reservation_expires_at!),
        notes: input.notes ?? null,
        status: "Aktive",
        updated_at: new Date().toISOString(),
      };
    }

    // Refetch to ensure state is in sync with DB
    await fetchShowings();
    const mapped = mapShowingRow({
      ...(data as unknown as Record<string, unknown>),
      active_reservation: createdReservation,
      latest_reservation: createdReservation,
    });
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
    const existingShowing = showings.find((showing) => showing.id === id);
    if (!existingShowing) {
      return { error: "Shfaqja nuk u gjet." };
    }
    let nextActiveReservation = existingShowing.active_reservation ?? null;

    const nextOutcome = (changes.outcome ?? existingShowing.outcome ?? "Pa rezultat") as ShowingOutcome;
    const isEnteringReservationOutcome =
      nextOutcome === "Rezervoi" && (existingShowing.outcome ?? "Pa rezultat") !== "Rezervoi";
    const nextUnitId = changes.unit_id ?? existingShowing.unit_id;
    const nextScheduledAt = changes.scheduled_at ?? `${existingShowing.date}T${existingShowing.time ?? "00:00"}:00`;

    const { data: activeReservationForShowingId, error: activeReservationForShowingError } =
      await reservationsApi.findActiveReservationIdByShowing(id);

    if (activeReservationForShowingError) {
      return { error: activeReservationForShowingError };
    }

    const hasLinkedActiveReservation = Boolean(activeReservationForShowingId);
    const isChangingReservationOwner =
      (changes.unit_id !== undefined && changes.unit_id !== existingShowing.unit_id) ||
      (changes.lead_id !== undefined && changes.lead_id !== existingShowing.contact_id) ||
      Boolean(changes.manual_contact);
    const isChangingOutcomeAwayFromReservation =
      changes.outcome !== undefined && changes.outcome !== "Rezervoi";

    if (
      hasLinkedActiveReservation &&
      (isChangingReservationOwner || isChangingOutcomeAwayFromReservation)
    ) {
      return { error: SHOWING_ACTIVE_RESERVATION_LOCK_ERROR };
    }

    const dbChanges: Record<string, string | null | undefined> = {};
    let leadId = changes.lead_id;
    let createdLeadId: string | null = null;
    let targetUnitRecordId = changes.unit_id ? null : existingShowing.unit_record_id ?? null;

    if (changes.unit_id) {
      const unitResolution = await resolveUnitRecordId(changes.unit_id);
      if (unitResolution.error) {
        return { error: unitResolution.error };
      }
      dbChanges.unit_record_id = unitResolution.data;
      targetUnitRecordId = unitResolution.data ?? null;
    }

    if (isEnteringReservationOutcome && !hasLinkedActiveReservation) {
      if (!changes.reservation_expires_at) {
        return { error: RESERVATION_EXPIRES_AT_REQUIRED_ERROR };
      }

      if (!targetUnitRecordId) {
        const fallbackUnitResolution = await resolveUnitRecordId(nextUnitId);
        if (fallbackUnitResolution.error) {
          return { error: fallbackUnitResolution.error };
        }
        targetUnitRecordId = fallbackUnitResolution.data!;
      }

      const { data: activeReservation, error: activeReservationError } =
        await reservationsApi.findActiveReservationLinkByUnit(targetUnitRecordId);

      if (activeReservationError) {
        return { error: activeReservationError };
      }

      if (activeReservation && activeReservation.showing_id !== id) {
        return { error: ACTIVE_RESERVATION_CONFLICT_ERROR };
      }
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

    if (isEnteringReservationOutcome && !hasLinkedActiveReservation) {
      const reservationResult = await reservationsApi.createUnitReservation({
        unitRecordId: targetUnitRecordId!,
        contactId: leadId ?? existingShowing.contact_id,
        showingId: id,
        reservedAt: nextScheduledAt,
        expiresAt: toReservationExpiryTimestamp(changes.reservation_expires_at!),
        notes: changes.notes ?? existingShowing.notes ?? null,
      });

      if (reservationResult.error) {
        const rollbackPatch = {
          contact_id: existingShowing.contact_id,
          unit_id: existingShowing.unit_id,
          unit_record_id: existingShowing.unit_record_id ?? null,
          date: existingShowing.date,
          time: existingShowing.time,
          status: existingShowing.status,
          outcome: existingShowing.outcome ?? undefined,
          notes: existingShowing.notes ?? null,
        };

        const { error: rollbackShowingError } = await crmApi.updateShowing(id, rollbackPatch);

        if (createdLeadId && !rollbackShowingError) {
          const rollbackLeadError = await rollbackManualShowingLead(createdLeadId);
          if (rollbackLeadError) {
            return { error: rollbackLeadError };
          }
        }

        if (rollbackShowingError) {
          return { error: RESERVATION_UPDATE_ROLLBACK_ERROR };
        }

        await fetchShowings();
        return { error: reservationResult.error };
      }

      if (!reservationResult.data) {
        return { error: "Rezervimi nuk u kthye nga serveri pas ruajtjes." };
      }

      nextActiveReservation = {
        reservation_id: reservationResult.data,
        contact_id: leadId ?? existingShowing.contact_id,
        reserved_at: nextScheduledAt,
        expires_at: toReservationExpiryTimestamp(changes.reservation_expires_at!),
        notes: changes.notes ?? existingShowing.notes ?? null,
        status: "Aktive",
        updated_at: new Date().toISOString(),
      };
    }

    const mapped = mapShowingRow({
      ...(data as unknown as Record<string, unknown>),
      active_reservation: nextActiveReservation,
      latest_reservation: nextActiveReservation ?? existingShowing.latest_reservation ?? null,
    });
    showingsVersionRef.current += 1;
    setShowings((prev) => {
      const next = prev.map((showing) => (showing.id === id ? mapped : showing));
      crmCache.showings = next;
      crmCache.hasShowings = true;
      return next;
    });
    return { data: mapped };
  };

  const archiveShowing = async (id: string, reason?: string) => {
    const { data, error } = await crmApi.archiveShowing(id, reason);
    if (error) return { error };

    const nextShowing = mapShowingRow(data as unknown as Record<string, unknown>);
    let mapped = nextShowing;
    showingsVersionRef.current += 1;
    setShowings((prev) => {
      const next = prev.map((showing) => {
        if (showing.id !== id) return showing;
        mapped = {
          ...nextShowing,
          active_reservation: showing.active_reservation ?? null,
          latest_reservation: showing.latest_reservation ?? null,
        };
        return mapped;
      });
      crmCache.showings = next;
      crmCache.hasShowings = true;
      return next;
    });
    return { data: mapped };
  };

  const restoreShowing = async (id: string) => {
    const { data, error } = await crmApi.restoreShowing(id);
    if (error) return { error };

    const nextShowing = mapShowingRow(data as unknown as Record<string, unknown>);
    let mapped = nextShowing;
    showingsVersionRef.current += 1;
    setShowings((prev) => {
      const next = prev.map((showing) => {
        if (showing.id !== id) return showing;
        mapped = {
          ...nextShowing,
          active_reservation: showing.active_reservation ?? null,
          latest_reservation: showing.latest_reservation ?? null,
        };
        return mapped;
      });
      crmCache.showings = next;
      crmCache.hasShowings = true;
      return next;
    });
    return { data: mapped };
  };

  const deleteShowing = async (id: string) => {
    const dependencies = await crmApi.getShowingDeleteDependencies(id);
    if (dependencies.error) return { error: dependencies.error };
    if (
      dependencies.data &&
      (
        dependencies.data.reservationsCount > 0 ||
        dependencies.data.salesCount > 0
      )
    ) {
      return { error: SHOWING_DELETE_LINKED_HISTORY_ERROR };
    }

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
    createShowing, updateShowing, archiveShowing, restoreShowing, deleteShowing,
    createDailyEntry, updateDailyEntry, deleteDailyEntry,
  };
}
