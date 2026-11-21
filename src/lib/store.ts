import { supabase } from "./supabase";
import { BoqItem, DailyReport, Inspection, Snag } from "./types";
import { SEED_ITEMS, SEED_SNAGS } from "./data";

export const store = {
  async getItems(): Promise<BoqItem[]> {
    const { data, error } = await supabase.from("boq_items").select("*");
    if (error || !data || data.length === 0) {
      await supabase.from("boq_items").upsert(SEED_ITEMS);
      return SEED_ITEMS;
    }
    return data as BoqItem[];
  },
  async setItems(items: BoqItem[]): Promise<void> {
    await supabase.from("boq_items").delete().neq("id", "");
    await supabase.from("boq_items").upsert(items);
  },

  async getSnags(): Promise<Snag[]> {
    const { data, error } = await supabase.from("snags").select("*");
    if (error || !data || data.length === 0) {
      await supabase.from("snags").upsert(SEED_SNAGS);
      return SEED_SNAGS;
    }
    return data as Snag[];
  },
  async setSnags(snags: Snag[]): Promise<void> {
    await supabase.from("snags").delete().neq("id", "");
    await supabase.from("snags").upsert(snags);
  },

  async getDaily(): Promise<DailyReport[]> {
    const { data, error } = await supabase.from("daily_reports").select("*");
    if (error) return [];
    return (data || []) as DailyReport[];
  },
  async setDaily(reports: DailyReport[]): Promise<void> {
    await supabase.from("daily_reports").delete().neq("id", "");
    await supabase.from("daily_reports").upsert(reports);
  },

  async getInspections(): Promise<Inspection[]> {
    const { data, error } = await supabase.from("inspections").select("*");
    if (error) return [];
    return (data || []) as Inspection[];
  },
  async setInspections(inspections: Inspection[]): Promise<void> {
    await supabase.from("inspections").delete().neq("id", "");
    await supabase.from("inspections").upsert(inspections);
  },
};
