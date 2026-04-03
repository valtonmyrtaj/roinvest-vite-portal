import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export type UnitStatus = "Në dispozicion" | "E rezervuar" | "E shitur";
export type UnitType = "Banesë" | "Lokal" | "Garazhë";
export type Block = "Blloku A" | "Blloku B" | "Blloku C";
export type Level =
  | "Garazhë"
  | "Përdhesa"
  | "Kati 1"
  | "Kati 2"
  | "Kati 3"
  | "Kati 4"
  | "Kati 5"
  | "Kati 6"
  | "Penthouse";
export type OwnerCategory =
  | "Investitor"
  | "Pronarët e tokës"
  | "Kompani ndërtimore";

export interface Unit {
  id: string;
  unit_id: string;
  block: Block;
  type: UnitType;
  level: Level;
  size: number;
  price: number;
  status: UnitStatus;
  owner_category: OwnerCategory;
  owner_name: string;
  reservation_expires_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  sale_date?: string | null;
}

export interface UnitHistory {
  id: string;
  unit_id: string;
  changed_at: string;
  change_reason: string;
  previous_data: Partial<Unit>;
  new_data: Partial<Unit>;
}

export interface CreateUnitInput {
  unit_id: string;
  block: Block;
  type: UnitType;
  level: Level;
  size: number;
  price: number;
  status: UnitStatus;
  owner_category: OwnerCategory;
  owner_name: string;
  reservation_expires_at?: string | null;
  sale_date?: string | null;
  notes?: string | null;
}

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const allUnits = data ?? [];
    const today = new Date().toISOString().slice(0, 10);

    // Auto-expire reservations past their expiry date
    const expired = allUnits.filter(
      (u) =>
        u.status === "E rezervuar" &&
        u.reservation_expires_at &&
        u.reservation_expires_at <= today
    );

    for (const u of expired) {
      await supabase
        .from("units")
        .update({ status: "Në dispozicion", reservation_expires_at: null })
        .eq("id", u.id);
    }

    if (expired.length > 0) {
      const { data: fresh } = await supabase
        .from("units")
        .select("*")
        .order("created_at", { ascending: true });
      setUnits(fresh ?? []);
    } else {
      setUnits(allUnits);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const createUnit = async (input: CreateUnitInput) => {
    const payload = { ...input, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from("units")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", JSON.stringify(error));
      return { error: error.message };
    }
    setUnits((prev) => [...prev, data]);
    return { data };
  };

  const updateUnit = async (
    id: string,
    changes: Partial<CreateUnitInput>,
    changeReason: string
  ) => {
    const existing = units.find((u) => u.id === id);
    if (!existing) return { error: "Unit not found" };

    const { data, error } = await supabase
      .from("units")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { error: error.message };

    await supabase.from("unit_history").insert([
      {
        unit_id: id,
        change_reason: changeReason,
        previous_data: existing,
        new_data: data,
      },
    ]);

    setUnits((prev) => prev.map((u) => (u.id === id ? data : u)));
    return { data };
  };

  const deleteUnit = async (id: string) => {
    const { error } = await supabase
      .from("units")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };
    setUnits((prev) => prev.filter((u) => u.id !== id));
    return {};
  };

  const fetchUnitHistory = async (unitId: string): Promise<UnitHistory[]> => {
    const { data, error } = await supabase
      .from("unit_history")
      .select("*")
      .eq("unit_id", unitId)
      .order("changed_at", { ascending: false });

    if (error) return [];
    return data ?? [];
  };

  return {
    units,
    loading,
    error,
    fetchUnits,
    createUnit,
    updateUnit,
    deleteUnit,
    fetchUnitHistory,
  };
}
