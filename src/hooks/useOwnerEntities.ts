import { useState, useEffect, useMemo, useCallback } from "react";
import { ownerEntities as ownerEntitiesApi } from "../lib/api";
import { POSTGRES_UNIQUE_VIOLATION_CODE } from "../lib/api/ownerEntities";
import type { OwnerCategory, Unit } from "./useUnits";

export type OwnerEntitiesByCategory = Record<OwnerCategory, string[]>;

type OwnerEntityResult = { data?: string; error?: string };

const OWNER_CATEGORIES: OwnerCategory[] = ["Investitor", "Pronarët e tokës", "Kompani ndërtimore"];
const RESERVED_OWNER_ENTITY_LABELS = ["Shto entitet të ri", "Zgjidh pronarin"];

function emptyRegistry(): OwnerEntitiesByCategory {
  return {
    Investitor: [],
    "Pronarët e tokës": [],
    "Kompani ndërtimore": [],
  };
}

function normalizeOwnerEntityName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function sameOwnerEntityName(a: string, b: string): boolean {
  return normalizeOwnerEntityName(a).localeCompare(normalizeOwnerEntityName(b), "sq", { sensitivity: "base" }) === 0;
}

function isReservedOwnerEntityKey(value: string): boolean {
  const normalized = normalizeOwnerEntityName(value).toLocaleLowerCase("sq");
  return RESERVED_OWNER_ENTITY_LABELS.some(
    (label) => normalizeOwnerEntityName(label).toLocaleLowerCase("sq") === normalized
  );
}

export function isReservedOwnerEntityName(value: unknown): boolean {
  return typeof value === "string" && isReservedOwnerEntityKey(value);
}

function mergeNames(...groups: Array<string[] | undefined>): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  groups.forEach((group) => {
    group?.forEach((rawName) => {
      if (typeof rawName !== "string") return;
      const name = normalizeOwnerEntityName(rawName);
      if (!name || isReservedOwnerEntityKey(name)) return;

      const key = name.toLocaleLowerCase("sq");
      if (seen.has(key)) return;

      seen.add(key);
      merged.push(name);
    });
  });

  return merged;
}

function ownerEntitiesFromUnits(units: Unit[]): OwnerEntitiesByCategory {
  const registry = emptyRegistry();

  units.forEach((unit) => {
    if (!OWNER_CATEGORIES.includes(unit.owner_category)) return;
    registry[unit.owner_category].push(unit.owner_name);
  });

  return registry;
}

function mergeRegistries(...registries: OwnerEntitiesByCategory[]): OwnerEntitiesByCategory {
  return {
    Investitor: mergeNames(...registries.map((r) => r.Investitor)),
    "Pronarët e tokës": mergeNames(...registries.map((r) => r["Pronarët e tokës"])),
    "Kompani ndërtimore": mergeNames(...registries.map((r) => r["Kompani ndërtimore"])),
  };
}

function safeOwnerCategory(category: unknown): OwnerCategory {
  return OWNER_CATEGORIES.includes(category as OwnerCategory)
    ? (category as OwnerCategory)
    : "Investitor";
}

function rowsToRegistry(rows: Array<{ category: string; name: string }>): OwnerEntitiesByCategory {
  const registry = emptyRegistry();
  for (const row of rows) {
    const cat = row.category as OwnerCategory;
    if (!OWNER_CATEGORIES.includes(cat)) continue;
    registry[cat].push(row.name);
  }
  return registry;
}

export function useOwnerEntities(units: Unit[]) {
  const [storedEntities, setStoredEntities] = useState<OwnerEntitiesByCategory>(emptyRegistry);

  useEffect(() => {
    void ownerEntitiesApi.listOwnerEntities().then((result) => {
      if (result.error === null) {
        setStoredEntities(rowsToRegistry(result.data));
      }
    });
  }, []);

  const ownerEntities = useMemo(
    () => mergeRegistries(storedEntities, ownerEntitiesFromUnits(units)),
    [storedEntities, units],
  );

  const getOptionsForCategory = (category: unknown): string[] =>
    ownerEntities[safeOwnerCategory(category)];

  const addOwnerEntity = useCallback(
    (category: unknown, rawName: string): OwnerEntityResult => {
      const ownerCategory = safeOwnerCategory(category);
      const name = normalizeOwnerEntityName(rawName);

      if (!name) return { error: "Shkruani emrin e entitetit." };
      if (isReservedOwnerEntityKey(name)) return { error: "Ky tekst përdoret vetëm si veprim i UI-së." };

      const alreadyInMerged = ownerEntities[ownerCategory].some((e) => sameOwnerEntityName(e, name));
      if (alreadyInMerged) return { data: name };

      // Optimistic update
      setStoredEntities((prev) => ({
        ...prev,
        [ownerCategory]: mergeNames(prev[ownerCategory], [name]),
      }));

      // Background insert — a unique-constraint violation means the entity
      // already exists, which is a benign race for this product (two tabs
      // creating the same name). We rollback only for unexpected errors.
      void ownerEntitiesApi
        .createOwnerEntity({ category: ownerCategory, name })
        .then((result) => {
          if (result.error && result.error.code !== POSTGRES_UNIQUE_VIOLATION_CODE) {
            // Rollback optimistic update on unexpected error
            setStoredEntities((prev) => ({
              ...prev,
              [ownerCategory]: prev[ownerCategory].filter((e) => !sameOwnerEntityName(e, name)),
            }));
          }
        });

      return { data: name };
    },
    [ownerEntities],
  );

  const renameOwnerEntity = useCallback(
    (category: unknown, currentRawName: string, nextRawName: string): OwnerEntityResult => {
      const ownerCategory = safeOwnerCategory(category);
      const currentName = normalizeOwnerEntityName(currentRawName);
      const nextName = normalizeOwnerEntityName(nextRawName);

      if (!currentName) return { error: "Zgjidhni entitetin që dëshironi të ndryshoni." };
      if (!nextName) return { error: "Shkruani emrin e ri të entitetit." };
      if (isReservedOwnerEntityKey(nextName)) return { error: "Ky tekst përdoret vetëm si veprim i UI-së." };

      const existsInMerged = ownerEntities[ownerCategory].some((e) => sameOwnerEntityName(e, currentName));
      if (!existsInMerged) return { error: "Entiteti nuk u gjet në këtë kategori." };

      const duplicate = ownerEntities[ownerCategory].some(
        (e) => !sameOwnerEntityName(e, currentName) && sameOwnerEntityName(e, nextName),
      );
      if (duplicate) return { error: "Ky emër ekziston tashmë në këtë kategori." };

      // If name comes only from units (not stored), nothing to update in DB
      const isStored = storedEntities[ownerCategory].some((e) => sameOwnerEntityName(e, currentName));
      if (!isStored) return { data: nextName };

      // Optimistic update
      setStoredEntities((prev) => ({
        ...prev,
        [ownerCategory]: mergeNames(
          prev[ownerCategory].map((e) => (sameOwnerEntityName(e, currentName) ? nextName : e)),
        ),
      }));

      // Background rename
      void ownerEntitiesApi
        .renameOwnerEntity({
          category: ownerCategory,
          currentName,
          nextName,
          updatedAt: new Date().toISOString(),
        })
        .then((result) => {
          if (result.error) {
            // Rollback optimistic update
            setStoredEntities((prev) => ({
              ...prev,
              [ownerCategory]: mergeNames(
                prev[ownerCategory].map((e) => (sameOwnerEntityName(e, nextName) ? currentName : e)),
              ),
            }));
          }
        });

      return { data: nextName };
    },
    [ownerEntities, storedEntities],
  );

  const deleteOwnerEntity = useCallback(
    (category: unknown, rawName: string): OwnerEntityResult => {
      const ownerCategory = safeOwnerCategory(category);
      const name = normalizeOwnerEntityName(rawName);

      if (!name) return { error: "Zgjidhni entitetin që dëshironi të fshini." };

      const existsInMerged = ownerEntities[ownerCategory].some((e) => sameOwnerEntityName(e, name));
      if (!existsInMerged) return { error: "Entiteti nuk u gjet në këtë kategori." };

      // If name comes only from units (not stored), nothing to delete from DB
      const isStored = storedEntities[ownerCategory].some((e) => sameOwnerEntityName(e, name));
      if (!isStored) return { data: name };

      // Optimistic update
      setStoredEntities((prev) => ({
        ...prev,
        [ownerCategory]: prev[ownerCategory].filter((e) => !sameOwnerEntityName(e, name)),
      }));

      // Background delete
      void ownerEntitiesApi
        .deleteOwnerEntity({ category: ownerCategory, name })
        .then((result) => {
          if (result.error) {
            // Rollback optimistic update
            setStoredEntities((prev) => ({
              ...prev,
              [ownerCategory]: mergeNames(prev[ownerCategory], [name]),
            }));
          }
        });

      return { data: name };
    },
    [ownerEntities, storedEntities],
  );

  return {
    ownerEntities,
    getOptionsForCategory,
    addOwnerEntity,
    renameOwnerEntity,
    deleteOwnerEntity,
  };
}
