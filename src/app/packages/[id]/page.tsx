"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SEED_PACKAGES } from "@/lib/data";
import { useItems } from "@/hooks/useStore";
import { BoqItem } from "@/lib/types";
import { formatBirr, formatPct, itemPct, itemToDate, packageStats } from "@/lib/calc";
import ItemRow from "@/components/ItemRow";
import StatCard from "@/components/StatCard";

export default function PackageDetailPage() {
  const params = useParams<{id:string}>();
  const pkg = SEED_PACKAGES.find(p => p.id === params.id);
  const { items, setItems, ready } = useItems();
  const [editing, setEditing] = useState<BoqItem|null>(null);
  const pkgItems = useMemo(() => items.filter(i => i.packageId === params.id), [items, params.id]);

  if (!pkg) return <div className="p-8">Package not found.</div>;
  if (!ready) return <div className="p-8 text-slate-500">Loading…</div>;
  const stats = packageStats(pkg, items);

  const handleSliderChange = (id:string, newPct:number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const target = (newPct/100)*i.contractAmount;
      const newPrev = Math.min(target, i.previousExecuted);
      const newThis = Math.max(0, target - newPrev);
      return { ...i, previousExecuted: newPrev, thisPeriodExecuted: newThis };
    }));
  };
  const handleEditSave = (u: BoqItem) => { setItems(prev => prev.map(i => i.id === u.id ? u : i)); setEditing(null); };

  return (
    <div className="space-y-4">
      <div className="no-print">
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Dashboard</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{pkg.code} · {pkg.name}</h1>
        <div className="text-sm text-slate-500">{pkg.discipline}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Contract" value={formatBirr(stats.contract)+" ETB"} />
        <StatCard label="Executed" value={formatBirr(stats.executed)+" ETB"} tone="good" />
        <StatCard label="Remaining" value={formatBirr(stats.remaining)+" ETB"} />
        <StatCard label="Progress" value={formatPct(stats.pct)} />
      </div>
      <div className="card overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">BOQ Items</h2>
          <div className="text-xs text-slate-500">{pkgItems.length} items · {stats.pendingCount} pending</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-right">Contract</th>
                <th className="p-2 text-right">To Date</th>
                <th className="p-2 text-right">Remaining</th>
                <th className="p-2 text-right">%</th>
                <th className="p-2 text-left">Adjust</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {pkgItems.map(item => <ItemRow key={item.id} item={item} onSliderChange={handleSliderChange} onEdit={setEditing}/>)}
              {pkgItems.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-slate-500">No items yet for this package.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {editing && <EditDialog item={editing} onClose={()=>setEditing(null)} onSave={handleEditSave}/>}
    </div>
  );
}

function EditDialog({item,onClose,onSave}:{item:BoqItem;onClose:()=>void;onSave:(i:BoqItem)=>void}) {
  const [prev,setPrev] = useState(item.previousExecuted.toString());
  const [cur,setCur] = useState(item.thisPeriodExecuted.toString());
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 no-print">
      <div className="card w-full max-w-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Edit item {item.code}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">✕</button>
        </div>
        <div className="text-sm text-slate-600">{item.description}</div>
        <div className="text-xs text-slate-500">Contract: {formatBirr(item.contractAmount)} ETB · Current {itemPct(item).toFixed(1)}% ({formatBirr(itemToDate(item))} ETB)</div>
        <div><label className="label">Previous executed (ETB)</label><input className="input" value={prev} onChange={e=>setPrev(e.target.value)}/></div>
        <div><label className="label">This period executed (ETB)</label><input className="input" value={cur} onChange={e=>setCur(e.target.value)}/></div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={()=>onSave({...item,previousExecuted:Number(prev)||0,thisPeriodExecuted:Number(cur)||0})}>Save</button>
        </div>
      </div>
    </div>
  );
}