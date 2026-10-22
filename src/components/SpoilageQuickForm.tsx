"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logSpoilage } from "@/app/actions/spoilage";

type Item = {
  id: string;
  name: string;
  size: string | null;
  unit: string;
  sourceType: string;
  category: string;
};
type Branch = { id: string; name: string };

function itemLabel(item: { name: string; size: string | null }) {
  return item.size
    ? `${item.name} — ${item.size.charAt(0) + item.size.slice(1).toLowerCase()}`
    : item.name;
}

export default function SpoilageQuickForm({
  userRole,
  branches,
  initialBranchId,
  items,
}: {
  userRole: "OWNER" | "BRANCH_MANAGER";
  branches: Branch[];
  initialBranchId: string;
  items: Item[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const selectedItem = items.find((item) => item.id === itemId);

  function submit() {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        await logSpoilage({ branchId, itemId, quantity: Number(quantity), reason });
        setMessage("Spoilage recorded and stock updated.");
        setItemId("");
        setQuantity("1");
        setReason("");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not record spoilage.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Spoiled Stock</h2>
          <p className="mt-1 text-sm text-gray-500">Record unusable ingredients or finished products directly from Inventory.</p>
        </div>
        <button
          type="button"
          onClick={() => { setIsOpen((current) => !current); setError(""); setMessage(""); }}
          aria-expanded={isOpen}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-purple-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-900"
        >
          {isOpen ? "Close form" : "＋ Record spoiled stock"}
        </button>
      </div>
      {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {isOpen && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="mb-4 text-sm text-gray-500">Available stock will be reduced immediately. The reason and quantity are saved in transaction history.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {userRole === "OWNER" && (
              <label className="text-sm font-semibold text-gray-700">
                Branch
                <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3">
                  <option value="">Select branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
            )}
            <label className="text-sm font-semibold text-gray-700">
              Item
              <select value={itemId} onChange={(event) => setItemId(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3">
                <option value="">Select ingredient or finished product</option>
                {items.map((item) => <option key={item.id} value={item.id}>{itemLabel(item)} · {item.sourceType === "FINISHED_PRODUCT" ? "Finished product" : item.category === "PACKAGING" ? "Packaging" : "Ingredient"} ({item.unit})</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Spoiled quantity ({selectedItem?.unit ?? "unit"})
              <input type="number" min="0.01" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 p-3" />
            </label>
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
              Reason / notes
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder="e.g. expired milk, cracked eggs, cake damaged" className="mt-2 w-full rounded-xl border border-gray-300 p-3 font-normal" />
            </label>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setIsOpen(false)} className="min-h-11 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" disabled={pending || !branchId || !itemId || !reason.trim() || !(Number(quantity) > 0)} onClick={submit} className="min-h-11 rounded-xl bg-purple-800 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-900 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Saving…" : "Record spoiled stock"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
