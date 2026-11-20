"use client";
import { BoqItem, DailyReport, Inspection, Snag } from "./types";
import { SEED_ITEMS, SEED_SNAGS } from "./data";
const KI="sapr_items_v1",KS="sapr_snags_v1",KD="sapr_daily_v1",KC="sapr_inspections_v1";
function read<T>(k:string,f:T):T{if(typeof window==="undefined")return f;try{const r=localStorage.getItem(k);return r?JSON.parse(r):f}catch{return f}}
function write<T>(k:string,v:T){if(typeof window!=="undefined")localStorage.setItem(k,JSON.stringify(v))}
export const store={
  getItems:()=>read<BoqItem[]>(KI,SEED_ITEMS), setItems:(v:BoqItem[])=>write(KI,v),
  getSnags:()=>read<Snag[]>(KS,SEED_SNAGS), setSnags:(v:Snag[])=>write(KS,v),
  getDaily:()=>read<DailyReport[]>(KD,[]), setDaily:(v:DailyReport[])=>write(KD,v),
  getInspections:()=>read<Inspection[]>(KC,[]), setInspections:(v:Inspection[])=>write(KC,v)
};