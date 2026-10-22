"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logProductionRun } from "@/app/actions/production";

type Product = { id: string; name: string; size: string | null; unit: string; hasRecipe: boolean };
type Recent = { id: string; itemName: string; size: string | null; unit: string; quantity: number; username: string; createdAt: string };
type Summary = { producedToday: number; soldToday: number; availableStock: number; productCount: number };

function label(p: { name: string; size: string | null }) { return p.size ? `${p.name} — ${p.size.charAt(0) + p.size.slice(1).toLowerCase()}` : p.name; }
function quantity(n: number) { return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""); }

export default function ProductionStaffClient({ branchId, branchName, products, recent, summary }: { branchId: string; branchName: string; products: Product[]; recent: Recent[]; summary: Summary }) {
  const router = useRouter();
  const [selected, setSelected] = useState(products.find(p => p.hasRecipe)?.id ?? "");
  const [amount, setAmount] = useState("1");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const selectedProduct = products.find(p => p.id === selected);

  // Refresh server-backed totals regularly so cashier sales appear without a manual reload.
  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 15000);
    return () => window.clearInterval(interval);
  }, [router]);

  function submit(value?: string) {
    const count = Number(value ?? amount);
    setError(""); setMessage("");
    if (!selected) { setError("Choose a finished product first."); return; }
    if (!Number.isInteger(count) || count <= 0) { setError("Enter a whole number greater than zero."); return; }
    startTransition(async () => {
      try {
        await logProductionRun({ branchId, finishedItemId: selected, producedQuantity: count });
        setMessage(`Logged ${count} ${selectedProduct?.unit ?? "units"} of ${selectedProduct ? label(selectedProduct) : "finished product"}.`);
        setAmount("1");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save production. Please try again.");
      }
    });
  }

  return (
    <div className="min-h-full bg-[#f7f7fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-gradient-to-r from-purple-950 to-indigo-900 p-5 text-white sm:p-7">
          <p className="text-sm text-purple-200">Production workspace · {branchName}</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Log finished products</h1>
          <p className="mt-2 max-w-2xl text-sm text-purple-100">A quick, whiteboard-style entry for a busy production shift. Choose the product, tap a quantity, and save.</p>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Quick entry</h2>
            <p className="mt-1 text-sm text-gray-500">Only this account’s assigned branch can be used for production logging.</p>
          </div>
          {products.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No active finished products are available. Ask the owner to check Item Master.</p> : <>
            <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="product">Finished product</label>
            <select id="product" value={selected} onChange={e => setSelected(e.target.value)} className="mb-4 w-full rounded-xl border border-gray-300 bg-white p-3 text-base">
              <option value="">Select a product…</option>
              {products.map(p => <option key={p.id} value={p.id} disabled={!p.hasRecipe}>{label(p)}{!p.hasRecipe ? " — recipe required" : ""}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[1,5,10].map(n => <button key={n} disabled={pending || !selected || !selectedProduct?.hasRecipe} onClick={() => submit(String(n))} className="min-h-16 rounded-xl border border-purple-200 bg-purple-50 px-2 py-3 text-center text-purple-950 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"><span className="block text-2xl font-bold">+{n}</span><span className="text-xs">Log {n}</span></button>)}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="amount" className="sr-only">Custom quantity</label>
              <input id="amount" type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} className="min-h-12 min-w-0 flex-1 rounded-xl border border-gray-300 px-3" placeholder="Enter quantity" />
              <button disabled={pending || !selected || !selectedProduct?.hasRecipe} onClick={() => submit()} className="min-h-12 rounded-xl bg-purple-800 px-6 font-semibold text-white hover:bg-purple-900 disabled:opacity-50">{pending ? "Saving…" : "Log production"}</button>
            </div>
            {selectedProduct && !selectedProduct.hasRecipe && <p className="mt-3 text-sm text-amber-700">A production recipe must be configured before this product can be logged. This keeps ingredient deductions and stock history consistent.</p>}
          </>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-gray-900">Recent production entries</h2><p className="text-sm text-gray-500">Latest finished-product quantities logged for {branchName}.</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{recent.length} entries</span></div>
          {recent.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">No production entries yet for this branch.</p> : <div className="divide-y divide-gray-100">{recent.map(tx => <div key={tx.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate font-semibold text-gray-900">{label({name: tx.itemName, size: tx.size})}</p><p className="mt-1 text-xs text-gray-500">By {tx.username} · {new Date(tx.createdAt).toLocaleString()}</p></div><p className="shrink-0 text-lg font-bold text-purple-800">+{quantity(tx.quantity)} <span className="text-xs font-medium text-gray-500">{tx.unit}</span></p></div>)}</div>}
        </section>
      </div>
    </div>
  );
}
