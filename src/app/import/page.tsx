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

// Expected contract totals per package (for verification only)
const EXPECTED: Record<string, number> = {
  p1: 9900000, p2: 11333775.92, p3: 239123163.72, p4: 155119536,
  p5: 15759998.65, p6: 19748183.62, p7: 415403544.80,
  p8: 275204660.39, p9: 38925979.96, p10: 114113122.30,
};

function parseSheet(rows: any[][]): BoqItem[] {
  let headerRowIndex = -1, codeCol = -1, descCol = -1;

  for (let i = 0; i < Math.min(rows.length, 100); i++) {
    const row = rows[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toLowerCase().trim();
      if (cell === "item no" || cell === "item no." || cell === "item" || cell === "item number") {
        for (let k = j + 1; k < Math.min(j + 10, row.length); k++) {
          const desc = String(row[k] || "").toLowerCase().trim();
          if (desc.includes("description")) {
            headerRowIndex = i; codeCol = j; descCol = k;
            break;
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
      const sample = parseNumber(rows[headerRowIndex + 1]?.[j]);
      if (sample > 1000) { contractCol = j; break; }
    }
  }
  if (contractCol === -1) return [];

  // Build items as an ARRAY (preserves duplicates)
  const items: BoqItem[] = [];
  let currentPkg = "p1";

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = String(row[codeCol] || "").trim();
    const desc = String(row[descCol] || "").trim();
    if (!code || !desc) continue;

    // Track current package (letter codes inherit last numeric package)
    const pkgMatch = code.match(/^(\d+)/);
    if (pkgMatch) currentPkg = `p${pkgMatch[1]}`;

    // Skip obvious headers/totals
    if (code.length > 20) continue;
    if (/^(no|total|sub\s*total|grand\s*total|description|item|amount|unit|qty|quantity|remark|remarks)$/i.test(code)) continue;
    const low = desc.toLowerCase();
    if ((low.includes("total") || low.startsWith("sub")) && desc.length < 40 && !/\d/.test(desc)) continue;

    const contractAmt = parseNumber(row[contractCol]);
    if (contractAmt === 0) continue;

    const prev = prevCol >= 0 ? parseNumber(row[prevCol]) : 0;
    const thisPeriod = thisPeriodCol >= 0 ? parseNumber(row[thisPeriodCol]) : 0;
    let toDate = toDateCol >= 0 ? parseNumber(row[toDateCol]) : 0;
    if (toDate === 0) toDate = prev + thisPeriod;

    // Row-indexed ID → each row is unique, no overwrites
    const id = `row${items.length}_${code.replace(/[^A-Za-z0-9]/g, "_")}_${currentPkg}`;

    items.push({
      id,
      packageId: currentPkg,
      code,
      description: desc,
      unit: "LS",
      contractAmount: contractAmt,
      previousExecuted: prev,
      thisPeriodExecuted: Math.max(0, toDate - prev),
    });
  }

  // Leaf filter: drop rows that have children (e.g. parent "7" when "7.1" exists)
  const leaves = items.filter(item => {
    const prefix = item.code + ".";
    return !items.some(other => other !== item && other.code.startsWith(prefix));
  });

  return leaves;
}

export default function ImportPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<BoqItem[]>([]);
  const [sourceSheet, setSourceSheet] = useState("");
  const [error, setError] = useState("");
  const [triedSheets, setTriedSheets] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setPreview([]); setSourceSheet(""); setTriedSheets([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const tried: string[] = [];
        let bestResult: { sheetName: string; items: BoqItem[] } | null = null;

        for (const sheetName of workbook.SheetNames) {
          tried.push(sheetName);
          const ws = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          const items = parseSheet(rows);
          if (items.length > 5) {
            if (!bestResult || items.length > bestResult.items.length) bestResult = { sheetName, items };
          }
        }

        setTriedSheets(tried);
        if (!bestResult) {
          setError(`Tried ${tried.length} sheets (${tried.join(", ")}), but none had a valid BOQ table.`);
        } else {
          setSourceSheet(bestResult.sheetName);
          setPreview(bestResult.items);
        }
      } catch (err) {
        setError("Failed to read file: " + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    setIsImporting(true); setError("");
    try {
      await store.setItems(preview);
      window.location.href = "/";
    } catch (err) {
      setError("Import failed: " + (err as Error).message);
      setIsImporting(false);
    }
  };

  const totalContract = preview.reduce((s, i) => s + i.contractAmount, 0);
  const totalToDate = preview.reduce((s, i) => s + i.previousExecuted + i.thisPeriodExecuted, 0);

  const byPackage: Record<string, { contract: number; executed: number; count: number }> = {};
  preview.forEach(i => {
    if (!byPackage[i.packageId]) byPackage[i.packageId] = { contract: 0, executed: 0, count: 0 };
    byPackage[i.packageId].contract += i.contractAmount;
    byPackage[i.packageId].executed += i.previousExecuted + i.thisPeriodExecuted;
    byPackage[i.packageId].count += 1;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Import BOQ from Excel</h1>
        <p className="text-sm text-slate-600">Scans all sheets. Preserves duplicate codes and letter-coded sub-items.</p>
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
                <h2 className="font-semibold text-slate-900">Preview: {preview.length} items from "{sourceSheet}"</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Total contract: <b>{totalContract.toLocaleString()} ETB</b> · Executed: <b>{totalToDate.toLocaleString()} ETB</b> · Progress: <b>{totalContract ? ((totalToDate / totalContract) * 100).toFixed(1) : 0}%</b>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Scanned: {triedSheets.join(", ")}</p>
              </div>
              <button onClick={confirmImport} disabled={isImporting} className="btn-primary">
                {isImporting ? "Saving..." : `Import All ${preview.length} Items`}
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-3 border-b bg-slate-50">
              <h3 className="font-semibold text-sm">Package verification (compare with Summary Report)</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-2 text-left">Package</th>
                  <th className="p-2 text-right">Items</th>
                  <th className="p-2 text-right">Actual Contract</th>
                  <th className="p-2 text-right">Expected</th>
                  <th className="p-2 text-right">Gap</th>
                </tr>
              </thead>
              <tbody>
                {["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10"].map(pkg => {
                  const s = byPackage[pkg] || { contract: 0, executed: 0, count: 0 };
                  const exp = EXPECTED[pkg] || 0;
                  const gap = exp - s.contract;
                  const ok = Math.abs(gap) < exp * 0.02;
                  return (
                    <tr key={pkg} className="border-t border-slate-100">
                      <td className="p-2">{pkg}</td>
                      <td className="p-2 text-right text-xs text-slate-500">{s.count}</td>
                      <td className="p-2 text-right">{s.contract.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                      <td className="p-2 text-right text-slate-500">{exp.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                      <td className={`p-2 text-right font-medium ${ok ? "text-emerald-600" : "text-rose-600"}`}>
                        {ok ? "✓ OK" : `${gap.toLocaleString(undefined, {maximumFractionDigits: 0})}`}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-right text-xs">{preview.length}</td>
                  <td className="p-2 text-right">{totalContract.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                  <td className="p-2 text-right">1,294,631,965</td>
                  <td className="p-2 text-right">{(1294631965.36 - totalContract).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}