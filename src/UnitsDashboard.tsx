import { useMemo, useState } from "react";
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
import {
  APARTMENT_SUBTYPES,
  BLOCKS,
  LEVELS,
  TYPES,
  STATUS_ORDER,
  normalize,
  statusOrderValue,
} from "./units-dashboard/shared";

export function UnitsDashboard() {
  const { units, loading, fetchUnitHistory } = useUnits();
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

  // "Lloji" always shows the three fixed category labels — not derived from data
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
          (!typeF || (
            typeF === "Penthouse" ? u.level === "Penthouse" :
            typeF === "Banesë"    ? APARTMENT_SUBTYPES.has(u.type) :
                                    u.type === typeF
          )) &&
          (!activeLevelF || u.level === activeLevelF) &&
          (!activeStatusF || u.status === activeStatusF) &&
          (!search || normalize(String(u.unit_id ?? "")).includes(normalize(search)))
        );
      })
      .sort((a, b) => statusOrderValue(a.status) - statusOrderValue(b.status));
  }, [activeBlockF, activeLevelF, activeStatusF, registryScopeUnits, search, typeF]);

  return (
    <div style={{ background: PAGE_BG }}>
      {historyUnit && (
        <HistoryDrawer
          unit={historyUnit}
          onClose={() => setHistoryUnit(null)}
          fetchHistory={fetchUnitHistory as (id: string) => Promise<UnitHistory[]>}
        />
      )}

      <div className="mx-auto max-w-[1280px] px-10 py-10">
        <PageHeader
          as="h2"
          title="Të gjitha njësitë"
          subtitle="Pamje e plotë e inventarit të njësive, me filtrim sipas llojit, nivelit, statusit dhe kategorisë së pronësisë."
          titleClassName="text-black/92"
          subtitleClassName="text-black/36"
        />

        <OwnershipSection units={units} />

        <StockStatusSection
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

        <ActiveReservationsSection units={units} />
      </div>
    </div>
  );
}

export default UnitsDashboard;
