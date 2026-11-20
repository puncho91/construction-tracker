"use client";
import { useState } from "react";
import { useSnags } from "@/hooks/useStore";
import { DISCIPLINES } from "@/lib/data";
import { Discipline, Snag, SnagStatus, SnagType } from "@/lib/types";
import { uid } from "@/lib/calc";

export default function SnagsPage() {
  const { snags, setSnags, ready } = useSnags();
  const [typeFilter, setTypeFilter] = useState<"all"|SnagType>("all");
  const [statusFilter, setStatusFilter] = useState<"all"|SnagStatus>("all");
  const [showForm, setShowForm] = useState(false);
  if (!ready) return <div className="p-8 text-slate-500">Loading…</div>;
  const filtered = snags.filter(s => (typeFilter==="all"||s.type===typeFilter) && (statusFilter==="all"||s.status===statusFilter));
  const counts = { total: snags.length, open: snags.filter(s=>s.status==="Open").length, progress: snags.filter(s=>s.status==="In Progress").length, closed: snags.filter(s=>s.status==="Closed").length };
  const updateStatus = (id:string, status:SnagStatus) => setSnags(prev => prev.map(s => s.id===id?{...s,status}:s));
  const addSnag = (s:Snag) => { setSnags(prev=>[s,...prev]); setShowForm(false); };
  const removeSnag = (id:string) => setSnags(prev => prev.filter(s=>s.id!==id));
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">SI 017 & Snag Tracker</h1><div className="text-sm text-slate-600">Site directives and rectification items</div></div>
        <button className="btn-primary" onClick={()=>setShowForm(true)}>+ New Item</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3"><div className="text-xs text-slate-500">Total</div><div className="text-xl font-bold">{counts.total}</div></div>
        <div className="card p-3 border-rose-200 bg-rose-50"><div className="text-xs text-slate-500">Open</div><div className="text-xl font-bold text-rose-700">{counts.open}</div></div>
        <div className="card p-3 border-amber-200 bg-amber-50"><div className="text-xs text-slate-500">In Progress</div><div className="text-xl font-bold text-amber-700">{counts.progress}</div></div>
        <div className="card p-3 border-emerald-200 bg-emerald-50"><div className="text-xs text-slate-500">Closed</div><div className="text-xl font-bold text-emerald-700">{counts.closed}</div></div>
      </div>
      <div className="card p-3 flex flex-wrap gap-3 items-end">
        <div><label className="label">Type</label>
          <select className="input" value={typeFilter} onChange={e=>setTypeFilter(e.target.value as any)}>
            <option value="all">All</option><option value="SI">SI</option><option value="Snag">Snag</option>
          </select>
        </div>
        <div><label className="label">Status</label>
          <select className="input" value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)}>
            <option value="all">All</option><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Closed">Closed</option>
          </select>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr><th className="p-2 text-left">Type</th><th className="p-2 text-left">Ref</th><th className="p-2 text-left">Discipline</th><th className="p-2 text-left">Description</th><th className="p-2 text-left">Deadline</th><th className="p-2 text-left">Status</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const overdue = s.status !== "Closed" && s.deadline && new Date(s.deadline) < new Date();
                return (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="p-2 text-xs">{s.type}</td>
                    <td className="p-2 text-xs text-slate-500">{s.ref}</td>
                    <td className="p-2 text-xs">{s.discipline}</td>
                    <td className="p-2">{s.description}</td>
                    <td className={"p-2 text-xs "+(overdue?"text-rose-600 font-semibold":"")}>{s.deadline}</td>
                    <td className="p-2">
                      <select className="rounded border border-slate-300 text-xs px-1 py-0.5" value={s.status} onChange={e=>updateStatus(s.id, e.target.value as SnagStatus)}>
                        <option>Open</option><option>In Progress</option><option>Closed</option>
                      </select>
                    </td>
                    <td className="p-2 text-right"><button className="text-xs text-rose-600 hover:underline" onClick={()=>removeSnag(s.id)}>Delete</button></td>
                  </tr>
                );
              })}
              {filtered.length===0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No items match the filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && <SnagForm onClose={()=>setShowForm(false)} onSave={addSnag}/>}
    </div>
  );
}

function SnagForm({onClose,onSave}:{onClose:()=>void;onSave:(s:Snag)=>void}) {
  const [type,setType] = useState<SnagType>("Snag");
  const [ref,setRef] = useState("");
  const [discipline,setDiscipline] = useState<Discipline>("Architectural");
  const [description,setDescription] = useState("");
  const [deadline,setDeadline] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-4 space-y-3">
        <div className="flex items-center justify-between"><h3 className="font-semibold">New SI / Snag</h3><button onClick={onClose} className="text-slate-500">✕</button></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Type</label>
            <select className="input" value={type} onChange={e=>setType(e.target.value as SnagType)}><option value="SI">SI</option><option value="Snag">Snag</option></select>
          </div>
          <div><label className="label">Ref</label><input className="input" value={ref} onChange={e=>setRef(e.target.value)} placeholder="SI-018 / SN-043"/></div>
        </div>
        <div><label className="label">Discipline</label>
          <select className="input" value={discipline} onChange={e=>setDiscipline(e.target.value as Discipline)}>{DISCIPLINES.map(d=> <option key={d}>{d}</option>)}</select>
        </div>
        <div><label className="label">Description</label><textarea className="input" rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></div>
        <div><label className="label">Deadline</label><input type="date" className="input" value={deadline} onChange={e=>setDeadline(e.target.value)}/></div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!description||!deadline} onClick={()=>onSave({id:uid("snag"),type,ref:ref||"—",discipline,description,deadline,status:"Open",createdAt:new Date().toISOString().slice(0,10)})}>Save</button>
        </div>
      </div>
    </div>
  );
}