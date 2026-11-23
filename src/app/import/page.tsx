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

  // Build raw items
  const items: Record<string, BoqItem> = {};
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = String(row[codeCol] || "").trim();
    const desc = String(row[descCol] || "").trim();
    if (!code || !desc) continue;
    if (!/^\d+(\.\d+)*$/.test(code)) continue;

    const contractAmt = parseNumber(row[contractCol]);
    if (contractAmt === 0) continue;

    const prev = prevCol >= 0 ? parseNumber(row[prevCol]) : 0;
    const thisPeriod = thisPeriodCol >= 0 ? parseNumber(row[thisPeriodCol]) : 0;
    let toDate = toDateCol >= 0 ? parseNumber(row[toDateCol]) : 0;
    if (toDate === 0) toDate = prev + thisPeriod;

    const packageNum = code.split(".")[0];
    const id = `i${code.replace(/\./g, "_")}_p${packageNum}`;

    items[id] = {
      id,
      packageId: `p${packageNum}`,
      code,
      description: desc,
      unit: "LS",
      contractAmount: contractAmt,
      previousExecuted: prev,
      thisPeriodExecuted: Math.max(0, toDate - prev),
    };
  }

  // *** KEY FIX: Keep only leaf items ***
  const allCodes = Object.values(items).map(i => i.code);
  const leafItems = Object.values(items).filter(item => {
    const prefix = item.code + ".";
    return !allCodes.some(c => c !== item.code && c.startsWith(prefix));
  });

  return leafItems;
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

  // Group by package for verification
  const byPackage: Record<string, { contract: number; executed: number }> = {};
  preview.forEach(i => {
    if (!byPackage[i.packageId]) byPackage[i.packageId] = { contract: 0, executed: 0 };
    byPackage[i.packageId].contract += i.contractAmount;
    byPackage[i.packageId].executed += i.previousExecuted + i.thisPeriodExecuted;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Import BOQ from Excel</h1>
        <p className="text-sm text-slate-600">Scans all sheets, auto-detects BOQ, keeps only leaf items (no parent double-counting).</p>
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
                <h2 className="font-semibold text-slate-900">Preview: {preview.length} leaf items from "{sourceSheet}"</h2>
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
              <h3 className="font-semibold text-sm">Package totals (verify these look right)</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr><th className="p-2 text-left">Package</th><th className="p-2 text-right">Contract</th><th className="p-2 text-right">Executed</th><th className="p-2 text-right">%</th></tr>
              </thead>
              <tbody>
                {Object.entries(byPackage).sort().map(([pkg, s]) => (
                  <tr key={pkg} className="border-t border-slate-100">
                    <td className="p-2">{pkg}</td>
                    <td className="p-2 text-right">{s.contract.toLocaleString()}</td>
                    <td className="p-2 text-right">{s.executed.toLocaleString()}</td>
                    <td className="p-2 text-right">{s.contract ? ((s.executed / s.contract) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}