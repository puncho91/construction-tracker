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
