import { Search } from "lucide-react";
import { SectionEyebrow } from "../components/ui/Eyebrow";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { PillBadge } from "../components/ui/PillBadge";
import {
  TABULAR_HEADER_LABEL_CLASS,
  TABULAR_HEADER_ROW_CLASS,
} from "../components/ui/tabularHeader";
import type { Block, Level, Unit, UnitStatus } from "../hooks/useUnits";
import { SkeletonRows } from "../components/SkeletonRows";
import { getUnitContractValue } from "../lib/unitFinancials";
import { getUnitTypeDisplay } from "../lib/unitType";
import { Card, FilterSelect } from "./primitives";
import {
  OWNER_CATEGORIES,
  fmtPrice,
  getDhomaDisplay,
  statusStyleFor,
} from "./shared";

export function UnitsRegistrySection({
  loading,
  units,
  filtered,
  registryScopeUnits,
  search,
  blockF,
  typeF,
  levelF,
  statusF,
  registryCategoryF,
  registryEntityF,
  blockOptions,
  typeOptions,
  levelOptions,
  statusOptions,
  registryEntityNames,
  registryEntityPlaceholder,
  onSearchChange,
  onBlockChange,
  onTypeChange,
  onLevelChange,
  onStatusChange,
  onRegistryCategoryChange,
  onRegistryEntityChange,
  onOpenHistory,
}: {
  loading: boolean;
  units: Unit[];
  filtered: Unit[];
  registryScopeUnits: Unit[];
  search: string;
  blockF: Block | "";
  typeF: string;
  levelF: Level | "";
  statusF: UnitStatus | "";
  registryCategoryF: string;
  registryEntityF: string;
  blockOptions: readonly Block[];
  typeOptions: readonly string[];
  levelOptions: readonly Level[];
  statusOptions: readonly UnitStatus[];
  registryEntityNames: string[];
  registryEntityPlaceholder: string;
  onSearchChange: (value: string) => void;
  onBlockChange: (value: Block | "") => void;
  onTypeChange: (value: string) => void;
  onLevelChange: (value: Level | "") => void;
  onStatusChange: (value: UnitStatus | "") => void;
  onRegistryCategoryChange: (value: string) => void;
  onRegistryEntityChange: (value: string) => void;
  onOpenHistory: (unit: Unit) => void;
}) {
  const activeFilterCount = [
    search,
    blockF,
    typeF,
    levelF,
    statusF,
    registryCategoryF,
    registryEntityF,
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;
  const registryCategoryPillStyle = {
    background: "#f7f7f8",
    color: "rgba(15, 23, 42, 0.66)",
    border: "1px solid #e5e7eb",
  } as const;

  const handleClearFilters = () => {
    onSearchChange("");
    onBlockChange("");
    onTypeChange("");
    onLevelChange("");
    onStatusChange("");
    onRegistryCategoryChange("");
    onRegistryEntityChange("");
  };

  return (
    <div>
      <SectionEyebrow
        className="mb-4"
        label="Regjistri i njësive"
        detail="lista e plotë e stokut"
      />

      <Card className="overflow-hidden p-0">
        <CardSectionHeader
          title="Regjistri"
          subtitle={
            loading
              ? "Duke ngarkuar regjistrin e njësive"
              : `${filtered.length} nga ${registryScopeUnits.length} njësi në listë`
          }
          className="px-6 pt-4 pb-5"
          titleClassName="text-[21px] leading-[1.08] tracking-[-0.035em]"
          subtitleClassName="mt-1 text-[12.5px] leading-[1.3]"
          right={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-full border border-[#e7ebf2] bg-[#fbfcfe] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-black/32">
                {hasActiveFilters ? `${activeFilterCount} filtra aktivë` : "Pamje e plotë"}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-[10px] border border-[#dbe3f2] bg-white px-3 py-2 text-[11.5px] font-semibold text-[#003883] transition hover:bg-[#f8fbff]"
                >
                  Pastro filtrat
                </button>
              )}
            </div>
          }
        />

        <div className="border-b border-[#eef0f4] bg-[#fcfcfd] px-5 py-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.45fr)_repeat(6,minmax(0,1fr))]">
            <label className="md:col-span-2 xl:col-span-1">
              <span className="mb-2 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Kërko sipas ID-së
              </span>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"
                />
                <input
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Shembull: A-01"
                  className="h-[46px] w-full rounded-[14px] border border-[#e8e8ec] bg-white pl-9 pr-3 text-[13px] outline-none transition-all duration-200 placeholder:text-black/24 hover:-translate-y-[1px] hover:border-[#d7dce5] focus:border-[#c8d3e8]"
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Blloku
              </span>
              <FilterSelect
                options={blockOptions}
                value={blockF}
                onChange={(v) => onBlockChange(v as Block | "")}
                placeholder="Të gjitha blloqet"
                className="w-full min-w-0"
              />
            </label>

            <label>
              <span className="mb-2 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Lloji
              </span>
              <FilterSelect
                options={typeOptions}
                value={typeF}
                onChange={onTypeChange}
                placeholder="Të gjitha llojet"
                className="w-full min-w-0"
              />
            </label>

            <label>
              <span className="mb-2 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Niveli
              </span>
              <FilterSelect
                options={levelOptions}
                value={levelF}
                onChange={(v) => onLevelChange(v as Level | "")}
                placeholder="Të gjitha nivelet"
                className="w-full min-w-0"
              />
            </label>

            <label>
              <span className="mb-2 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Statusi
              </span>
              <FilterSelect
                options={statusOptions}
                value={statusF}
                onChange={(v) => onStatusChange(v as UnitStatus | "")}
                placeholder="Të gjitha statuset"
                className="w-full min-w-0"
              />
            </label>

            <label>
              <span className="mb-2 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Kategoria
              </span>
              <FilterSelect
                options={OWNER_CATEGORIES}
                value={registryCategoryF}
                onChange={onRegistryCategoryChange}
                placeholder="Të gjitha kategoritë"
                className="w-full min-w-0"
              />
            </label>

            <label>
              <span className="mb-2 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Pronari
              </span>
              <FilterSelect
                options={registryEntityNames}
                value={registryEntityF}
                onChange={onRegistryEntityChange}
                placeholder={registryEntityPlaceholder}
                className="w-full min-w-0"
              />
            </label>
          </div>

          <p className="mt-3 text-[11.5px] text-black/34">
            {loading
              ? "Duke përgatitur regjistrin dhe filtrat e disponueshëm."
              : hasActiveFilters
                ? `Filtrat aktivë po ngushtojnë listën brenda ${registryScopeUnits.length} njësive të përzgjedhura.`
                : "Kërko sipas ID-së së njësisë ose përdor filtrat për të lexuar regjistrin sipas bllokut, llojit, nivelit, statusit dhe pronësisë."}
          </p>
        </div>

        <div className="max-h-[560px] overflow-auto">
          {loading ? (
            <SkeletonRows rows={7} className="px-5 py-6" />
          ) : (
            <table className="w-full min-w-[1080px] text-[12px] font-normal">
              <thead className="sticky top-0 z-10">
                <tr className={TABULAR_HEADER_ROW_CLASS}>
                  {[
                    "ID e njësisë",
                    "Blloku",
                    "Lloji",
                    "Niveli",
                    "Kategoria e pronësisë",
                    "Pronari",
                    "Sipërfaqja (m²)",
                    "Dhoma",
                    "Statusi",
                    "Çmimi",
                    "Historia",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap py-3 ${TABULAR_HEADER_LABEL_CLASS} ${
                        i === 0
                          ? "pl-6 pr-3 text-left"
                          : i === 9
                            ? "pl-3 pr-3 text-right"
                            : i === 10
                              ? "pl-3 pr-6 text-center"
                              : i >= 8
                                ? "px-3 text-center"
                                : "px-3 text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((u) => {
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-[#f0f0f2] transition hover:bg-[#fafafc]"
                    >
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-[13px] font-normal text-black/68">
                        {u.unit_id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-black/60">{u.block}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-black/70">
                        {getUnitTypeDisplay(u.type, u.level)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-black/60">{u.level}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-center">
                        <PillBadge weight="medium" style={registryCategoryPillStyle}>
                          {u.owner_category}
                        </PillBadge>
                      </td>
                      <td className="max-w-[160px] truncate whitespace-nowrap px-3 py-4 text-black/60">
                        {u.owner_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-left text-black/60">
                        {u.size} m²
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-left text-black/60">
                        {getDhomaDisplay(u)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-center">
                        <PillBadge weight="normal" style={statusStyleFor(u.status)}>
                          {u.status}
                        </PillBadge>
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 pr-3 text-right text-[13px] font-semibold text-black/75">
                        {fmtPrice(getUnitContractValue(u))}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 pr-6 text-center">
                        <button
                          onClick={() => onOpenHistory(u)}
                          className="rounded-[8px] border border-[#e8e8ec] bg-white px-2.5 py-1 text-[11px] text-black/40 transition hover:border-[#003883] hover:text-[#003883]"
                        >
                          Historia
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-16 text-center">
                      <p className="text-[13px] font-medium text-black/40">
                        {units.length === 0 || registryScopeUnits.length === 0
                          ? "Nuk ka njësi të regjistruara ende për këtë përzgjedhje."
                          : "Asnjë njësi nuk përputhet me filtrat aktualë."}
                      </p>
                      <p className="mt-1 text-[11.5px] text-black/28">
                        {units.length === 0 || registryScopeUnits.length === 0
                          ? "Ndrysho përzgjedhjen ose shto njësi të reja te Të dhënat."
                          : "Rishikoni filtrat për ta rikthyer listën e plotë."}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="mt-4 rounded-[10px] border border-[#dbe3f2] bg-white px-3 py-2 text-[11.5px] font-semibold text-[#003883] transition hover:bg-[#f8fbff]"
                        >
                          Pastro filtrat
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
