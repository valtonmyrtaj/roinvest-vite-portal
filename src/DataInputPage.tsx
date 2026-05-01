import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, AlertCircle } from "lucide-react";
import { useOwnerEntities } from "./hooks/useOwnerEntities";
import { useUnits } from "./hooks/useUnits";
import type { CreateUnitInput, Unit, OwnerCategory } from "./hooks/useUnits";
import { getOwnerCategoryStyle } from "./lib/ownerColors";
import { DataInputOperationalRegistry } from "./components/DataInputOperationalRegistry";
import type { RegistryUnit } from "./components/DataInputOperationalRegistry";
import {
  completeUnitSale,
  DIRECT_SALE_ACTIVE_RESERVATION_ERROR,
} from "./lib/api/sales";
import { crm as crmApi, reservations as reservationsApi } from "./lib/api";
import { usePayments } from "./hooks/usePayments";
import { formatContactPhone } from "./lib/phoneFormat";
import { toReservationExpiryTimestamp } from "./lib/reservationExpiry";
import { PageHeader } from "./components/ui/PageHeader";
import {
  ACCENT,
  type DraftUnit,
  type EditModalSavePayload,
  type ManualUnitReservationPayload,
  OWNER_CATEGORIES,
  emptyDraft,
  getDefaultOwnerName,
  getOwnerNameOptions,
  isDraftValid,
  normalizeOptionalArea,
  roomCategory,
} from "./data-input-page/shared";
import { EditModal } from "./data-input-page/EditModal";
import { OwnerContactsSection } from "./data-input-page/OwnerContactsSection";
import { UnitForm } from "./data-input-page/UnitForm";
import { PAGE_BG } from "./ui/tokens";

function normalizeComparableUnitValue(
  key: keyof CreateUnitInput,
  value: unknown,
) {
  if ((key === "notes" || key === "reservation_expires_at") && value === "") {
    return null;
  }

  return value ?? null;
}

function hasMeaningfulUnitChanges(
  unit: Unit,
  changes: Partial<CreateUnitInput>,
) {
  return Object.entries(changes).some(([rawKey, nextValue]) => {
    const key = rawKey as keyof CreateUnitInput;
    const currentValue = unit[key as keyof Unit];

    return (
      normalizeComparableUnitValue(key, currentValue) !==
      normalizeComparableUnitValue(key, nextValue)
    );
  });
}

/**
 * Data Input page — thin shell that orchestrates:
 *   • The per-category draft list (add / duplicate / remove / save)
 *   • The Edit modal (pure update *or* sale-transition via onSave)
 *   • The operational registry (list of persisted units for the active
 *     category, with per-row edit + payment-navigation hooks)
 *
 * All heavy form/modal UI lives under ./data-input-page/. This file is
 * intentionally only state + effects + wiring; see ./data-input-page/shared.tsx
 * for the shared primitives and types.
 */
export default function DataInputPage({
  onOpenSalesPayments,
}: {
  onOpenSalesPayments?: (unitId: string) => void;
}) {
  const { units, createUnit, updateUnit, fetchUnits, error: unitsError } = useUnits({
    includeReservationTruth: true,
  });
  const { ownerEntities, storedEntityRowsByCategory, saveOwnerEntityDetails } =
    useOwnerEntities(units);
  const { allPayments, fetchAllPayments } = usePayments();
  const [activeCategory, setActiveCategory] = useState<OwnerCategory>("Investitor");
  const [drafts, setDrafts] = useState<DraftUnit[]>([emptyDraft("Investitor")]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [highlightedSaleUnitId, setHighlightedSaleUnitId] = useState<string | null>(null);

  // Prime the registry's payments view on mount.
  useEffect(() => {
    fetchAllPayments();
  }, [fetchAllPayments]);

  const ownerNameOptionsByCategory = useMemo(
    () => ({
      Investitor: getOwnerNameOptions("Investitor", ownerEntities.Investitor),
      "Pronarët e tokës": getOwnerNameOptions(
        "Pronarët e tokës",
        ownerEntities["Pronarët e tokës"],
      ),
      "Kompani ndërtimore": getOwnerNameOptions(
        "Kompani ndërtimore",
        ownerEntities["Kompani ndërtimore"],
      ),
    }),
    [ownerEntities],
  );

  const resolvedDrafts = useMemo(
    () =>
      drafts.map((draft) => {
        const ownerCategory = draft.owner_category ?? "Investitor";
        const liveOwnerNames = ownerEntities[ownerCategory];

        if (liveOwnerNames.length === 0) return draft;
        if (draft.owner_name && liveOwnerNames.includes(draft.owner_name)) return draft;
        if (
          draft.owner_name &&
          draft.owner_name !== getDefaultOwnerName(ownerCategory)
        ) {
          return draft;
        }

        return { ...draft, owner_name: liveOwnerNames[0] };
      }),
    [drafts, ownerEntities],
  );

  const validDraftCount = useMemo(
    () => resolvedDrafts.filter(isDraftValid).length,
    [resolvedDrafts],
  );

  // Clear the post-sale row highlight after 2.4s so it flashes and fades.
  useEffect(() => {
    if (!highlightedSaleUnitId) return;
    const timeout = window.setTimeout(() => setHighlightedSaleUnitId(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [highlightedSaleUnitId]);

  const addDraft = () =>
    setDrafts((prev) => [
      ...prev,
      emptyDraft(activeCategory, ownerNameOptionsByCategory[activeCategory]),
    ]);

  const removeDraft = (key: string) =>
    setDrafts((prev) => (prev.length === 1 ? prev : prev.filter((d) => d._key !== key)));

  const duplicateDraft = (key: string) => {
    const idx = drafts.findIndex((d) => d._key === key);
    if (idx === -1) return;
    const clone = { ...drafts[idx], _key: crypto.randomUUID(), unit_id: "" };
    setDrafts((prev) => [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]);
  };

  const updateDraft = (key: string, updated: DraftUnit) =>
    setDrafts((prev) => prev.map((d) => (d._key === key ? updated : d)));

  const handleSave = async () => {
    const valid = resolvedDrafts.filter(isDraftValid);
    if (valid.length === 0) {
      setSaveError("Plotësoni të paktën një njësi të plotë për ta ruajtur.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const persistedDraftKeys = new Set<string>();
    let failedDraftUnitId: string | null = null;
    let errorMessage: string | null = null;
    for (const d of valid) {
      // Remove the draft-only _key field — it is not a database column
      const { _key, ...rawInput } = d;
      void _key;
      const cat = roomCategory(rawInput.type as string | undefined);
      const isApartment = cat === "apartment";
      const isLokal = cat === "lokal";
      const input: CreateUnitInput = {
        ...(rawInput as CreateUnitInput),
        bedrooms: isApartment ? (rawInput.bedrooms ?? null) : null,
        bathrooms: isApartment ? (rawInput.bathrooms ?? null) : null,
        toilets: isApartment || isLokal ? (rawInput.toilets ?? null) : null,
        orientation: rawInput.orientation ?? null,
        has_storage: Boolean(rawInput.has_storage),
        balcony_area: isApartment ? normalizeOptionalArea(rawInput.balcony_area) : null,
        terrace_area: isApartment ? normalizeOptionalArea(rawInput.terrace_area) : null,
      };
      const result = await createUnit(input);
      if (result.error) {
        failedDraftUnitId = d.unit_id ?? null;
        errorMessage = result.error;
        break;
      }
      persistedDraftKeys.add(d._key);
    }
    if (errorMessage) {
      if (persistedDraftKeys.size > 0) {
        await fetchUnits();
        setDrafts((prev) => prev.filter((draft) => !persistedDraftKeys.has(draft._key)));
        setSaveError(
          `U ruajtën ${persistedDraftKeys.size} nga ${valid.length} njësi. ${
            failedDraftUnitId ? `Njësia ${failedDraftUnitId} mbeti pa u ruajtur. ` : ""
          }Kontrolloni detajin dhe provoni sërish vetëm hyrjet e mbetura. Detaj: ${errorMessage}`,
        );
      } else {
        setSaveError(`Nuk u ruajt asnjë njësi. Detaj: ${errorMessage}`);
      }
      setSaving(false);
      return;
    }
    await fetchUnits();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setDrafts([emptyDraft(activeCategory, ownerNameOptionsByCategory[activeCategory])]);
  };

  const handleUpdate = async (payload: EditModalSavePayload) => {
    if (!editUnit) return;

    if (payload.mode === "update") {
      const result = await updateUnit(editUnit.id, payload.changes, payload.reason);
      if (result.error) {
        throw new Error(result.error);
      }
      await fetchUnits();
      return;
    }

    if (
      editUnit.active_reservation_id &&
      !payload.sale.showing_id &&
      !payload.sale.reservation_id
    ) {
      throw new Error(DIRECT_SALE_ACTIVE_RESERVATION_ERROR);
    }

    if (hasMeaningfulUnitChanges(editUnit, payload.genericChanges)) {
      const updateResult = await updateUnit(editUnit.id, payload.genericChanges, payload.reason);
      if (updateResult.error) {
        throw new Error(updateResult.error);
      }
    }

    const saleResult = await completeUnitSale(payload.sale);
    if (saleResult.error) {
      throw new Error(saleResult.error);
    }

    await fetchUnits();
    await fetchAllPayments();
  };

  const handleManualReserve = async (payload: ManualUnitReservationPayload) => {
    if (!editUnit) return;

    const contactName = payload.contactName.trim().replace(/\s+/g, " ");
    const contactPhone = formatContactPhone(payload.contactPhone);
    const reservedAt = new Date().toISOString();
    const showingDate = reservedAt.slice(0, 10);
    const showingTime = reservedAt.slice(11, 16);
    const notes = payload.notes ?? null;

    const showingResult = await crmApi.createShowing({
      contact_id: null,
      manual_contact_name: contactName,
      manual_contact_phone: contactPhone,
      unit_id: editUnit.unit_id,
      unit_record_id: editUnit.id,
      date: showingDate,
      time: showingTime,
      status: "E kryer",
      outcome: "Rezervoi",
      notes,
    });

    if (showingResult.error || !showingResult.data) {
      throw new Error(showingResult.error ?? "Rezervimi nuk krijoi dot shënimin e klientit.");
    }

    const reservationResult = await reservationsApi.createUnitReservation({
      unitRecordId: editUnit.id,
      showingId: showingResult.data.id,
      reservedAt,
      expiresAt: toReservationExpiryTimestamp(payload.expiresAt),
      notes,
    });

    if (reservationResult.error) {
      await crmApi.deleteShowing(showingResult.data.id);
      throw new Error(reservationResult.error);
    }

    await fetchUnits();
  };

  const handleRegistryEdit = (registryUnit: RegistryUnit) => {
    const selectedUnit = units.find((unit) => unit.id === registryUnit.id);
    if (!selectedUnit) return;
    setEditUnit(selectedUnit);
  };

  const handleOwnerContactSave = async ({
    category,
    name,
    contactPerson,
    phone,
    notes,
  }: {
    category: OwnerCategory;
    name: string;
    contactPerson: string | null;
    phone: string | null;
    notes: string | null;
  }) => {
    const result = await saveOwnerEntityDetails({
      category,
      name,
      contactPerson,
      phone,
      notes,
    });

    if (result.error) return { error: result.error };
    return {};
  };

  const hasDirtyDraft = (list: DraftUnit[]) => {
    if (list.length > 1) return true;
    const only = list[0];
    if (!only) return false;
    return Boolean(
      only.unit_id ||
        only.block ||
        only.type ||
        only.level ||
        only.size ||
        only.price ||
        only.notes ||
        only.bedrooms != null ||
        only.bathrooms != null ||
        only.toilets != null ||
        only.orientation ||
        only.has_storage ||
        only.balcony_area != null ||
        only.terrace_area != null,
    );
  };

  const handleCategoryChange = (nextCategory: OwnerCategory) => {
    if (nextCategory === activeCategory) return;
    if (hasDirtyDraft(drafts)) {
      const proceed = window.confirm(
        "Keni ndryshime të paruajtura në këtë kategori. Të kalohet kategoria dhe të humben?",
      );
      if (!proceed) return;
    }
    setActiveCategory(nextCategory);
    setDrafts([emptyDraft(nextCategory, ownerNameOptionsByCategory[nextCategory])]);
  };

  const categoryUnits = units.filter((u) => u.owner_category === activeCategory);
  const categoryAvailableCount = categoryUnits.filter(
    (unit) => unit.status === "Në dispozicion",
  ).length;
  const categoryReservedCount = categoryUnits.filter(
    (unit) => unit.status === "E rezervuar",
  ).length;
  const categorySoldCount = categoryUnits.filter(
    (unit) => unit.status === "E shitur",
  ).length;
  const c = getOwnerCategoryStyle(activeCategory);
  const saveButtonReady = validDraftCount > 0;

  return (
    <div style={{ background: PAGE_BG }}>
      {editUnit && (
        <EditModal
          unit={editUnit}
          ownerNameOptionsByCategory={ownerNameOptionsByCategory}
          onClose={() => setEditUnit(null)}
          onSave={handleUpdate}
          onReserve={handleManualReserve}
          onSaleSuccessDismiss={setHighlightedSaleUnitId}
        />
      )}

      <div className="mx-auto max-w-[1280px] px-5 py-7 sm:px-6 md:px-10 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="mb-3 mt-2.5"
        >
          <PageHeader
            tone="brand"
            title="Të dhënat"
            subtitle="Shto dhe menaxho njësitë sipas kategorisë së pronësisë"
            className="mb-0"
            titleClassName="leading-none"
            subtitleClassName="!mt-0"
          />
        </motion.div>

        {unitsError && (
          <div className="mb-6 flex items-start gap-2 rounded-[12px] border border-red-100 bg-red-50/60 px-3.5 py-2.5 text-[12px] text-red-600">
            <AlertCircle size={13} className="mt-[1px] shrink-0" />
            <span>
              Lista e njësive nuk u ngarkua: {unitsError}. Provoni të rifreskoni faqen.
            </span>
          </div>
        )}

        <section className="max-w-[1280px] overflow-hidden rounded-[22px] border border-black/[0.08] bg-white shadow-[0_18px_45px_rgba(16,24,40,0.045)]">
          <div className="border-b border-black/[0.06] bg-[linear-gradient(180deg,#fff_0%,#fbfcfe_100%)] px-5 pb-4 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex flex-wrap rounded-[16px] bg-[#f6f7fa] p-1 shadow-[inset_0_0_0_1px_rgba(16,24,40,0.05)]">
                {OWNER_CATEGORIES.map((cat) => {
                  const active = activeCategory === cat;
                  const cc = getOwnerCategoryStyle(cat);
                  const count = units.filter((u) => u.owner_category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className="relative flex items-center gap-2 rounded-[12px] px-5 py-2.5 text-[13px] transition-all duration-200"
                      style={{
                        backgroundColor: active ? cc.bg : "transparent",
                        color: active ? cc.color : "rgba(0,0,0,0.46)",
                        fontWeight: active ? 600 : 450,
                        boxShadow: active
                          ? `inset 0 0 0 1px ${cc.border}, 0 1px 2px rgba(16,24,40,0.04)`
                          : "none",
                      }}
                    >
                      {cat}
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{
                          background: active ? cc.color : "#eceef3",
                          color: active ? "#fff" : "rgba(0,0,0,0.42)",
                          fontWeight: 600,
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <span className="rounded-full border border-[#edf0f5] bg-[#fbfcfe] px-3 py-2 text-[11px] font-semibold text-[#003883] shadow-[0_6px_14px_rgba(0,56,131,0.035)]">
                  {validDraftCount} gati
                </span>
                <button
                  onClick={addDraft}
                  className="flex items-center gap-1.5 rounded-[11px] border border-black/[0.08] bg-white px-3.5 py-2 text-[12px] font-semibold text-black/62 shadow-[0_6px_14px_rgba(16,24,40,0.035)] transition hover:border-black/15 hover:text-black/80"
                >
                  <Plus size={13} /> Shto njësi
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 py-5">
            <div className="mb-4">
              <p className="text-[13px] font-semibold text-black/75">
                Shto njësi të reja{" "}
                <span className="font-semibold" style={{ color: c.color }}>
                  {activeCategory}
                </span>
              </p>
              <p className="mt-1 text-[12px] text-black/40">
                {drafts.length} hyrje · {validDraftCount} gati për ruajtje
              </p>
            </div>

            <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,940px)_minmax(240px,1fr)]">
              <div className="flex flex-col gap-[17px]">
                <AnimatePresence initial={false}>
                  {resolvedDrafts.map((d, i) => (
                    <UnitForm
                      key={d._key}
                      draft={d}
                      ownerNameOptions={
                        ownerNameOptionsByCategory[d.owner_category ?? activeCategory]
                      }
                      index={i}
                      onChange={(updated) => updateDraft(d._key, updated)}
                      onRemove={() => removeDraft(d._key)}
                      onDuplicate={() => duplicateDraft(d._key)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              <aside className="hidden h-full rounded-[16px] border border-[#edf0f5] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f9ff_100%)] p-4 shadow-[0_8px_18px_rgba(0,56,131,0.035)] xl:block">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-black/30">
                    Përmbledhje
                  </p>
                  <div className="mt-3 rounded-[14px] border border-[#edf0f5] bg-white/55 p-3">
                    <p className="text-[11px] font-medium text-black/42">
                      {activeCategory}
                    </p>
                    <p className="mt-1 text-[28px] font-semibold leading-none text-[#003883]">
                      {categoryUnits.length}
                    </p>
                    <p className="mt-1 text-[11px] text-black/38">njësi gjithsej</p>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-[11px] bg-white/70 px-3 py-2 text-[12px]">
                      <span className="text-black/45">Në dispozicion</span>
                      <span className="font-semibold text-[#3c7a57]">
                        {categoryAvailableCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-[11px] bg-white/70 px-3 py-2 text-[12px]">
                      <span className="text-black/45">Të rezervuara</span>
                      <span className="font-semibold text-[#9a6a1d]">
                        {categoryReservedCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-[11px] bg-white/70 px-3 py-2 text-[12px]">
                      <span className="text-black/45">Të shitura</span>
                      <span className="font-semibold text-[#b55353]">
                        {categorySoldCount}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[14px] border border-[#edf0f5] bg-white/55 p-3">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-black/45">Draftet</span>
                      <span className="font-semibold text-[#003883]">
                        {drafts.length}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[12px]">
                      <span className="text-black/45">Gati për ruajtje</span>
                      <span className="font-semibold" style={{ color: c.color }}>
                        {validDraftCount}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <div className="border-t border-black/[0.06] bg-[#fbfbfc] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[12px] font-medium text-black/42">
                Ruaj në regjistrin e{" "}
                <span style={{ color: c.color, fontWeight: 600 }}>
                  {activeCategory}
                </span>
              </span>
              <button
                onClick={handleSave}
                disabled={saving || validDraftCount === 0}
                className="flex items-center gap-2 rounded-[11px] px-5 py-2.5 text-[13px] font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-100"
                style={{
                  backgroundColor: saveButtonReady ? ACCENT : "#e8ebf1",
                  color: saveButtonReady ? "#fff" : "rgba(0,0,0,0.42)",
                }}
              >
                {saving
                  ? "Duke ruajtur..."
                  : saveButtonReady
                    ? `Ruaj ${validDraftCount} njësi`
                    : "Ruaj njësitë"}
              </button>
            </div>

            {(saved || saveError) && (
              <div className="mt-3">
                {saved && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[12px] text-[#3c7a57]"
                  >
                    ✓ Njësitë u regjistruan me sukses
                  </motion.span>
                )}
                {saveError && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1 text-[12px] text-red-500"
                  >
                    <AlertCircle size={12} /> {saveError}
                  </motion.span>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <DataInputOperationalRegistry
        units={categoryUnits}
        payments={allPayments}
        onEdit={handleRegistryEdit}
        highlightedUnitId={highlightedSaleUnitId}
        flashUnitId={highlightedSaleUnitId}
        onPaymentNavigate={
          onOpenSalesPayments
            ? (unit) => {
                onOpenSalesPayments(unit.id);
              }
            : undefined
        }
      />

      <div className="mx-auto max-w-[1280px] px-5 pb-10 pt-5 sm:px-6 md:px-10 md:pt-6">
        <OwnerContactsSection
          units={units}
          ownerEntities={ownerEntities}
          storedEntityRowsByCategory={storedEntityRowsByCategory}
          onSave={handleOwnerContactSave}
        />
      </div>
    </div>
  );
}
