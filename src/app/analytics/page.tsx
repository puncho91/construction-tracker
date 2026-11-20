"use client";
import { useItems } from "@/hooks/useStore";
import { SEED_PACKAGES } from "@/lib/data";
import { packageStats, formatPct } from "@/lib/calc";
import { BarChart, DoughnutChart } from "@/components/Chart";

export default function AnalyticsPage() {
  const { items, ready } = useItems();
  if (!ready) return <div className="p-8 text-slate-500">Loading…</div>;
  const stats = SEED_PACKAGES.map(p => ({ pkg:p, ...packageStats(p, items) }));
  const doughnut = { labels: stats.map(s => s.pkg.code+" "+s.pkg.name), values: stats.map(s => s.contract) };
  const bar = { labels: stats.map(s => s.pkg.code+" "+s.pkg.name), values: stats.map(s => Number(s.pct.toFixed(1))) };
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Analytics</h1><div className="text-sm text-slate-600">Financial weight & progress distributions</div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4"><h2 className="font-semibold mb-2">Contract value by package</h2><div className="h-80"><DoughnutChart data={doughnut}/></div></div>
        <div className="card p-4"><h2 className="font-semibold mb-2">Progress % by package</h2><div className="h-80"><BarChart data={bar}/></div></div>
      </div>
      <div className="card p-4">
        <h2 className="font-semibold mb-2">Package summary</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-2 text-left">Package</th><th className="p-2 text-right">Contract</th><th className="p-2 text-right">Executed</th><th className="p-2 text-right">Progress</th></tr></thead>
          <tbody>{stats.map(s => (
            <tr key={s.pkg.id} className="border-t border-slate-100">
              <td className="p-2">{s.pkg.code} · {s.pkg.name}</td>
              <td className="p-2 text-right">{s.contract.toLocaleString()}</td>
              <td className="p-2 text-right">{s.executed.toLocaleString()}</td>
              <td className="p-2 text-right font-medium">{formatPct(s.pct)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}