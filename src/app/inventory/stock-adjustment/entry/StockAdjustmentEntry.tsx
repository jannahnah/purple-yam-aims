"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adjustStockBatch } from "@/app/actions/inventory";
import { formatItemLabel } from "@/lib/item-label";

type Item = { id: string; name: string; size?: "SMALL" | "ROUND" | "MEDIUM" | "LARGE" | null; unit: string };
type Stock = { itemId: string; quantity: number };
type Entry = { key: string; itemId: string; type: "ADJUSTMENT" | "STOCK_RECEIPT"; quantity: string };

function fmt(value: number) { return Number(value.toFixed(2)).toLocaleString(); }

export default function StockAdjustmentEntry({ branchId, branchName, items, stocks }: {
  branchId: string; branchName: string; items: Item[]; stocks: Stock[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([{ key: "row-1", itemId: "", type: "ADJUSTMENT", quantity: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const stockMap = useMemo(() => new Map(stocks.map((stock) => [stock.itemId, stock.quantity])), [stocks]);
  const selectedIds = entries.map((entry) => entry.itemId).filter(Boolean);

  function updateEntry(key: string, patch: Partial<Entry>) {
    setEntries((current) => current.map((entry) => {
      if (entry.key !== key) return entry;
      const next = { ...entry, ...patch };
      if (patch.itemId !== undefined) {
        const currentQuantity = stockMap.get(patch.itemId) ?? 0;
        next.quantity = next.type === "ADJUSTMENT" ? String(currentQuantity) : "0";
      }
      if (patch.type !== undefined) {
        next.quantity = patch.type === "ADJUSTMENT" ? String(stockMap.get(next.itemId) ?? 0) : "0";
      }
      return next;
    }));
  }

  function changeQuantity(entry: Entry, amount: number) {
    const value = Number(entry.quantity || 0);
    const next = Math.max(0, Math.round((value + amount) * 100) / 100);
    updateEntry(entry.key, { quantity: String(next) });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const filled = entries.filter((entry) => entry.itemId);
    if (!filled.length) { setError("Select at least one inventory item."); return; }
    if (filled.length !== entries.length) { setError("Choose an item for every row or remove the empty row."); return; }
    if (new Set(filled.map((entry) => entry.itemId)).size !== filled.length) { setError("Each item can only be selected once in a batch."); return; }
    const payload = filled.map((entry) => ({ itemId: entry.itemId, type: entry.type, quantity: Number(entry.quantity) }));
    if (payload.some((entry) => entry.quantity < 0 || !Number.isFinite(entry.quantity))) { setError("Enter valid quantities for all items."); return; }
    setLoading(true);
    try {
      await adjustStockBatch({ branchId, entries: payload });
      setSuccess("Stock changes saved successfully.");
      router.refresh();
      router.push("/inventory");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save stock changes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-100 bg-purple-50 p-4">
        <div><p className="text-sm font-semibold text-purple-900">{branchName}</p><p className="mt-1 text-xs text-purple-700">Physical count replaces the current quantity; stock receipt adds to it.</p></div>
        <button type="button" onClick={() => { setError(null); setEntries((current) => [...current, { key: "row-" + Date.now() + "-" + current.length, itemId: "", type: "ADJUSTMENT", quantity: "" }]); }} className="rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-100">+ Add item</button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {entries.map((entry, index) => {
        const item = items.find((candidate) => candidate.id === entry.itemId);
        const currentQuantity = stockMap.get(entry.itemId) ?? 0;
        const entered = Number(entry.quantity || 0);
        const delta = entry.type === "ADJUSTMENT" ? entered - currentQuantity : entered;
        const newQuantity = currentQuantity + delta;
        return (
          <section key={entry.key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-gray-900">Item {index + 1}</h2><button type="button" onClick={() => setEntries((current) => current.length === 1 ? [{ key: current[0].key, itemId: "", type: "ADJUSTMENT", quantity: "" }] : current.filter((row) => row.key !== entry.key))} disabled={loading} className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">{entries.length === 1 ? "Clear item" : "Remove"}</button></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor={"item-" + entry.key} className="mb-1 block text-xs font-semibold text-gray-700">Inventory item <span className="text-red-600">*</span></label>
                <select id={"item-" + entry.key} value={entry.itemId} required onChange={(event) => updateEntry(entry.key, { itemId: event.target.value })} disabled={loading} className="aims-control w-full px-3 text-sm">
                  <option value="">Select an existing item</option>
                  {items.filter((candidate) => candidate.id === entry.itemId || !selectedIds.includes(candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{formatItemLabel(candidate)} ({candidate.unit})</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={"type-" + entry.key} className="mb-1 block text-xs font-semibold text-gray-700">Action type</label>
                <select id={"type-" + entry.key} value={entry.type} onChange={(event) => updateEntry(entry.key, { type: event.target.value as Entry["type"] })} disabled={loading} className="aims-control w-full px-3 text-sm">
                  <option value="ADJUSTMENT">Physical count adjustment</option><option value="STOCK_RECEIPT">Stock receipt / replenishment</option>
                </select>
              </div>
            </div>
            {item && <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Current stock</p><p className="mt-1 text-lg font-bold text-gray-900">{fmt(currentQuantity)} <span className="text-xs font-medium">{item.unit}</span></p></div>
              <div>
                <label htmlFor={"quantity-" + entry.key} className="mb-1 block text-xs font-semibold text-gray-700">{entry.type === "ADJUSTMENT" ? "Physical count / new quantity" : "Quantity received"}</label>
                <div className="flex items-stretch gap-2">
                  <button type="button" aria-label="Decrease quantity" onClick={() => changeQuantity(entry, -1)} disabled={loading || entered <= 0} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">−</button>
                  <input id={"quantity-" + entry.key} type="number" min="0" step="any" required value={entry.quantity} onChange={(event) => updateEntry(entry.key, { quantity: event.target.value })} disabled={loading} className="aims-control min-w-0 flex-1 px-3 text-center text-sm" placeholder="Enter quantity" />
                  <button type="button" aria-label="Increase quantity" onClick={() => changeQuantity(entry, 1)} disabled={loading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">+</button>
                </div>
                <p className="mt-2 text-xs text-gray-500">{entry.type === "ADJUSTMENT" ? "This is the final physical count." : "This amount will be added to current stock."}</p>
              </div>
              <div className="sm:col-span-2 rounded-lg border border-gray-100 p-3"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-gray-600">Change</span><strong className={delta < 0 ? "text-red-600" : "text-green-700"}>{delta > 0 ? "+" : ""}{fmt(delta)} {item.unit}</strong></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-gray-600">New quantity</span><strong className="text-gray-900">{fmt(newQuantity)} {item.unit}</strong></div></div>
            </div>}
          </section>
        );
      })}

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <a href="/inventory" className="rounded-lg border border-gray-300 px-5 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</a>
        <button type="submit" disabled={loading || items.length === 0} className="rounded-lg bg-purple-700 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Saving batch…" : "Save all stock changes"}</button>
      </div>
    </form>
  );
}