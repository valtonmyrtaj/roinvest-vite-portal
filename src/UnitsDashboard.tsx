import { useDeferredValue, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  ReservationActionDialog,
  type ReservationActionMode,
} from "./components/ReservationActionDialog";
import { useUnitsShell } from "./hooks/useUnitsShell";
import { useUnitDetail } from "./hooks/useUnitDetail";
import { useUnitsRegistry } from "./hooks/useUnitsRegistry";
import type {
  Unit,
  UnitHistory,
  OwnerCategory,
  UnitStatus,
  Block,
  Level,
} from "./hooks/useUnits";
import { reservations as reservationsApi, units as unitsApi } from "./lib/api";
import { toReservationExpiryTimestamp } from "./lib/reservationExpiry";
import { ActiveReservationsSection } from "./units-dashboard/ActiveReservationsSection";
import { PageHeader } from "./components/ui/PageHeader";
import { OwnershipSection } from "./units-dashboard/OwnershipSection";
import { StockStatusSection } from "./units-dashboard/StockStatusSection";
import { UnitDetailDrawer } from "./units-dashboard/UnitDetailDrawer";
import { UnitsRegistrySection } from "./units-dashboard/UnitsRegistrySection";
import { PAGE_BG } from "./ui/tokens";
import {
  BLOCKS,
  LEVELS,
  TYPES,
  STATUS_ORDER,
  statusOrderValue,
} from "./units-dashboard/shared";
import type { RegistryUnitRow } from "./lib/api/unitsRegistry";

const REGISTRY_PAGE_SIZE = 40;

export function UnitsDashboard() {
  const [blockF, setBlockF] = useState<Block | "">("");
  const [typeF, setTypeF] = useState("");
  const [levelF, setLevelF] = useState<Level | "">("");
  const [statusF, setStatusF] = useState<UnitStatus | "">("");
  const [registryCategoryF, setRegistryCategoryF] = useState("");
  const [registryEntityF, setRegistryEntityF] = useState("");
  const [search, setSearch] = useState("");
  const [registryPage, setRegistryPage] = useState(1);
  const [selectedOwnerCategory, setSelectedOwnerCategory] = useState<OwnerCategory>("Investitor");
  const [selectedOwnerEntity, setSelectedOwnerEntity] = useState("");
  const [activeUnitDrawer, setActiveUnitDrawer] = useState<{
    unitId: string;
    initialTab: "summary" | "history";
    unit: Unit;
  } | null>(null);
  const [reservationAction, setReservationAction] = useState<{
    unit: Unit;
    mode: ReservationActionMode;
  } | null>(null);

  const deferredSearch = useDeferredValue(search);

  const {
    totalUnits,
    availableUnitsCount,
    activeReservationsCount,
    ownerOptionsByCategory,
    ownershipCounts,
    stockCounts,
    activeReservations,
    loading: shellLoading,
    error: shellError,
    refresh: refreshShell,
  } = useUnitsShell({
    stockCategory: selectedOwnerCategory,
    stockEntity: selectedOwnerEntity,
  });

  const ownerNames = ownerOptionsByCategory[selectedOwnerCategory];
  const activeSelectedOwnerEntity =
    selectedOwnerEntity && ownerNames.includes(selectedOwnerEntity)
      ? selectedOwnerEntity
      : "";

  const registryEntityNames = useMemo(() => {
    if (!registryCategoryF) return [];
    return ownerOptionsByCategory[registryCategoryF as OwnerCategory] ?? [];
  }, [ownerOptionsByCategory, registryCategoryF]);
  const activeRegistryEntityF =
    registryEntityF && registryEntityNames.includes(registryEntityF)
      ? registryEntityF
      : "";
  const {
    unit: detailedDrawerUnit,
    refresh: refreshUnitDetail,
  } = useUnitDetail(activeUnitDrawer?.unitId ?? null);

  const activeDrawerUnit = useMemo(() => {
    if (!activeUnitDrawer) return null;
    return detailedDrawerUnit ?? activeUnitDrawer.unit;
  }, [activeUnitDrawer, detailedDrawerUnit]);

  const registryEntityPlaceholder = useMemo(() => {
    if (registryCategoryF === "Investitor") return "Të gjithë investitorët";
    if (registryCategoryF === "Pronarët e tokës") return "Të gjithë pronarët e tokës";
    if (registryCategoryF === "Kompani ndërtimore") return "Të gjitha kompanitë";
    return "Të gjithë pronarët";
  }, [registryCategoryF]);

  const {
    rows: registryRows,
    filteredCount,
    scopeCount: registryScopeCount,
    page: resolvedRegistryPage,
    pageSize: resolvedRegistryPageSize,
    loading: registryLoading,
    error: registryError,
    refresh: refreshRegistry,
  } = useUnitsRegistry({
    block: blockF,
    type: typeF,
    level: levelF,
    status: statusF,
    category: registryCategoryF,
    entity: activeRegistryEntityF,
    search: deferredSearch,
    page: registryPage,
    pageSize: REGISTRY_PAGE_SIZE,
  });

  const registryPageSize = resolvedRegistryPageSize || REGISTRY_PAGE_SIZE;
  const registryTotalPages = Math.max(1, Math.ceil(filteredCount / registryPageSize));

  const inventoryError = shellError ?? registryError;
  const hasVisibleInventory = totalUnits > 0 || filteredCount > 0;

  const blockOptions = BLOCKS;
  const typeOptions = TYPES;
  const levelOptions = LEVELS;
  const statusOptions = useMemo(() => Object.keys(STATUS_ORDER) as UnitStatus[], []);

  const filtered = useMemo(() => {
    return registryRows
      .map(mapRegistryRowToUnit)
      .sort((a, b) => statusOrderValue(a.status) - statusOrderValue(b.status));
  }, [registryRows]);

  const fetchUnitHistory = async (unitId: string): Promise<UnitHistory[]> => {
    const result = await unitsApi.listUnitHistory(unitId);

    if (result.error !== null) return [];
    return result.data.map((row) => ({
      id: row.id,
      unit_id: row.unit_id ?? "",
      changed_at: row.changed_at ?? "",
      change_reason: row.change_reason ?? "",
      previous_data: toUnitHistorySnapshot(row.previous_data),
      new_data: toUnitHistorySnapshot(row.new_data),
    }));
  };

  const openReservationAction = (unit: Unit, mode: ReservationActionMode) => {
    setReservationAction({ unit, mode });
  };

  const handleReservationActionSubmit = async ({
    expiresAt,
    notes,
  }: {
    expiresAt?: string;
    notes?: string;
  }) => {
    if (!reservationAction?.unit.active_reservation_id) {
      throw new Error("Rezervimi aktiv nuk u gjet.");
    }

    const result =
      reservationAction.mode === "extend"
        ? await reservationsApi.extendUnitReservation({
            reservationId: reservationAction.unit.active_reservation_id,
            expiresAt: toReservationExpiryTimestamp(expiresAt ?? ""),
            notes,
          })
        : await reservationsApi.cancelUnitReservation({
            reservationId: reservationAction.unit.active_reservation_id,
            notes,
          });

    if (result.error) {
      throw new Error(result.error);
    }

    await Promise.all([
      refreshShell(),
      refreshRegistry(),
      refreshUnitDetail(),
    ]);
  };

  return (
    <div style={{ background: PAGE_BG }}>
      {reservationAction && (
        <ReservationActionDialog
          key={`${reservationAction.unit.id}-${reservationAction.mode}`}
          unit={reservationAction.unit}
          mode={reservationAction.mode}
          onClose={() => setReservationAction(null)}
          onSubmit={handleReservationActionSubmit}
        />
      )}

      {activeDrawerUnit && activeUnitDrawer && (
        <UnitDetailDrawer
          key={`${activeDrawerUnit.id}-${activeUnitDrawer.initialTab}`}
          unit={activeDrawerUnit}
          initialTab={activeUnitDrawer.initialTab}
          onClose={() => setActiveUnitDrawer(null)}
          fetchHistory={fetchUnitHistory as (id: string) => Promise<UnitHistory[]>}
          onExtendReservation={(unit) => openReservationAction(unit, "extend")}
          onReleaseReservation={(unit) => openReservationAction(unit, "release")}
        />
      )}

      <div className="mx-auto max-w-[1280px] px-10 pt-6 pb-10">
        <PageHeader
          tone="brand"
          title="Njësitë"
          subtitle="Inventari i plotë i njësive me status, pronësi, rezervime aktive dhe histori ndryshimesh."
          className="!mb-3 items-start gap-x-8 gap-y-2.5"
          bodyClassName="min-w-[320px] flex-[1_1_560px] sm:self-center"
          contentClassName="max-w-[620px]"
          titleClassName="leading-[0.94]"
          subtitleClassName="max-w-[620px]"
          rightClassName="w-full sm:w-auto sm:self-start"
          right={
            <div className="w-full rounded-[16px] border border-black/[0.05] bg-[#fcfcfd] px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] sm:min-w-[404px] sm:max-w-[428px]">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-[12px] border border-[#edf0f4] bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                    Gjithsej njësi
                  </p>
                  {shellLoading ? (
                    <div className="mt-2 h-6 w-16 animate-pulse rounded-full bg-[#eef1f5]" />
                  ) : (
                    <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.04em] text-[#003883]">
                      {totalUnits}
                    </p>
                  )}
                </div>

                <div className="rounded-[12px] border border-[#edf0f4] bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                    Rezervime aktive
                  </p>
                  {shellLoading ? (
                    <div className="mt-2 h-6 w-16 animate-pulse rounded-full bg-[#eef1f5]" />
                  ) : (
                    <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.04em] text-[#003883]">
                      {activeReservationsCount}
                    </p>
                  )}
                </div>
              </div>
              {!shellLoading && (
                <p className="mt-2 px-0.5 text-[11.5px] text-black/34">
                  {availableUnitsCount} në dispozicion në regjistrin aktual.
                </p>
              )}
            </div>
          }
        />

        {inventoryError && (
          <div className="mb-6 flex items-start gap-2 rounded-[16px] border border-[#f1dddd] bg-[#fdf7f7] px-4 py-3 text-[#8e4a4a] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
            <AlertCircle size={15} className="mt-[2px] shrink-0" />
            <div>
              <p className="text-[12.5px] font-medium">
                Inventari i njësive nuk u rifreskua plotësisht.
              </p>
              <p className="mt-1 text-[11.5px] text-[#8e4a4a]/80">
                {hasVisibleInventory
                  ? "Po shfaqet pamja e fundit e disponueshme ndërsa rifreskimi nuk u përfundua."
                  : "Kontrolloni lidhjen dhe rifreskoni faqen për ta ngarkuar regjistrin."}
              </p>
            </div>
          </div>
        )}

        <OwnershipSection
          totalUnits={totalUnits}
          ownershipCounts={ownershipCounts}
          loading={shellLoading}
        />

        <StockStatusSection
          loading={shellLoading}
          selectedOwnerCategory={selectedOwnerCategory}
          selectedOwnerEntity={activeSelectedOwnerEntity}
          ownerNames={ownerNames}
          stockCounts={stockCounts}
          onOwnerCategoryChange={(category) => {
            setSelectedOwnerCategory(category);
            setSelectedOwnerEntity("");
          }}
          onOwnerEntityChange={setSelectedOwnerEntity}
        />

        <UnitsRegistrySection
          loading={registryLoading && filtered.length === 0}
          totalUnits={totalUnits}
          filtered={filtered}
          filteredCount={filteredCount}
          registryScopeCount={registryScopeCount}
          search={search}
          blockF={blockF}
          typeF={typeF}
          levelF={levelF}
          statusF={statusF}
          registryCategoryF={registryCategoryF}
          registryEntityF={activeRegistryEntityF}
          blockOptions={blockOptions}
          typeOptions={typeOptions}
          levelOptions={levelOptions}
          statusOptions={statusOptions}
          registryEntityNames={registryEntityNames}
          registryEntityPlaceholder={registryEntityPlaceholder}
          onSearchChange={(value) => {
            setSearch(value);
            setRegistryPage(1);
          }}
          onBlockChange={(value) => {
            setBlockF(value);
            setRegistryPage(1);
          }}
          onTypeChange={(value) => {
            setTypeF(value);
            setRegistryPage(1);
          }}
          onLevelChange={(value) => {
            setLevelF(value);
            setRegistryPage(1);
          }}
          onStatusChange={(value) => {
            setStatusF(value);
            setRegistryPage(1);
          }}
          onRegistryCategoryChange={(value) => {
            setRegistryCategoryF(value);
            setRegistryEntityF("");
            setRegistryPage(1);
          }}
          onRegistryEntityChange={(value) => {
            setRegistryEntityF(value);
            setRegistryPage(1);
          }}
          onPageChange={setRegistryPage}
          currentPage={resolvedRegistryPage}
          totalPages={registryTotalPages}
          pageSize={registryPageSize}
          onOpenUnitDetails={(unit) =>
            setActiveUnitDrawer({ unitId: unit.id, initialTab: "summary", unit })
          }
          onOpenHistory={(unit) =>
            setActiveUnitDrawer({ unitId: unit.id, initialTab: "history", unit })
          }
        />

        <ActiveReservationsSection
          units={activeReservations}
          loading={shellLoading}
          onExtendReservation={(unit) => openReservationAction(unit, "extend")}
          onReleaseReservation={(unit) => openReservationAction(unit, "release")}
        />
      </div>
    </div>
  );
}

function toUnitHistorySnapshot(value: unknown): Partial<Unit> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Partial<Unit>;
}

function mapRegistryRowToUnit(row: RegistryUnitRow): Unit {
  return {
    id: row.id,
    unit_id: row.unit_id,
    block: row.block as Block,
    type: row.type as Unit["type"],
    level: row.level as Level,
    size: row.size,
    price: row.price,
    status: row.status as UnitStatus,
    owner_category: row.owner_category as OwnerCategory,
    owner_name: row.owner_name,
    has_active_reservation: false,
    active_reservation_id: null,
    active_reservation_showing_id: null,
    reservation_expires_at: null,
    notes: null,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
    bedrooms: null,
    bathrooms: null,
    toilets: null,
    orientation: null,
    floorplan_code: null,
    balcony_area: null,
    terrace_area: null,
    final_price: row.final_price,
    sale_date: row.sale_date,
    buyer_name: row.buyer_name,
    payment_type: row.payment_type,
    crm_lead_id: row.crm_lead_id,
  };
}

export default UnitsDashboard;
