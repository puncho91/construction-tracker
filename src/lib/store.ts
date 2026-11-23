import { supabase } from "./supabase";
import { BoqItem, DailyReport, Inspection, Snag } from "./types";
import { SEED_ITEMS, SEED_SNAGS } from "./data";

export const store = {
  async getItems(): Promise<BoqItem[]> {
    const { data, error } = await supabase.from("boq_items").select("*");
    if (error || !data || data.length === 0) {
      await supabase.from("boq_items").insert(SEED_ITEMS);
      return SEED_ITEMS;
    }
    return data as BoqItem[];
  },
  async setItems(items: BoqItem[]): Promise<void> {
    const del = await supabase.from("boq_items").delete().neq("id", "");
    if (del.error) throw new Error("Delete failed: " + del.error.message);
    const ins = await supabase.from("boq_items").insert(items);
    if (ins.error) throw new Error("Insert failed: " + ins.error.message);
  },
  async getSnags(): Promise<Snag[]> {
    const { data, error } = await supabase.from("snags").select("*");
    if (error || !data || data.length === 0) {
      await supabase.from("snags").insert(SEED_SNAGS);
      return SEED_SNAGS;
    }
    return data as Snag[];
  },
  async setSnags(snags: Snag[]): Promise<void> {
    const del = await supabase.from("snags").delete().neq("id", "");
    if (del.error) throw new Error(del.error.message);
    const ins = await supabase.from("snags").insert(snags);
    if (ins.error) throw new Error(ins.error.message);
  },
  async getDaily(): Promise<DailyReport[]> {
    const { data, error } = await supabase.from("daily_reports").select("*");
    if (error) return [];
    return (data || []) as DailyReport[];
  },
  async setDaily(reports: DailyReport[]): Promise<void> {
    const del = await supabase.from("daily_reports").delete().neq("id", "");
    if (del.error) throw new Error(del.error.message);
    const ins = await supabase.from("daily_reports").insert(reports);
    if (ins.error) throw new Error(ins.error.message);
  },
  async getInspections(): Promise<Inspection[]> {
    const { data, error } = await supabase.from("inspections").select("*");
    if (error) return [];
    return (data || []) as Inspection[];
  },
  async setInspections(inspections: Inspection[]): Promise<void> {
    const del = await supabase.from("inspections").delete().neq("id", "");
    if (del.error) throw new Error(del.error.message);
    const ins = await supabase.from("inspections").insert(inspections);
    if (ins.error) throw new Error(ins.error.message);
  },
};