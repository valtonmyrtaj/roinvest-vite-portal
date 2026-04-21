import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Save, AlertCircle } from "lucide-react";
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
import { usePayments } from "./hooks/usePayments";
import { PageHeader } from "./components/ui/PageHeader";
import {
  ACCENT,
  type DraftUnit,
  type EditModalSavePayload,
  OWNER_CATEGORIES,
  emptyDraft,
  getDefaultOwnerName,
  getOwnerNameOptions,
  isDraftValid,
  roomCategory,
} from "./data-input-page/shared";
import { EditModal } from "./data-input-page/EditModal";
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
  const { units, createUnit, updateUnit, fetchUnits } = useUnits({
    includeReservationTruth: true,
  });
  const { ownerEntities } = useOwnerEntities(units);
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
      const input: CreateUnitInput = {
        ...(rawInput as CreateUnitInput),
        bedrooms: cat === "apartment" ? (rawInput.bedrooms ?? 0) : 0,
        bathrooms: cat === "apartment" ? (rawInput.bathrooms ?? 0) : 0,
        toilets: cat === "lokal" ? (rawInput.toilets ?? 0) : 0,
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

    const saleResult = await completeUnitSale(payload.sale);
    if (saleResult.error) {
      throw new Error(saleResult.error);
    }

    let genericUpdateError: string | null = null;

    if (hasMeaningfulUnitChanges(editUnit, payload.genericChanges)) {
      const updateResult = await updateUnit(editUnit.id, payload.genericChanges, payload.reason);
      if (updateResult.error) {
        genericUpdateError =
          "Shitja u kompletua, por disa përditësime të njësisë nuk u ruajtën. Rihapeni njësinë dhe provoni sërish vetëm korrigjimet e mbetura.";
      }
    }

    await fetchUnits();
    await fetchAllPayments();

    if (genericUpdateError) {
      throw new Error(genericUpdateError);
    }
  };

  const handleRegistryEdit = (registryUnit: RegistryUnit) => {
    const selectedUnit = units.find((unit) => unit.id === registryUnit.id);
    if (!selectedUnit) return;
    setEditUnit(selectedUnit);
  };

  const handleCategoryChange = (nextCategory: OwnerCategory) => {
    if (nextCategory === activeCategory) return;
    setActiveCategory(nextCategory);
    setDrafts([emptyDraft(nextCategory, ownerNameOptionsByCategory[nextCategory])]);
  };

  const categoryUnits = units.filter((u) => u.owner_category === activeCategory);
  const c = getOwnerCategoryStyle(activeCategory);

  return (
    <div style={{ background: PAGE_BG }}>
      {editUnit && (
        <EditModal
          unit={editUnit}
          ownerNameOptionsByCategory={ownerNameOptionsByCategory}
          onClose={() => setEditUnit(null)}
          onSave={handleUpdate}
          onSaleSuccessDismiss={setHighlightedSaleUnitId}
        />
      )}

      <div className="mx-auto max-w-[1280px] px-10 py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="mb-8"
        >
          <PageHeader
            tone="brand"
            title="Data Input"
            subtitle="Shto dhe menaxho njësitë sipas kategorisë së pronësisë"
            className="mb-0"
          />
        </motion.div>

        {/* Category Tabs */}
        <div className="mb-6 inline-flex rounded-[16px] border border-[#e8e8ec] bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
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
                  color: active ? cc.color : "rgba(0,0,0,0.45)",
                  fontWeight: active ? 600 : 450,
                }}
              >
                {cat}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{
                    background: active ? cc.color : "#f0f0f2",
                    color: active ? "#fff" : "rgba(0,0,0,0.4)",
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
                {active && (
                  <motion.span
                    layoutId="cat-indicator"
                    className="absolute inset-0 rounded-[12px]"
                    style={{ border: `1.5px solid ${cc.border}` }}
                    transition={{ duration: 0.18 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="max-w-[860px]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-black/70">
              Shto njësi të reja — <span style={{ color: c.color }}>{activeCategory}</span>
            </p>
            <button
              onClick={addDraft}
              className="flex items-center gap-1.5 rounded-[10px] border border-black/10 bg-white px-3 py-1.5 text-[12px] text-black/60 transition hover:border-black/20 hover:text-black/80"
            >
              <Plus size={13} /> Shto njësi
            </button>
          </div>

          <div className="flex flex-col gap-3">
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

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-[11px] px-5 py-2.5 text-[13px] text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              <Save size={14} />
              {saving ? "Duke ruajtur..." : `Ruaj ${resolvedDrafts.filter(isDraftValid).length} njësi`}
            </button>

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
        </div>
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
    </div>
  );
}
