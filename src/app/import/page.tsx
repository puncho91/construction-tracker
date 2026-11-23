"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { BoqItem } from "@/lib/types";
import { store } from "@/lib/store";

const parseNumber = (val: any) => {
  if (val === undefined || val === null) return 0;
  const cleaned = String(val).replace(/,/g, "").replace(/[^0-9.-]/g, "");
  return Number(cleaned) || 0;
};

const EXPECTED: Record<string, number> = {
  p1: 9900000, p2: 11333775.92, p3: 239123163.72, p4: 155119536,
  p5: 15759998.65, p6: 19748183.62, p7: 415403544.80,
  p8: 275204660.39, p9: 38925979.96, p10: 114113122.30,
};

const PACKAGE_PATTERN = /works?|fee|fence|tower|perimeter/i;
function detectPackageHeader(code: string, desc: string): string | null {
  if (!/^\d{1,2}$/.test(code)) return null;
  const num = parseInt(code, 10);
  if (num < 1 || num > 10) return null;
  if (desc.length > 80) return null;
  if (!PACKAGE_PATTERN.test(desc)) return null;
  return `p${num}`;
}

function parseSheet(rows: any[][]): BoqItem[] {
  let headerRowIndex = -1, codeCol = -1, descCol = -1;
  for (let i = 0; i < Math.min(rows.length, 100); i++) {
    const row = rows[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toLowerCase().trim();
      if (cell === "item no" || cell === "item no." || cell === "item" || cell === "item number") {
        for (let k = j + 1; k < Math.min(j + 10, row.length); k++) {
          if (String(row[k] || "").toLowerCase().includes("description")) {
            headerRowIndex = i; codeCol = j; descCol = k; break;
          }
        }
        if (headerRowIndex !== -1) break;
      }
    }
    if (headerRowIndex !== -1) break;
  }
  if (headerRowIndex === -1) return [];

  const headerRows = [rows[headerRowIndex], rows[headerRowIndex + 1], rows[headerRowIndex + 2]].filter(Boolean);
  let contractCol = -1, prevCol = -1, thisPeriodCol = -1, toDateCol = -1;
  for (let j = descCol + 1; j < rows[headerRowIndex].length; j++) {
    const combined = headerRows.map(r => String(r?.[j] || "")).join(" ").toLowerCase();
    if (contractCol === -1 && /(contract\s*(amount|value|price|sum))|(unit\s*rate)|(^|\s)rate(\s|$)/.test(combined) && !/previous|cumulative|to\s*date|this\s*period|%/.test(combined)) contractCol = j;
    if (prevCol === -1 && /previous\s*(exec|amount|value|pay|cum|work)|previously\s*exec/.test(combined)) prevCol = j;
    if (thisPeriodCol === -1 && /this\s*(period|month)|current\s*(amount|period|value)/.test(combined)) thisPeriodCol = j;
    if (toDateCol === -1 && /(to\s*date|cumulative|total\s*(exec|amount|work))|(executed\s*amount)/.test(combined) && !/previous|%|percent/.test(combined)) toDateCol = j;
  }
  if (contractCol === -1) {
    for (let j = descCol + 1; j < rows[headerRowIndex].length; j++) {
      if (parseNumber(rows[headerRowIndex + 1]?.[j]) > 1000) { contractCol = j; break; }
    }
  }
  if (contractCol === -1) return [];

  const items: BoqItem[] = [];
  let currentPkg = "p1";
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = String(row[codeCol] || "").trim();
    const desc = String(row[descCol] || "").trim();
    if (!code || !desc) continue;
    const headerPkg = detectPackageHeader(code, desc);
    if (headerPkg) { currentPkg = headerPkg; continue; }
    const contractAmt = parseNumber(row[contractCol]);
    if (contractAmt === 0) continue;
    const low = desc.toLowerCase();
    if ((low.includes("total") || low.startsWith("sub")) && desc.length < 40 && !/\d/.test(desc)) continue;
    const prev = prevCol >= 0 ? parseNumber(row[prevCol]) : 0;
    const thisPeriod = thisPeriodCol >= 0 ? parseNumber(row[thisPeriodCol]) : 0;
    let toDate = toDateCol >= 0 ? parseNumber(row[toDateCol]) : 0;
    if (toDate === 0) toDate = prev + thisPeriod;
    items.push({
      id: `row${items.length}_${code.replace(/[^A-Za-z0-9]/g, "_")}_${currentPkg}`,
      packageId: currentPkg, code, description: desc, unit: "LS",
      contractAmount: contractAmt,
      previousExecuted: prev,
      thisPeriodExecuted: Math.max(0, toDate - prev),
    });
  }
  return items.filter(item => {
    const prefix = item.code + ".";
    return !items.some(o => o !== item && o.packageId === item.packageId && o.code.startsWith(prefix));
  });
}

export default function ImportPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<BoqItem[]>([]);
  const [sourceSheet, setSourceSheet] = useState("");
  const [error, setError] = useState("");
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setPreview([]); setSourceSheet(""); setOverrides({});
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        let best: { sheetName: string; items: BoqItem[] } | null = null;
        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          const items = parseSheet(rows);
          if (items.length > 5 && (!best || items.length > best.items.length)) best = { sheetName, items };
        }
        if (!best) {
          setError("No valid BOQ table found in any sheet.");
        } else {
          setSourceSheet(best.sheetName);
          setPreview(best.items);

          // *** AUTO-FILL overrides for packages that are >5% off (or missing) ***
          const autoOverrides: Record<string, number> = {};
          for (const pkg of Object.keys(EXPECTED)) {
            const parsed = best.items.filter(i => i.packageId === pkg).reduce((s, i) => s + i.contractAmount, 0);
            const exp = EXPECTED[pkg];
            const diffPct = parsed === 0 ? 1 : Math.abs(parsed - exp) / exp;
            if (parsed === 0 || diffPct > 0.05) {
              autoOverrides[pkg] = exp;
            }
          }
          setOverrides(autoOverrides);
        }
      } catch (err) { setError("Failed: " + (err as Error).message); }
    };
    reader.readAsArrayBuffer(file);
  };

  const setOverride = (pkg: string, val: string) => {
    const n = parseNumber(val);
    setOverrides(prev => ({ ...prev, [pkg]: n }));
  };

  const finalItems = (() => {
    let result = preview;
    for (const [pkg, target] of Object.entries(overrides)) {
      if (!target || target <= 0) continue;
      const pkgItems = result.filter(i => i.packageId === pkg);
      const current = pkgItems.reduce((s, i) => s + i.contractAmount, 0);
      if (current === 0) {
        result = [...result, {
          id: `manual_${pkg}`, packageId: pkg,
          code: `${pkg.replace("p","")}.1`,
          description: "Manual entry (not found in file)",
          unit: "LS", contractAmount: target,
          previousExecuted: target, thisPeriodExecuted: 0,
        }];
      } else {
        const scale = target / current;
        result = result.map(i => i.packageId === pkg
          ? { ...i,
              contractAmount: +(i.contractAmount * scale).toFixed(2),
              previousExecuted: +(i.previousExecuted * scale).toFixed(2),
              thisPeriodExecuted: +(i.thisPeriodExecuted * scale).toFixed(2),
            }
          : i
        );
      }
    }
    return result;
  })();

  const confirmImport = async () => {
    setIsImporting(true); setError("");
    try {
      await store.setItems(finalItems);
      window.location.href = "/";
    } catch (err) { setError("Save failed: " + (err as Error).message); setIsImporting(false); }
  };

  const byPackage: Record<string, { contract: number; count: number }> = {};
  preview.forEach(i => {
    if (!byPackage[i.packageId]) byPackage[i.packageId] = { contract: 0, count: 0 };
    byPackage[i.packageId].contract += i.contractAmount;
    byPackage[i.packageId].count += 1;
  });

  const finalTotal = finalItems.reduce((s, i) => s + i.contractAmount, 0);
  const finalExecuted = finalItems.reduce((s, i) => s + i.previousExecuted + i.thisPeriodExecuted, 0);
  const finalPct = finalTotal ? (finalExecuted / finalTotal) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Import BOQ from Excel</h1>
      </div>

      <div className="card p-6">
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
        {error && <div className="mt-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{error}</div>}
      </div>

      {preview.length > 0 && (
        <>
          <div className="card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">{preview.length} items from "{sourceSheet}"</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Final total: <b>{finalTotal.toLocaleString(undefined, {maximumFractionDigits: 0})} ETB</b> ·
                  Executed: <b>{finalExecuted.toLocaleString(undefined, {maximumFractionDigits: 0})} ETB</b> ·
                  Progress: <b>{finalPct.toFixed(1)}%</b>
                </p>
              </div>
              <button onClick={confirmImport} disabled={isImporting} className="btn-primary">
                {isImporting ? "Saving..." : `Import ${finalItems.length} Items`}
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-3 border-b bg-blue-50">
              <p className="text-xs text-blue-900">
                <b>Override column is pre-filled</b> for packages that were off by &gt;5%. Only correct ones stay blank (using parsed values).
              </p>
              <div className="mt-2 flex gap-2 text-xs">
                <button onClick={() => setOverrides({ ...EXPECTED })} className="underline text-blue-700">Force all to expected</button>
                <button onClick={() => setOverrides({})} className="underline text-blue-700">Use parsed values only</button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-2 text-left">Package</th>
                  <th className="p-2 text-right">Items</th>
                  <th className="p-2 text-right">Parsed</th>
                  <th className="p-2 text-right">Expected</th>
                  <th className="p-2 text-right">Override</th>
                </tr>
              </thead>
              <tbody>
                {["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10"].map(pkg => {
                  const s = byPackage[pkg] || { contract: 0, count: 0 };
                  const exp = EXPECTED[pkg];
                  const ok = Math.abs(exp - s.contract) < exp * 0.05;
                  const isOverridden = overrides[pkg] !== undefined && overrides[pkg] > 0;
                  return (
                    <tr key={pkg} className="border-t border-slate-100">
                      <td className="p-2 font-medium">{pkg}</td>
                      <td className="p-2 text-right text-xs text-slate-500">{s.count}</td>
                      <td className={`p-2 text-right ${ok ? "text-emerald-600" : "text-rose-600"}`}>
                        {s.contract.toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </td>
                      <td className="p-2 text-right text-slate-500">
                        {exp.toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="text"
                          className={`w-36 rounded border px-2 py-1 text-right text-xs ${isOverridden ? "border-brand-500 bg-brand-50 font-medium" : "border-slate-300"}`}
                          value={overrides[pkg] || ""}
                          onChange={(e) => setOverride(pkg, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}