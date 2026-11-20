"use client";
import { useState } from "react";
import { useInspections } from "@/hooks/useStore";
import { DISCIPLINES } from "@/lib/data";
import { Discipline, Inspection, InspectionItem } from "@/lib/types";
import { uid } from "@/lib/calc";

const TEMPLATES: Record<Discipline, string[]> = {
  Architectural: ["Ceiling alignment & finish","Floor level & flatness","Wall paint finish","Door/window alignment"],
  Structural: ["Concrete cover","Steel frame plumb","Weld quality","Connection bolts torque"],
  Electrical: ["Cable routing & support","Panel termination","Earthing continuity","Lighting alignment"],
  ACMV: ["Duct leakage test","Pipe insulation integrity","FCU operation","BMS controls"],
  Plumbing: ["Pressure test","Slope & gradient","Fixture installation","Drainage flow"],
  Firefighting: ["Sprinkler spacing","Hose reel operation","Alarm panel function","Extinguisher placement"],
  External: ["Pavement compaction","Drainage flow","Kerb alignment","Landscape finish"],
};

export default function QualityPage() {
  const { inspections, setInspections, ready } = useInspections();
  const [showForm, setShowForm] = useState(false);
  if (!ready) return <div className="p-8 text-slate-500">Loading…</div>;
  const add = (i:Inspection) => { setInspections(prev=>[i,...prev]); setShowForm(false); };
  const remove = (id:string) => setInspections(prev => prev.filter(i=>i.id!==id));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Discipline Inspection Hub</h1><div className="text-sm text-slate-600">Multi-disciplinary supervision checklists</div></div>
        <button className="btn-primary" onClick={()=>setShowForm(true)}>+ New Inspection</button>
      </div>
      <div className="grid gap-3">
        {inspections.map(i => {
          const passed = i.items.filter(x=>x.passed).length;
          const total = i.items.length;
          const pct = total?Math.round((passed/total)*100):0;
          return (
            <div key={i.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-slate-500">{i.date} · {i.inspector}</div><div className="font-semibold">{i.discipline}</div></div>
                <div className="flex items-center gap-3">
                  <div className={"text-sm font-bold "+(pct===100?"text-emerald-600":pct>=75?"text-amber-600":"text-rose-600")}>{passed}/{total} ({pct}%)</div>
                  <button onClick={()=>remove(i.id)} className="text-xs text-rose-600 hover:underline">Delete</button>
                </div>
              </div>
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                {i.items.map(it => <li key={it.id} className="flex items-center gap-2"><span className={it.passed?"text-emerald-600":"text-rose-600"}>{it.passed?"✓":"✕"}</span><span className={it.passed?"":"text-slate-500"}>{it.label}</span></li>)}
              </ul>
              {i.notes && <div className="mt-2 text-xs text-slate-500 italic">{i.notes}</div>}
            </div>
          );
        })}
        {inspections.length===0 && <div className="card p-6 text-center text-slate-500">No inspections yet. Click “New Inspection”.</div>}
      </div>
      {showForm && <InspectionForm onClose={()=>setShowForm(false)} onSave={add}/>}
    </div>
  );
}

function InspectionForm({onClose,onSave}:{onClose:()=>void;onSave:(i:Inspection)=>void}) {
  const [discipline,setDiscipline] = useState<Discipline>("Architectural");
  const [inspector,setInspector] = useState("");
  const [date,setDate] = useState(new Date().toISOString().slice(0,10));
  const [notes,setNotes] = useState("");
  const [items,setItems] = useState<InspectionItem[]>(TEMPLATES["Architectural"].map(label => ({id:uid("it"),label,passed:false})));
  const changeDiscipline = (d:Discipline) => { setDiscipline(d); setItems(TEMPLATES[d].map(label => ({id:uid("it"),label,passed:false}))); };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="card w-full max-w-lg p-4 space-y-3 my-8">
        <div className="flex items-center justify-between"><h3 className="font-semibold">New Inspection</h3><button onClick={onClose} className="text-slate-500">✕</button></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Discipline</label>
            <select className="input" value={discipline} onChange={e=>changeDiscipline(e.target.value as Discipline)}>{DISCIPLINES.map(d=> <option key={d}>{d}</option>)}</select>
          </div>
          <div><label className="label">Inspector</label><input className="input" value={inspector} onChange={e=>setInspector(e.target.value)} placeholder="Name"/></div>
        </div>
        <div><label className="label">Date</label><input type="date" className="input" value={date} onChange={e=>setDate(e.target.value)}/></div>
        <div>
          <label className="label">Checklist</label>
          <ul className="space-y-1">{items.map(it => (
            <li key={it.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={it.passed} onChange={e=>setItems(prev=>prev.map(x=>x.id===it.id?{...x,passed:e.target.checked}:x))}/>
              {it.label}
            </li>
          ))}</ul>
        </div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={notes} onChange={e=>setNotes(e.target.value)}/></div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={()=>onSave({id:uid("insp"),discipline,date,inspector:inspector||"—",items,notes})}>Save</button>
        </div>
      </div>
    </div>
  );
}