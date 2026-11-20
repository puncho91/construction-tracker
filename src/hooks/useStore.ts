"use client";
import { useCallback, useEffect, useState } from "react";
import { BoqItem, DailyReport, Inspection, Snag } from "@/lib/types";
import { store } from "@/lib/store";

export function useItems() {
  const [items, setItems] = useState<BoqItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    store.getItems().then((data) => { setItems(data); setReady(true); });
  }, []);
  const update = useCallback(async (updater: (prev: BoqItem[]) => BoqItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      store.setItems(next);
      return next;
    });
  }, []);
  return { items, setItems: update, ready };
}

export function useSnags() {
  const [snags, setSnags] = useState<Snag[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    store.getSnags().then((data) => { setSnags(data); setReady(true); });
  }, []);
  const update = useCallback(async (updater: (prev: Snag[]) => Snag[]) => {
    setSnags((prev) => {
      const next = updater(prev);
      store.setSnags(next);
      return next;
    });
  }, []);
  return { snags, setSnags: update, ready };
}

export function useDaily() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    store.getDaily().then((data) => { setReports(data); setReady(true); });
  }, []);
  const update = useCallback(async (updater: (prev: DailyReport[]) => DailyReport[]) => {
    setReports((prev) => {
      const next = updater(prev);
      store.setDaily(next);
      return next;
    });
  }, []);
  return { reports, setReports: update, ready };
}

export function useInspections() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    store.getInspections().then((data) => { setInspections(data); setReady(true); });
  }, []);
  const update = useCallback(async (updater: (prev: Inspection[]) => Inspection[]) => {
    setInspections((prev) => {
      const next = updater(prev);
      store.setInspections(next);
      return next;
    });
  }, []);
  return { inspections, setInspections: update, ready };
}
