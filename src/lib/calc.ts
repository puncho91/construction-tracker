import { BoqItem, Package, Project } from "./types";
export function itemToDate(i:BoqItem){return i.previousExecuted+i.thisPeriodExecuted}
export function itemPct(i:BoqItem){return i.contractAmount?Math.min(100,(itemToDate(i)/i.contractAmount)*100):0}
export function itemRemaining(i:BoqItem){return Math.max(0,i.contractAmount-itemToDate(i))}
export interface PackageStats{contract:number;executed:number;remaining:number;pct:number;itemCount:number;pendingCount:number}
export function packageStats(pkg:Package,items:BoqItem[]):PackageStats{
  const list=items.filter(i=>i.packageId===pkg.id);
  const contract=list.reduce((s,i)=>s+i.contractAmount,0);
  const executed=list.reduce((s,i)=>s+itemToDate(i),0);
  return{contract,executed,remaining:Math.max(0,contract-executed),pct:contract?(executed/contract)*100:0,itemCount:list.length,pendingCount:list.filter(i=>itemPct(i)<100).length};
}
export interface ProjectStats{contract:number;executed:number;remaining:number;pct:number;timeElapsedPct:number;revisedCompletion:Date;daysRemaining:number;scheduleStatus:"Ahead"|"On Track"|"Behind";variance:number}
export function projectStats(project:Project,items:BoqItem[],asOf?:Date):ProjectStats{
  const contract=items.reduce((s,i)=>s+i.contractAmount,0);
  const executed=items.reduce((s,i)=>s+itemToDate(i),0);
  const pct=contract?(executed/contract)*100:0;
  const start=new Date(project.commenceDate);
  const originalEnd=new Date(project.originalCompletion);
  const revised=new Date(originalEnd);revised.setDate(revised.getDate()+project.timeExtensionDays);
  const now=asOf??new Date(project.reportingDate);
  const totalMs=revised.getTime()-start.getTime();
  const elapsedMs=now.getTime()-start.getTime();
  const timeElapsedPct=Math.max(0,Math.min(100,(elapsedMs/totalMs)*100));
  const daysRemaining=Math.round((revised.getTime()-now.getTime())/86400000);
  const variance=pct-timeElapsedPct;
  const scheduleStatus=variance>2?"Ahead":variance<-2?"Behind":"On Track";
  return{contract,executed,remaining:Math.max(0,contract-executed),pct,timeElapsedPct,revisedCompletion:revised,daysRemaining,scheduleStatus,variance};
}
export function formatBirr(n:number){return new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n)}
export function formatPct(n:number,d=1){return n.toFixed(d)+"%"}
export function uid(p="id"){return p+"_"+Math.random().toString(36).slice(2,9)}