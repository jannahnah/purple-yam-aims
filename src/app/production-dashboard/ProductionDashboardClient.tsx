"use client";

import { useMemo, useState } from "react";
import { formatItemLabel } from "@/lib/item-label";

type Product = {
  id: string;
  name: string;
  size: "SMALL" | "ROUND" | "MEDIUM" | "LARGE" | null;
  unit: string;
  currentStock: number;
};
type Recent = {
  id: string;
  itemName: string;
  itemSize: Product["size"];
  unit: string;
  quantity: number;
  createdAt: string;
  username: string;
};
const quickAmounts = [1, 5, 10, 20];

export default function ProductionDashboardClient({
  user, products, recent: initialRecent,
}: {
  user: { name: string | null; username: string; branchId: string; branchName: string };
  products: Product[];
  recent: Recent[];
}) {
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recent, setRecent] = useState(initialRecent);
  const [stocks, setStocks] = useState<Record<string, number>>(
    Object.fromEntries(products.map((p) => [p.id, p.currentStock]))
  );
  const selected = products.find((item) => item.id === selectedId);
  const amount = Number(quantity);
  const canSubmit = Boolean(selected) && Number.isInteger(amount) && amount > 0 && !loading;

  const todayCount = useMemo(() => recent.filter((row) => {
    const date = new Date(row.createdAt);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  }).length, [recent]);

  async function recordProduction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!selected || !canSubmit) return;
    setLoading(true);
    try {
      const response = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finishedProductItemId: selected.id, finishedProductQuantity: amount }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not record production.");
      const now = new Date().toISOString();
      setStocks((current) => ({ ...current, [selected.id]: (current[selected.id] ?? 0) + amount }));
      setRecent((current) => [{
        id: `local-${Date.now()}`, itemName: selected.name, itemSize: selected.size,
        unit: selected.unit, quantity: amount, createdAt: now,
        username: user.name?.trim() || user.username,
      }, ...current].slice(0, 15));
      setSuccess(`Recorded +${amount} ${selected.unit} of ${formatItemLabel(selected)}.`);
      setQuantity("1");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not record production.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-full bg-[#f7f7fa] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">Production workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Finished Product Log</h1>
            <p className="mt-2 text-sm text-gray-600">Quick entry for what just came out of the kitchen.</p>
          </div>
          <div className="rounded-xl border border-purple-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Assigned branch</p>
            <p className="mt-1 font-semibold text-gray-900">{user.branchName}</p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Products to log</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{products.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Batches logged today</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{todayCount}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Your access</p>
            <p className="mt-2 text-lg font-bold text-purple-800">Production only</p>
            <p className="mt-1 text-xs text-gray-500">No sales, transfer, or adjustment controls</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <form onSubmit={recordProduction} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Fast production entry</p>
              <h2 className="mt-1 text-xl font-bold text-gray-950">What did you make?</h2>
              <p className="mt-1 text-sm text-gray-500">Choose the product, tap a common amount or enter the exact count, then save.</p>
            </div>

            <label htmlFor="product" className="mb-2 block text-sm font-semibold text-gray-800">Finished product</label>
            <select id="product" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} required disabled={loading || products.length === 0}
              className="mb-5 h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100">
              {products.map((product) => <option key={product.id} value={product.id}>{formatItemLabel(product)}</option>)}
            </select>

            {selected && (
              <div className="mb-5 rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold text-gray-900">{formatItemLabel(selected)}</p>
                  <p className="text-sm text-gray-600">Current stock <strong className="text-gray-900">{stocks[selected.id] ?? 0} {selected.unit}</strong></p>
                </div>
                <p className="mt-1 text-xs text-gray-500">Stock updates after production is accepted.</p>
              </div>
            )}

            <label htmlFor="quantity" className="mb-2 block text-sm font-semibold text-gray-800">Quantity produced ({selected?.unit ?? "units"})</label>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((preset) => (
                <button key={preset} type="button" disabled={loading} onClick={() => setQuantity(String(preset))}
                  className={`min-h-12 rounded-xl border text-base font-bold transition disabled:opacity-50 ${quantity === String(preset) ? "border-purple-600 bg-purple-700 text-white" : "border-gray-300 bg-white text-gray-800 hover:border-purple-400 hover:bg-purple-50"}`}>
                  {preset}
                </button>
              ))}
            </div>
            <input id="quantity" type="number" inputMode="numeric" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required disabled={loading}
              className="mt-3 h-14 w-full rounded-xl border border-gray-300 px-4 text-2xl font-bold text-gray-950 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100" />

            <button type="submit" disabled={!canSubmit || products.length === 0}
              className="mt-5 flex min-h-14 w-full items-center justify-center rounded-xl bg-purple-700 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Saving production…" : `✓ Record ${quantity || "0"} ${selected?.unit ?? "units"}`}
            </button>
            <p className="mt-3 text-xs leading-5 text-gray-500">Production is saved with your account and branch. Approved recipes and ingredient availability are still checked automatically.</p>
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            {success && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{success}</p>}
          </form>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-950">Recent production</h2>
              <p className="mt-1 text-sm text-gray-500">Latest finished-product entries for {user.branchName}.</p>
            </div>
            {recent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center">
                <p className="font-medium text-gray-800">No production logged yet</p>
                <p className="mt-1 text-sm text-gray-500">Your saved batches will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recent.map((row) => (
                  <div key={row.id} className="flex items-start gap-3 py-3 first:pt-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-lg text-emerald-700">✓</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{formatItemLabel({ name: row.itemName, size: row.itemSize })}</p>
                      <p className="mt-1 text-xs text-gray-500">{row.username} · {new Date(row.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-emerald-700">+{row.quantity} {row.unit}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
