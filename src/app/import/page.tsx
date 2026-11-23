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

export default function ImportPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<BoqItem[]>([]);
  const [error, setError] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPreview([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        let sheetName = workbook.SheetNames.find((name) =>
          name.toLowerCase().includes("executed")
        );
        if (!sheetName) sheetName = workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const imported: Record<string, BoqItem> = {};
        let isBoqSection = false;

        rows.forEach((row) => {
          if (String(row[10] || "").trim() === "Item No") {
            isBoqSection = true;
            return;
          }
          if (!isBoqSection) return;

          const code = String(row[10] || "").trim();
          const description = String(row[11] || "").trim();

          // CORRECT columns based on your Excel layout
          const contractAmount = parseNumber(row[13]);   // Contract Amount
          const prevPct         = parseNumber(row[14]);  // Previous %
          const thisPct         = parseNumber(row[15]);  // This period %
          const toDatePct       = parseNumber(row[16]);  // To date %
          let toDateAmount      = parseNumber(row[20]);  // To date Amount (if present)

          // Fallbacks if amount column is blank
          if (toDateAmount === 0 && toDatePct > 0) {
            toDateAmount = (toDatePct / 100) * contractAmount;
          }

          const previousExecuted = (prevPct / 100) * contractAmount;
          const thisPeriodExecuted = Math.max(0, toDateAmount - previousExecuted);

          // Skip invalid / parent rows
          if (!code || !description || contractAmount === 0) return;
          const low = description.toLowerCase();
          if (low.includes("total") || low.includes("executed value")) return;
          if (low.startsWith("supply,") && toDateAmount === 0 && contractAmount === 0) return;

          const packageNum = code.split(".")[0];
          const packageId = `p${packageNum}`;
          const id = `i${code.replace(/\./g, "_")}_${packageId}`;

          // Dedupe by id (keep the last occurrence)
          imported[id] = {
            id,
            packageId,
            code,
            description,
            unit: "LS",
            contractAmount,
            previousExecuted,
            thisPeriodExecuted,
          };
        });

        const list = Object.values(imported);

        if (list.length === 0) {
          setError(`Found sheet "${sheetName}", but no valid BOQ rows. Check that column K has "Item No" and column N has amounts.`);
        } else {
          setPreview(list);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to read the Excel file. Please make sure it is a valid .xlsx file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    setIsImporting(true);
    setError("");
    try {
      // Save directly via store (properly awaited)
      await store.setItems(preview);
      // Force full reload so dashboard fetches fresh data
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setError("Import failed: " + (err as Error).message);
      setIsImporting(false);
    }
  };

  const totalContract = preview.reduce((s, i) => s + i.contractAmount, 0);
  const totalToDate = preview.reduce((s, i) => s + i.previousExecuted + i.thisPeriodExecuted, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Import BOQ from Excel</h1>
        <p className="text-sm text-slate-600">Upload the Weekly Progress Report (.xlsx). The app finds the correct sheet and column automatically.</p>
      </div>

      <div className="card p-6">
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
        {error && <div className="mt-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{error}</div>}
      </div>

      {preview.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Preview: {preview.length} Items Found</h2>
              <p className="text-xs text-slate-500">
                Total contract: <b>{totalContract.toLocaleString()} ETB</b> · Executed: <b>{totalToDate.toLocaleString()} ETB</b> · Progress: <b>{totalContract ? ((totalToDate / totalContract) * 100).toFixed(1) : 0}%</b>
              </p>
            </div>
            <button onClick={confirmImport} disabled={isImporting} className="btn-primary">
              {isImporting ? "Saving to Database..." : `Import All ${preview.length} Items`}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-right">Contract</th>
                <th className="p-2 text-right">Executed</th>
                <th className="p-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 10).map((item) => {
                const exec = item.previousExecuted + item.thisPeriodExecuted;
                return (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="p-2 text-xs text-slate-500">{item.code}</td>
                    <td className="p-2 truncate max-w-xs">{item.description}</td>
                    <td className="p-2 text-right">{item.contractAmount.toLocaleString()}</td>
                    <td className="p-2 text-right">{exec.toLocaleString()}</td>
                    <td className="p-2 text-right">{item.contractAmount ? ((exec / item.contractAmount) * 100).toFixed(1) : 0}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {preview.length > 10 && <div className="p-2 text-center text-xs text-slate-500 bg-slate-50 border-t">...and {preview.length - 10} more items</div>}
        </div>
      )}
    </div>
  );
}