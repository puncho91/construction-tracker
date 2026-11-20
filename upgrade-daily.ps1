New-Item -ItemType Directory -Force -Path "src\app\daily\new" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\daily\[date]\edit" | Out-Null

@'
"use client";
import Link from "next/link";
import { useDaily } from "@/hooks/useStore";
import { formatBirr, formatPct } from "@/lib/calc";

export default function DailyListPage() {
  const { reports, setReports, ready } = useDaily();
  if (!ready) return <div className="p-8 text-slate-500">Loading…</div>;
  const sorted = [...reports].sort((a, b) => b.date.localeCompare(a.date));
  const remove = (id: string) => {
    if (!confirm("Delete this report?")) return;
    setReports((prev) => prev.filter((r) => r.id !== id));
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Site Reports</h1>
          <div className="text-sm text-slate-600">Date-based progress & transmittals</div>
        </div>
        <Link href="/daily/new" className="btn-primary">+ New Report</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Discipline</th>
              <th className="p-2 text-left">Weather</th>
              <th className="p-2 text-right">Overall %</th>
              <th className="p-2 text-right">Executed</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-2">
                  <Link href={"/daily/" + r.date} className="text-brand-600 hover:underline">{r.date}</Link>
                </td>
                <td className="p-2 text-xs">{r.disciplineFocus}</td>
                <td className="p-2 text-xs">{r.weather}</td>
                <td className="p-2 text-right">{formatPct(r.snapshotOverallPct)}</td>
                <td className="p-2 text-right">{formatBirr(r.snapshotExecuted)}</td>
                <td className="p-2 text-right space-x-3">
                  <Link href={"/daily/" + r.date + "/edit"} className="text-xs text-brand-600 hover:underline">Edit</Link>
                  <button onClick={() => remove(r.id)} className="text-xs text-rose-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">No daily reports yet. Click "+ New Report".</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
'@ | Out-File -FilePath "src\app\daily\page.tsx" -Encoding utf8

@'
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
'@ | Out-File -FilePath "src\app\daily\new\page.tsx" -Encoding utf8

@'
"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDaily } from "@/hooks/useStore";
import { SEED_PROJECT } from "@/lib/data";
import { formatBirr, formatPct } from "@/lib/calc";

export default function DailyReportPage() {
  const params = useParams<{ date: string }>();
  const { reports, setReports, ready } = useDaily();
  if (!ready) return <div className="p-8 text-slate-500">Loading…</div>;
  const report = reports.find((r) => r.date === params.date);
  if (!report) return <div className="p-8">No report for {params.date}.</div>;

  const del = () => {
    if (!confirm("Delete this report?")) return;
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    window.location.href = "/daily";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <Link href="/daily" className="text-sm text-brand-600 hover:underline">← All reports</Link>
        <div className="flex gap-2">
          <Link href={"/daily/" + report.date + "/edit"} className="btn-ghost">Edit</Link>
          <button className="btn-ghost text-rose-600" onClick={del}>Delete</button>
          <button className="btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>

      <article className="card p-8 space-y-5 print:shadow-none">
        <header className="border-b-2 border-slate-800 pb-3">
          <div className="text-xs uppercase tracking-widest text-slate-500">Daily Site Progress Report</div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{SEED_PROJECT.name}</h1>
          <div className="text-sm text-slate-700 mt-1">
            <div><b>Employer:</b> {SEED_PROJECT.employer}</div>
            <div><b>Contractor:</b> {SEED_PROJECT.contractor}</div>
            <div><b>Consultant:</b> {SEED_PROJECT.consultant}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><b>Report Date:</b> {report.date}</div>
            <div><b>Weather:</b> {report.weather}</div>
            <div><b>Discipline Focus:</b> {report.disciplineFocus}</div>
            <div><b>Generated:</b> {new Date().toISOString().slice(0, 10)}</div>
          </div>
        </header>

        <section>
          <h2 className="font-semibold text-slate-900 mb-2 uppercase text-sm">Valuation Snapshot</h2>
          <table className="w-full text-sm border">
            <tbody>
              <tr className="border-b"><td className="p-2 bg-slate-50 w-1/2">Overall Progress</td><td className="p-2 font-semibold">{formatPct(report.snapshotOverallPct)}</td></tr>
              <tr><td className="p-2 bg-slate-50">Executed to Date</td><td className="p-2 font-semibold">{formatBirr(report.snapshotExecuted)} ETB</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="font-semibold text-slate-900 mb-2 uppercase text-sm">Accomplishments</h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{report.accomplishments}</p>
        </section>

        {report.notes && (
          <section>
            <h2 className="font-semibold text-slate-900 mb-2 uppercase text-sm">Challenges / Issues</h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{report.notes}</p>
          </section>
        )}

        <section>
          <h2 className="font-semibold text-slate-900 mb-2 uppercase text-sm">Manpower on Site</h2>
          <table className="w-full text-sm border">
            <thead className="bg-slate-50"><tr><th className="p-2 text-left border-b">Trade</th><th className="p-2 text-right border-b w-24">Count</th></tr></thead>
            <tbody>
              {report.manpower.map((m, i) => <tr key={i} className="border-t"><td className="p-2">{m.trade}</td><td className="p-2 text-right">{m.count}</td></tr>)}
              {report.manpower.length === 0 && <tr><td colSpan={2} className="p-2 text-center text-slate-500">— none recorded —</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="grid grid-cols-3 gap-4 pt-8 mt-8 border-t border-slate-300">
          <div><div className="text-xs text-slate-500 mb-8">Prepared by</div><div className="border-t border-slate-800 pt-1 text-xs text-center">Contractor</div></div>
          <div><div className="text-xs text-slate-500 mb-8">Reviewed by</div><div className="border-t border-slate-800 pt-1 text-xs text-center">Consultant</div></div>
          <div><div className="text-xs text-slate-500 mb-8">Approved by</div><div className="border-t border-slate-800 pt-1 text-xs text-center">Employer</div></div>
        </section>
      </article>
    </div>
  );
}
'@ | Out-File -FilePath "src\app\daily\[date]\page.tsx" -Encoding utf8

@'
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
'@ | Out-File -FilePath "src\app\daily\[date]\edit\page.tsx" -Encoding utf8

Write-Host ""
Write-Host "Daily module upgraded successfully!" -ForegroundColor Green
Write-Host "Restart dev server (Ctrl+C, then npm run dev), then Ctrl+Shift+R in browser." -ForegroundColor Cyan