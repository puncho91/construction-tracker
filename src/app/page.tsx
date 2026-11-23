"use client";

import Link from "next/link";
import { SEED_PROJECT, SEED_PACKAGES } from "@/lib/data";
import { useItems } from "@/hooks/useStore";
import { formatBirr, formatPct, projectStats } from "@/lib/calc";
import StatCard from "@/components/StatCard";
import PackageCard from "@/components/PackageCard";

export default function DashboardPage() {
  const { items, ready } = useItems();

  if (!ready) return <div className="p-8 text-slate-500">Loading…</div>;

  const ps = projectStats(SEED_PROJECT, items);
  const plannedPct = ps.timeElapsedPct;

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{SEED_PROJECT.name}</h1>
          <div className="mt-1 text-sm text-slate-600">
            Employer: <b>{SEED_PROJECT.employer}</b> · Contractor: <b>{SEED_PROJECT.contractor}</b> · Consultant: <b>{SEED_PROJECT.consultant}</b>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Commenced {SEED_PROJECT.commenceDate} · Original completion {SEED_PROJECT.originalCompletion} · +{SEED_PROJECT.timeExtensionDays} days extension · Revised {ps.revisedCompletion.toISOString().slice(0, 10)} · Reporting {SEED_PROJECT.reportingDate}
          </div>
        </div>
        <Link href="/import" className="btn-primary whitespace-nowrap">+ Import Excel</Link>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Overall Progress" value={formatPct(ps.pct)} sub={"Time elapsed " + formatPct(ps.timeElapsedPct)} tone={ps.scheduleStatus === "Behind" ? "bad" : ps.scheduleStatus === "Ahead" ? "good" : "warn"} />
        <StatCard label="Contract Value" value={formatBirr(ps.contract) + " ETB"} />
        <StatCard label="Executed to Date" value={formatBirr(ps.executed) + " ETB"} tone="good" />
        <StatCard label="Remaining" value={formatBirr(ps.remaining) + " ETB"} sub={ps.daysRemaining + " days remaining"} tone={ps.daysRemaining < 30 ? "bad" : "default"} />
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Schedule Health</h2>
          <span className={`text-sm font-medium ${ps.scheduleStatus === "Ahead" ? "text-emerald-600" : ps.scheduleStatus === "Behind" ? "text-rose-600" : "text-amber-600"}`}>
            {ps.scheduleStatus} ({ps.variance.toFixed(1)} pts)
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-500 text-xs">Progress</div>
            <div className="font-semibold">{formatPct(ps.pct)}</div>
            <div className="mt-1 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${ps.pct}%` }} /></div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">Time elapsed</div>
            <div className="font-semibold">{formatPct(ps.timeElapsedPct)}</div>
            <div className="mt-1 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-slate-600" style={{ width: `${ps.timeElapsedPct}%` }} /></div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Work Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SEED_PACKAGES.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} items={items} plannedPct={plannedPct} />
          ))}
        </div>
      </section>
    </div>
  );
}