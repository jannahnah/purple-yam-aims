"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logSpoilage } from "@/app/actions/spoilage";

type Item = { id: string; name: string; size: string | null; unit: string; sourceType: string; category: string };
type Branch = { id: string; name: string };
type Recent = { id: string; itemName: string; size: string | null; unit: string; quantity: number; reason: string; branchName: string; username: string; createdAt: string };

function itemLabel(item: { name: string; size: string | null }) {
  return item.size ? `${item.name} — ${item.size.charAt(0) + item.size.slice(1).toLowerCase()}` : item.name;
}
export default function SpoilageClient({ userRole, branches, initialBranchId, items, recent }: { userRole: string; branches: Branch[]; initialBranchId: string; items: Item[]; recent: Recent[] }) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(initialBranchId);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const selectedItem = items.find(item => item.id === itemId);
  const canSelectBranch = userRole === "OWNER" || userRole === "INVENTORY_MANAGER";
  function submit() {
    setError(""); setMessage("");
    startTransition(async () => {
      try {
        await logSpoilage({ branchId, itemId, quantity: Number(quantity), reason });
        setMessage("Spoilage recorded and stock updated.");
        setQuantity("1"); setReason(""); setItemId("");
        router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "Could not record spoilage."); }
    });
  }
  return <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-2xl bg-gradient-to-r from-purple-950 to-indigo-900 p-6 text-white"><p className="text-sm text-purple-200">Inventory control</p><h1 className="mt-2 text-3xl font-bold">Spoiled Stock Log</h1><p className="mt-2 max-w-2xl text-sm text-purple-100">Record spoiled, expired, damaged, or otherwise unusable finished products and ingredients. Stock is deducted immediately and the reason is saved in transaction history.</p></header>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-gray-900">Record spoilage</h2><p className="mt-1 text-sm text-gray-500">Enter the quantity that must be removed from available stock.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {canSelectBranch && <label className="text-sm font-semibold text-gray-700">Branch<select value={branchId} onChange={e => setBranchId(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3">{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
        <label className="text-sm font-semibold text-gray-700">Item<select value={itemId} onChange={e => setItemId(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3"><option value="">Select ingredient or finished product</option>{items.map(item => <option key={item.id} value={item.id}>{itemLabel(item)} · {item.sourceType === "FINISHED_PRODUCT" ? "Finished product" : item.category === "PACKAGING" ? "Packaging" : "Ingredient"} ({item.unit})</option>)}</select></label>
        <label className="text-sm font-semibold text-gray-700">Spoiled quantity ({selectedItem?.unit ?? "unit"})<input type="number" min="0.01" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 p-3" /></label>
        <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Reason / notes<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} rows={3} placeholder="e.g. expired milk, cracked eggs, flour contaminated, cake damaged" className="mt-2 w-full rounded-xl border border-gray-300 p-3 font-normal" /></label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      <button type="button" disabled={pending || !branchId || !itemId || !reason.trim() || !(Number(quantity) > 0)} onClick={submit} className="mt-5 min-h-12 rounded-xl bg-purple-800 px-6 font-semibold text-white hover:bg-purple-900 disabled:opacity-50">{pending ? "Saving…" : "Record spoiled stock"}</button>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-gray-900">Recent spoilage records</h2><p className="text-sm text-gray-500">Latest 30 records</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{recent.length} records</span></div>
      {recent.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">No spoilage records yet.</p> : <div className="divide-y divide-gray-100">{recent.map(record => <div key={record.id} className="py-3"><div className="flex flex-col justify-between gap-1 sm:flex-row"><div><p className="font-semibold text-gray-900">{itemLabel(record)}</p><p className="text-xs text-gray-500">{record.branchName} · By {record.username} · {new Date(record.createdAt).toLocaleString()}</p></div><p className="font-bold text-red-700">−{record.quantity} {record.unit}</p></div><p className="mt-2 text-sm text-gray-600">{record.reason}</p></div>)}</div>}
    </section>
  </div></main>;
}
