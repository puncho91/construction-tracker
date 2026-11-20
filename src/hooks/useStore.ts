"use client";
import { useCallback, useEffect, useState } from "react";
import { BoqItem, DailyReport, Inspection, Snag } from "@/lib/types";
import { store } from "@/lib/store";
export function useItems(){const [v,set]=useState<BoqItem[]>([]);const [r,sr]=useState(false);useEffect(()=>{set(store.getItems());sr(true)},[]);const u=useCallback((f:(p:BoqItem[])=>BoqItem[])=>{set(p=>{const n=f(p);store.setItems(n);return n})},[]);return{items:v,setItems:u,ready:r}}
export function useSnags(){const [v,set]=useState<Snag[]>([]);const [r,sr]=useState(false);useEffect(()=>{set(store.getSnags());sr(true)},[]);const u=useCallback((f:(p:Snag[])=>Snag[])=>{set(p=>{const n=f(p);store.setSnags(n);return n})},[]);return{snags:v,setSnags:u,ready:r}}
export function useDaily(){const [v,set]=useState<DailyReport[]>([]);const [r,sr]=useState(false);useEffect(()=>{set(store.getDaily());sr(true)},[]);const u=useCallback((f:(p:DailyReport[])=>DailyReport[])=>{set(p=>{const n=f(p);store.setDaily(n);return n})},[]);return{reports:v,setReports:u,ready:r}}
export function useInspections(){const [v,set]=useState<Inspection[]>([]);const [r,sr]=useState(false);useEffect(()=>{set(store.getInspections());sr(true)},[]);const u=useCallback((f:(p:Inspection[])=>Inspection[])=>{set(p=>{const n=f(p);store.setInspections(n);return n})},[]);return{inspections:v,setInspections:u,ready:r}}