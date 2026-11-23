"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import Link from "next/link";
import { BoqItem } from "@/lib/types";
import { useItems } from "@/hooks/useStore";
import { SEED_PACKAGES } from "@/lib/data";

// Helper to clean numbers (remove commas, spaces, ETB, etc.)
const parseNumber = (val: any) => {
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, "").replace(/[^0-9.-]/g, "");
  return Number(cleaned) || 0;
};

export default function ImportPage() {
  const router = useRouter();
  const { setItems } = useItems();
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<BoqItem[]>([]);
  const [error, setError] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPreview([]);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        const importedItems: BoqItem[] = [];
        let isBoqSection = false;

        rows.forEach((row) => {
          // The header row where we find the BOQ columns
          if (row[10]?.trim() === "Item No") {
            isBoqSection = true;
            return;
          }

          if (!isBoqSection) return;

          const code = row[10]?.trim();
          const description = row[11]?.trim();
          const contractAmount = parseNumber(row[14]);
          const previousExecuted = parseNumber(row[15]);
          
          // To Date Executed is usually column 21 (0-indexed)
          // If it's blank, we calculate it from the percentage (column 17) if available
          let toDateExecuted = parseNumber(row[21]);
          if (toDateExecuted === 0 && row[17]) {
             const pct = parseNumber(row[17]);
             toDateExecuted = (pct / 100) * contractAmount;
          }

          // Skip invalid or parent rows
          if (!code || !description || contractAmount === 0) return;
          if (description.toLowerCase().includes("total") || description.toLowerCase().includes("executed value")) return;

          // Determine Package ID from the code (e.g., "1.1.1" -> "p1")
          const packageNum = code.split(".")[0];
          const packageId = `p${packageNum}`;

          // Calculate this period
          const thisPeriod = Math.max(0, toDateExecuted - previousExecuted);

          importedItems.push({
            id: `i${code.replace(/\./g, "_")}`, // Unique ID based on code
            packageId,
            code,
            description,
            unit: "LS", // Default unit
            contractAmount,
            previousExecuted,
            thisPeriodExecuted: thisPeriod,
          });
        });

        if (importedItems.length === 0) {
          setError("Could not find valid BOQ rows. Make sure you upload the correct CSV format.");
        } else {
          setPreview(importedItems);
        }
      },
    });
  };

  const confirmImport = async () => {
    setIsImporting(true);
    try {
      await setItems(() => preview); // Overwrite all items in Supabase
      router.push("/"); // Go back to dashboard
    } catch (err) {
      setError("Failed to save to database. Please try again.");
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Import BOQ from CSV</h1>
          <p className="text-sm text-slate-600">Upload the weekly progress report CSV to instantly update all items.</p>
        </div>
      </div>

      <div className="card p-6">
        <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
        {error && <div className="mt-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{error}</div>}
      </div>

      {preview.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Preview: {preview.length} Items Found</h2>
              <p className="text-xs text-slate-500">Review the first 10 items before saving to the database.</p>
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
                <th className="p-2 text-right">To Date</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 10).map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-2 text-xs text-slate-500">{item.code}</td>
                  <td className="p-2 truncate max-w-xs">{item.description}</td>
                  <td className="p-2 text-right">{item.contractAmount.toLocaleString()}</td>
                  <td className="p-2 text-right">{(item.previousExecuted + item.thisPeriodExecuted).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 10 && <div className="p-2 text-center text-xs text-slate-500 bg-slate-50 border-t">...and {preview.length - 10} more items</div>}
        </div>
      )}
    </div>
  );
}