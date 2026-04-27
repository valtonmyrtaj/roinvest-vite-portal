import { ChevronsLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
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
  statusStyleFor,
} from "./shared";

export function UnitsRegistrySection({
  loading,
  totalUnits,
  filtered,
  filteredCount,
  registryScopeCount,
  currentPage,
  totalPages,
  pageSize,
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
  onPageChange,
  onOpenUnitDetails,
  onOpenHistory,
}: {
  loading: boolean;
  totalUnits: number;
  filtered: Unit[];
  filteredCount: number;
  registryScopeCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
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
  onPageChange: (page: number) => void;
  onOpenUnitDetails: (unit: Unit) => void;
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

  const toolbarPrimaryMeta = loading
    ? "Duke përgatitur regjistrin"
    : `${filteredCount} njësi në listë`;
  const toolbarSecondaryMeta = loading
    ? "Filtrat po ngarkohen"
    : hasActiveFilters
      ? `${activeFilterCount} filtra aktivë`
      : "Pa filtra shtesë";
  const pageStart = filteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = filteredCount === 0 ? 0 : Math.min(filteredCount, currentPage * pageSize);
  const hasPagination = totalPages > 1;

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
              : `${filteredCount} nga ${registryScopeCount} njësi në listë`
          }
          className="px-6 pt-4 pb-5"
          titleStyle={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "0em",
            lineHeight: 1.18,
          }}
          subtitleStyle={{
            fontSize: 11.75,
            fontWeight: 500,
            lineHeight: 1.35,
          }}
          right={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-full border border-[#e7ebf2] bg-[#fbfcfe] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-black/32">
                {hasActiveFilters ? `${activeFilterCount} filtra aktivë` : "Pamje e plotë"}
              </span>
            </div>
          }
        />

        <div className="border-b border-[#eef0f4] bg-[#fcfcfd] px-5 pt-4 pb-3">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.65fr)_repeat(6,minmax(0,0.95fr))]">
            <label className="md:col-span-2 xl:col-span-1">
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
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
                  placeholder="Shembull: BA-01"
                  className="h-[42px] w-full rounded-[13px] border border-[#e4e7ed] bg-white pl-9 pr-3 text-[13px] text-black/72 outline-none transition-colors duration-200 placeholder:text-black/24 focus:border-[#c8d3e8] focus:shadow-[0_0_0_3px_rgba(0,56,131,0.05)]"
                />
              </div>
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Blloku
              </span>
              <FilterSelect
                options={blockOptions}
                value={blockF}
                onChange={(v) => onBlockChange(v as Block | "")}
                placeholder="Të gjitha blloqet"
                size="md"
                className="w-full min-w-0"
              />
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Lloji
              </span>
              <FilterSelect
                options={typeOptions}
                value={typeF}
                onChange={onTypeChange}
                placeholder="Të gjitha llojet"
                size="md"
                className="w-full min-w-0"
              />
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Niveli
              </span>
              <FilterSelect
                options={levelOptions}
                value={levelF}
                onChange={(v) => onLevelChange(v as Level | "")}
                placeholder="Të gjitha nivelet"
                size="md"
                className="w-full min-w-0"
              />
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Statusi
              </span>
              <FilterSelect
                options={statusOptions}
                value={statusF}
                onChange={(v) => onStatusChange(v as UnitStatus | "")}
                placeholder="Të gjitha statuset"
                size="md"
                className="w-full min-w-0"
              />
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Pronësia
              </span>
              <FilterSelect
                options={OWNER_CATEGORIES}
                value={registryCategoryF}
                onChange={onRegistryCategoryChange}
                placeholder="Të gjitha pronësitë"
                size="md"
                className="w-full min-w-0"
              />
            </label>

            <label>
              <span className="mb-1.5 block pl-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/28">
                Pronari
              </span>
              <FilterSelect
                options={registryEntityNames}
                value={registryEntityF}
                onChange={onRegistryEntityChange}
                placeholder={registryEntityPlaceholder}
                size="md"
                className="w-full min-w-0"
              />
            </label>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0f4] pt-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
              <span className="font-medium text-black/48">{toolbarPrimaryMeta}</span>
              <span className="inline-block h-[4px] w-[4px] rounded-full bg-black/[0.14]" />
              <span className="text-black/34">{toolbarSecondaryMeta}</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-[10px] border border-[#dbe3f2] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#003883] transition hover:bg-[#f8fbff]"
              >
                Pastro filtrat
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[560px] overflow-auto">
          {loading ? (
            <SkeletonRows rows={7} className="px-5 py-6" />
          ) : (
            <table className="w-full min-w-[980px] text-[12px] font-normal">
              <thead className="sticky top-0 z-10">
                <tr className={TABULAR_HEADER_ROW_CLASS}>
                  {[
                    "Njësia",
                    "Blloku",
                    "Lloji",
                    "Niveli",
                    "Pronësia",
                    "Pronari",
                    "Sipërfaqja",
                    "Statusi",
                    "Çmimi",
                    "Historia",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap py-3 ${TABULAR_HEADER_LABEL_CLASS} ${
                        i === 0
                          ? "pl-6 pr-3 text-left"
                          : i === 4
                            ? "pl-4 pr-3 text-left"
                          : i === 8
                            ? "pl-3 pr-3 text-right"
                            : i === 9
                              ? "pl-3 pr-6 text-center"
                              : i === 7
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
                      tabIndex={0}
                      role="button"
                      onClick={() => onOpenUnitDetails(u)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenUnitDetails(u);
                        }
                      }}
                      className="cursor-pointer border-t border-[#f0f0f2] transition hover:bg-[#fafafc] focus-visible:bg-[#fafafc] focus-visible:outline-none"
                    >
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-[13px] font-normal text-black/78">
                        {u.unit_id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-black/60">{u.block}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-black/70">
                        {getUnitTypeDisplay(u.type, u.level)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-black/60">{u.level}</td>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-left">
                        <PillBadge weight="medium" style={registryCategoryPillStyle}>
                          {u.owner_category}
                        </PillBadge>
                      </td>
                      <td className="max-w-[220px] truncate whitespace-nowrap px-3 py-4 text-black/60">
                        {u.owner_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-left text-black/60">
                        {u.size} m²
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
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenHistory(u);
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                          className="rounded-[8px] border border-[#e8e8ec] bg-[#fbfcfe] px-2.5 py-1 text-[11px] font-medium text-black/42 transition hover:border-[#003883] hover:text-[#003883]"
                        >
                          Historia
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12">
                      <div className="mx-auto flex max-w-[420px] flex-col items-center rounded-[16px] border border-dashed border-[#e5eaf2] bg-[#fcfcfd] px-5 py-8 text-center shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
                        <p className="text-[13px] font-medium text-black/42">
                          {totalUnits === 0 || registryScopeCount === 0
                            ? "Nuk ka njësi të regjistruara ende për këtë përzgjedhje."
                            : "Asnjë njësi nuk përputhet me filtrat aktualë."}
                        </p>
                        <p className="mt-1 text-[11.5px] text-black/30">
                          {totalUnits === 0 || registryScopeCount === 0
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
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filteredCount > 0 && (
          <div className="border-t border-[#eef0f4] bg-[#fcfcfd] px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <p className="text-[11.5px] text-black/38">
                Shfaqen {pageStart}-{pageEnd} nga {filteredCount} njësi
              </p>

              {hasPagination && (
                <div className="flex items-center rounded-full border border-[#e7ebf2] bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                  <button
                    type="button"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage <= 1 || loading}
                    aria-label="Faqja e parë"
                    className="grid h-[28px] w-[24px] place-items-center rounded-full text-black/38 transition hover:bg-[#f6f8fd] hover:text-[#003883] disabled:cursor-not-allowed disabled:text-black/16 disabled:hover:bg-transparent"
                  >
                    <ChevronsLeft size={14} strokeWidth={2.15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    aria-label="Faqja e mëparshme"
                    className="grid h-[28px] w-[24px] place-items-center rounded-full text-black/38 transition hover:bg-[#f6f8fd] hover:text-[#003883] disabled:cursor-not-allowed disabled:text-black/16 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={14} strokeWidth={2.15} />
                  </button>

                  <span className="ml-1 min-w-[94px] rounded-full bg-[#f8faff] px-2.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-black/36">
                    Faqja {currentPage} nga {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    aria-label="Faqja tjetër"
                    className="ml-1 grid h-[28px] w-[24px] place-items-center rounded-full text-black/38 transition hover:bg-[#f6f8fd] hover:text-[#003883] disabled:cursor-not-allowed disabled:text-black/16 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={14} strokeWidth={2.15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
