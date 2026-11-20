"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { SEED_PACKAGES } from "@/lib/data";
import { useItems } from "@/hooks/useStore";
import { formatBirr, itemPct, itemRemaining, itemToDate } from "@/lib/calc";

export default function RemainingPage() {
  const { items, ready } = useItems();
  const [pkgFilter, setPkgFilter] = useState("all");
  const [minValue, setMinValue] = useState("0");
  const pending = useMemo(() => {
    const min = Number(minValue) || 0;
    return items.filter(i => itemPct(i) < 100).filter(i => pkgFilter === "all" || i.packageId === pkgFilter).filter(i => itemRemaining(i) >= min).sort((a,b) => itemRemaining(b) - itemRemaining(a));
  }, [items, pkgFilter, minValue]);
  if (!ready) return <div className="p-8 text-slate-500">Loading…</div>;
  const totalRemaining = pending.reduce((s,i) => s + itemRemaining(i), 0);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Remaining Works</h1>
        <div className="text-sm text-slate-600">Pending items & financial exposure</div>
      </div>
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div><label className="label">Package</label>
          <select className="input" value={pkgFilter} onChange={e=>setPkgFilter(e.target.value)}>
            <option value="all">All packages</option>
            {SEED_PACKAGES.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </select>
        </div>
        <div><label className="label">Min remaining (ETB)</label><input className="input" value={minValue} onChange={e=>setMinValue(e.target.value)} placeholder="0"/></div>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Total exposure</div>
          <div className="text-xl font-bold text-rose-600">{formatBirr(totalRemaining)} ETB</div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr><th className="p-2 text-left">Package</th><th className="p-2 text-left">Code</th><th className="p-2 text-left">Description</th><th className="p-2 text-right">Contract</th><th className="p-2 text-right">Executed</th><th className="p-2 text-right">Remaining</th><th className="p-2 text-right">%</th></tr>
            </thead>
            <tbody>
              {pending.map(item => {
                const pkg = SEED_PACKAGES.find(p => p.id === item.packageId);
                return (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-2 text-xs"><Link href={"/packages/"+item.packageId} className="text-brand-600 hover:underline">{pkg?.code} {pkg?.name}</Link></td>
                    <td className="p-2 text-xs text-slate-500">{item.code}</td>
                    <td className="p-2">{item.description}</td>
                    <td className="p-2 text-right">{formatBirr(item.contractAmount)}</td>
                    <td className="p-2 text-right">{formatBirr(itemToDate(item))}</td>
                    <td className="p-2 text-right text-rose-600 font-medium">{formatBirr(itemRemaining(item))}</td>
                    <td className="p-2 text-right">{itemPct(item).toFixed(1)}%</td>
                  </tr>
                );
              })}
              {pending.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">All items completed — nothing remaining.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}