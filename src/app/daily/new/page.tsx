"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDaily, useItems } from "@/hooks/useStore";
import { SEED_PROJECT } from "@/lib/data";
import { DailyReport, Discipline, Manpower } from "@/lib/types";
import { projectStats, uid, formatPct, formatBirr } from "@/lib/calc";

export default function NewDailyPage() {
  const router = useRouter();
  const { setReports } = useDaily();
  const { items } = useItems();
  const stats = projectStats(SEED_PROJECT, items);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState("Sunny, 32°C");
  const [discipline, setDiscipline] = useState<Discipline>("Architectural");
  const [accomplishments, setAccomplishments] = useState("");
  const [notes, setNotes] = useState("");
  const [manpower, setManpower] = useState<Manpower[]>([
    { trade: "Project Manager", count: 1 },
    { trade: "Site Engineer", count: 2 },
    { trade: "Forman", count: 3 },
    { trade: "Carpenter", count: 5 },
  ]);

  const addRow = () => setManpower([...manpower, { trade: "", count: 0 }]);
  const removeRow = (i: number) => setManpower(manpower.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof Manpower, value: string | number) =>
    setManpower(manpower.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  const save = () => {
    if (!accomplishments.trim()) { alert("Please fill in Accomplishments"); return; }
    const report: DailyReport = {
      id: uid("daily"),
      date, weather, disciplineFocus: discipline,
      manpower: manpower.filter((m) => m.trade.trim()),
      accomplishments, notes,
      snapshotOverallPct: stats.pct,
      snapshotExecuted: stats.executed,
    };
    setReports((prev) => {
      const existing = prev.findIndex((r) => r.date === date);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = report;
        return next;
      }
      return [report, ...prev];
    });
    router.push("/daily");
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/daily" className="text-sm text-brand-600 hover:underline">← All reports</Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">New Daily Site Report</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/daily" className="btn-ghost">Cancel</Link>
          <button className="btn-primary" onClick={save}>Save Report</button>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Weather</label>
          <input className="input" value={weather} onChange={(e) => setWeather(e.target.value)} />
        </div>
        <div>
          <label className="label">Discipline Focus</label>
          <select className="input" value={discipline} onChange={(e) => setDiscipline(e.target.value as Discipline)}>
            <option>Architectural</option><option>Structural</option><option>Electrical</option>
            <option>ACMV</option><option>Plumbing</option><option>Firefighting</option><option>External</option>
          </select>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Accomplishments</h2>
        <textarea className="input" rows={6} value={accomplishments} onChange={(e) => setAccomplishments(e.target.value)} placeholder="Describe today's work progress…" />
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Challenges / Issues</h2>
        <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Site issues, delays, safety notes…" />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Manpower</h2>
          <button className="btn-ghost text-xs" onClick={addRow}>+ Add Trade</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr><th className="p-2 text-left">Trade</th><th className="p-2 text-right w-24">Count</th><th className="p-2 w-12"></th></tr>
          </thead>
          <tbody>
            {manpower.map((m, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2"><input className="input" value={m.trade} onChange={(e) => updateRow(i, "trade", e.target.value)} /></td>
                <td className="p-2 text-right"><input type="number" className="input text-right" value={m.count} onChange={(e) => updateRow(i, "count", Number(e.target.value) || 0)} /></td>
                <td className="p-2"><button onClick={() => removeRow(i)} className="text-rose-600 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-3 bg-blue-50 border-blue-200 text-sm">
        <b>Snapshot at save time:</b> Overall {formatPct(stats.pct)} · Executed {formatBirr(stats.executed)} ETB
      </div>
    </div>
  );
}
