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
