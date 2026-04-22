import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useOwnerEntities } from "./hooks/useOwnerEntities";
import { useUnits } from "./hooks/useUnits";
import type { Unit, UnitHistory, OwnerCategory, UnitStatus, Block, Level } from "./hooks/useUnits";
import { ActiveReservationsSection } from "./units-dashboard/ActiveReservationsSection";
import { PageHeader } from "./components/ui/PageHeader";
import { HistoryDrawer } from "./units-dashboard/HistoryDrawer";
import { OwnershipSection } from "./units-dashboard/OwnershipSection";
import { StockStatusSection } from "./units-dashboard/StockStatusSection";
import { UnitsRegistrySection } from "./units-dashboard/UnitsRegistrySection";
import { PAGE_BG } from "./ui/tokens";
import { getCanonicalUnitType } from "./lib/unitType";
import {
  BLOCKS,
  LEVELS,
  TYPES,
  STATUS_ORDER,
  normalize,
  statusOrderValue,
} from "./units-dashboard/shared";

export function UnitsDashboard() {
  const { units, loading, error, fetchUnitHistory } = useUnits();
  const { getOptionsForCategory } = useOwnerEntities(units);

  const [blockF, setBlockF] = useState<Block | "">("");
  const [typeF, setTypeF] = useState("");
  const [levelF, setLevelF] = useState<Level | "">("");
  const [statusF, setStatusF] = useState<UnitStatus | "">("");
  const [registryCategoryF, setRegistryCategoryF] = useState("");
  const [registryEntityF, setRegistryEntityF] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOwnerCategory, setSelectedOwnerCategory] = useState<OwnerCategory>("Investitor");
  const [selectedOwnerEntity, setSelectedOwnerEntity] = useState("");
  const [historyUnit, setHistoryUnit] = useState<Unit | null>(null);

  const scopedUnits = useMemo(() => {
    return units.filter((u) => u.owner_category === selectedOwnerCategory);
  }, [units, selectedOwnerCategory]);

  const ownerNames = useMemo(() => {
    return getOptionsForCategory(selectedOwnerCategory);
  }, [getOptionsForCategory, selectedOwnerCategory]);

  const activeSelectedOwnerEntity =
    selectedOwnerEntity && ownerNames.includes(selectedOwnerEntity)
      ? selectedOwnerEntity
      : "";

  const stockStatusUnits = useMemo(() => {
    return scopedUnits.filter((u) => {
      const matchEntity = !activeSelectedOwnerEntity || u.owner_name === activeSelectedOwnerEntity;
      return matchEntity;
    });
  }, [activeSelectedOwnerEntity, scopedUnits]);

  const registryEntityNames = useMemo(() => {
    if (!registryCategoryF) return [];
    return getOptionsForCategory(registryCategoryF as OwnerCategory);
  }, [getOptionsForCategory, registryCategoryF]);

  const activeRegistryEntityF =
    registryEntityF && registryEntityNames.includes(registryEntityF)
      ? registryEntityF
      : "";

  const registryEntityPlaceholder = useMemo(() => {
    if (registryCategoryF === "Investitor") return "Të gjithë investitorët";
    if (registryCategoryF === "Pronarët e tokës") return "Të gjithë pronarët e tokës";
    if (registryCategoryF === "Kompani ndërtimore") return "Të gjitha kompanitë";
    return "Të gjithë pronarët";
  }, [registryCategoryF]);

  const registryScopeUnits = useMemo(() => {
    return units.filter((u) => {
      const matchCategory = !registryCategoryF || u.owner_category === registryCategoryF;
      const matchEntity = !activeRegistryEntityF || u.owner_name === activeRegistryEntityF;
      return matchCategory && matchEntity;
    });
  }, [activeRegistryEntityF, registryCategoryF, units]);

  // Derive dropdown options directly from actual unit data so options always
  // match whatever string values are stored in the database.
  const blockOptions = useMemo(() => {
    const vals = [...new Set(
      units.map((u) => u.block).filter((v): v is Block => typeof v === "string" && v.trim() !== ""),
    )];
    return vals.sort((a, b) => {
      const ai = BLOCKS.indexOf(a); const bi = BLOCKS.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [units]);

  // "Lloji" always shows the fixed canonical category labels — not derived from raw DB strings.
  const typeOptions = [...TYPES];

  const levelOptions = useMemo(() => {
    const vals = [...new Set(
      units.map((u) => u.level).filter((v): v is Level => typeof v === "string" && v.trim() !== ""),
    )];
    return vals.sort((a, b) => {
      const ai = LEVELS.indexOf(a); const bi = LEVELS.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [units]);

  const statusOptions = useMemo(() => {
    const vals = [...new Set(
      units.map((u) => u.status).filter((v): v is UnitStatus => typeof v === "string" && v.trim() !== ""),
    )];
    return vals.sort((a, b) => (STATUS_ORDER[a] ?? 99) - (STATUS_ORDER[b] ?? 99));
  }, [units]);

  const activeBlockF = blockF && blockOptions.includes(blockF) ? blockF : "";
  const activeLevelF = levelF && levelOptions.includes(levelF) ? levelF : "";
  const activeStatusF = statusF && statusOptions.includes(statusF) ? statusF : "";

  const filtered = useMemo(() => {
    return [...registryScopeUnits]
      .filter((u) => {
        return (
          (!activeBlockF || u.block === activeBlockF) &&
          (!typeF || getCanonicalUnitType(u.type, u.level) === typeF) &&
          (!activeLevelF || u.level === activeLevelF) &&
          (!activeStatusF || u.status === activeStatusF) &&
          (!search || normalize(String(u.unit_id ?? "")).includes(normalize(search)))
        );
      })
      .sort((a, b) => statusOrderValue(a.status) - statusOrderValue(b.status));
  }, [activeBlockF, activeLevelF, activeStatusF, registryScopeUnits, search, typeF]);

  const availableUnitsCount = useMemo(
    () => units.filter((unit) => unit.status === "Në dispozicion").length,
    [units],
  );
  const activeReservationsCount = useMemo(
    () =>
      units.filter((unit) => unit.status === "E rezervuar" && unit.reservation_expires_at).length,
    [units],
  );

  return (
    <div style={{ background: PAGE_BG }}>
      {historyUnit && (
        <HistoryDrawer
          key={historyUnit.id}
          unit={historyUnit}
          onClose={() => setHistoryUnit(null)}
          fetchHistory={fetchUnitHistory as (id: string) => Promise<UnitHistory[]>}
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
                  {loading ? (
                    <div className="mt-2 h-6 w-16 animate-pulse rounded-full bg-[#eef1f5]" />
                  ) : (
                    <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.04em] text-[#003883]">
                      {units.length}
                    </p>
                  )}
                </div>

                <div className="rounded-[12px] border border-[#edf0f4] bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                    Rezervime aktive
                  </p>
                  {loading ? (
                    <div className="mt-2 h-6 w-16 animate-pulse rounded-full bg-[#eef1f5]" />
                  ) : (
                    <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.04em] text-[#003883]">
                      {activeReservationsCount}
                    </p>
                  )}
                </div>
              </div>
              {!loading && (
                <p className="mt-2 px-0.5 text-[11.5px] text-black/34">
                  {availableUnitsCount} në dispozicion në regjistrin aktual.
                </p>
              )}
            </div>
          }
        />

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-[16px] border border-[#f1dddd] bg-[#fdf7f7] px-4 py-3 text-[#8e4a4a] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
            <AlertCircle size={15} className="mt-[2px] shrink-0" />
            <div>
              <p className="text-[12.5px] font-medium">
                Inventari i njësive nuk u rifreskua plotësisht.
              </p>
              <p className="mt-1 text-[11.5px] text-[#8e4a4a]/80">
                {units.length > 0
                  ? "Po shfaqet pamja e fundit e disponueshme ndërsa rifreskimi nuk u përfundua."
                  : "Kontrolloni lidhjen dhe rifreskoni faqen për ta ngarkuar regjistrin."}
              </p>
            </div>
          </div>
        )}

        <OwnershipSection units={units} loading={loading} />

        <StockStatusSection
          loading={loading}
          selectedOwnerCategory={selectedOwnerCategory}
          selectedOwnerEntity={activeSelectedOwnerEntity}
          ownerNames={ownerNames}
          stockStatusUnits={stockStatusUnits}
          onOwnerCategoryChange={(category) => {
            setSelectedOwnerCategory(category);
            setSelectedOwnerEntity("");
          }}
          onOwnerEntityChange={setSelectedOwnerEntity}
        />

        <UnitsRegistrySection
          loading={loading}
          units={units}
          filtered={filtered}
          registryScopeUnits={registryScopeUnits}
          search={search}
          blockF={activeBlockF}
          typeF={typeF}
          levelF={activeLevelF}
          statusF={activeStatusF}
          registryCategoryF={registryCategoryF}
          registryEntityF={activeRegistryEntityF}
          blockOptions={blockOptions}
          typeOptions={typeOptions}
          levelOptions={levelOptions}
          statusOptions={statusOptions}
          registryEntityNames={registryEntityNames}
          registryEntityPlaceholder={registryEntityPlaceholder}
          onSearchChange={setSearch}
          onBlockChange={setBlockF}
          onTypeChange={setTypeF}
          onLevelChange={setLevelF}
          onStatusChange={setStatusF}
          onRegistryCategoryChange={(value) => {
            setRegistryCategoryF(value);
            setRegistryEntityF("");
          }}
          onRegistryEntityChange={setRegistryEntityF}
          onOpenHistory={setHistoryUnit}
        />

        <ActiveReservationsSection units={units} loading={loading} />
      </div>
    </div>
  );
}

export default UnitsDashboard;
