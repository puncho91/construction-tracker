"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useDaily } from "@/hooks/useStore";
import { Discipline, Manpower } from "@/lib/types";

export default function EditDailyPage() {
  const router = useRouter();
  const params = useParams<{ date: string }>();
  const { reports, setReports, ready } = useDaily();
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState("");
  const [weather, setWeather] = useState("");
  const [discipline, setDiscipline] = useState<Discipline>("Architectural");
  const [accomplishments, setAccomplishments] = useState("");
  const [notes, setNotes] = useState("");
  const [manpower, setManpower] = useState<Manpower[]>([]);
  const [id, setId] = useState("");

  useEffect(() => {
    if (!ready) return;
    const r = reports.find((x) => x.date === params.date);
    if (!r) { setLoaded(true); return; }
    setId(r.id); setDate(r.date); setWeather(r.weather);
    setDiscipline(r.disciplineFocus);
    setAccomplishments(r.accomplishments); setNotes(r.notes);
    setManpower(r.manpower.length ? r.manpower : [{ trade: "Project Manager", count: 1 }]);
    setLoaded(true);
  }, [ready, reports, params.date]);

  const addRow = () => setManpower([...manpower, { trade: "", count: 0 }]);
  const removeRow = (i: number) => setManpower(manpower.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof Manpower, value: string | number) =>
    setManpower(manpower.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  const save = () => {
    if (!accomplishments.trim()) { alert("Please fill in Accomplishments"); return; }
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, date, weather, disciplineFocus: discipline, accomplishments, notes, manpower: manpower.filter((m) => m.trade.trim()) } : r));
    router.push("/daily/" + date);
  };

  if (!loaded) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!id) return <div className="p-8">No report for {params.date}. <Link href="/daily" className="text-brand-600 hover:underline">Back</Link></div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href={"/daily/" + params.date} className="text-sm text-brand-600 hover:underline">← Back to report</Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Edit Daily Report</h1>
        </div>
        <div className="flex gap-2">
          <Link href={"/daily/" + params.date} className="btn-ghost">Cancel</Link>
          <button className="btn-primary" onClick={save}>Save Changes</button>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><label className="label">Date</label><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="label">Weather</label><input className="input" value={weather} onChange={(e) => setWeather(e.target.value)} /></div>
        <div>
          <label className="label">Discipline Focus</label>
          <select className="input" value={discipline} onChange={(e) => setDiscipline(e.target.value as Discipline)}>
            <option>Architectural</option><option>Structural</option><option>Electrical</option>
            <option>ACMV</option><option>Plumbing</option><option>Firefighting</option><option>External</option>
          </select>
        </div>
      </div>

      <div className="card p-4"><h2 className="font-semibold mb-2">Accomplishments</h2><textarea className="input" rows={6} value={accomplishments} onChange={(e) => setAccomplishments(e.target.value)} /></div>
      <div className="card p-4"><h2 className="font-semibold mb-2">Challenges / Issues</h2><textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2"><h2 className="font-semibold">Manpower</h2><button className="btn-ghost text-xs" onClick={addRow}>+ Add Trade</button></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-2 text-left">Trade</th><th className="p-2 text-right w-24">Count</th><th className="p-2 w-12"></th></tr></thead>
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
    </div>
  );
}
