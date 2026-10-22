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

  function closeModal() {
    if (!pending) setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setIsOpen(true); setError(""); setMessage(""); }}
        className="aims-primary shadow-sm"
      >
        + Log Spoilage
      </button>

      {message && !isOpen && (
        <p role="status" className="mt-2 text-sm text-emerald-700">{message}</p>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="spoilage-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <h2 id="spoilage-modal-title" className="text-xl font-bold text-gray-900">
                  Log Spoilage
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Record spoiled stock and update inventory.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                aria-label="Close spoilage form"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              {userRole === "OWNER" && (
                <label className="block text-sm font-semibold text-gray-800">
                  Branch
                  <select
                    value={branchId}
                    onChange={(event) => setBranchId(event.target.value)}
                    required
                    disabled={pending}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  >
                    <option value="">Select branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block text-sm font-semibold text-gray-800">
                Item
                <select
                  value={itemId}
                  onChange={(event) => setItemId(event.target.value)}
                  required
                  disabled={pending}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                >
                  <option value="">Select ingredient or finished product</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {itemLabel(item)} · {item.sourceType === "FINISHED_PRODUCT" ? "Finished product" : item.category === "PACKAGING" ? "Packaging" : "Ingredient"} ({item.unit})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-gray-800">
                Spoiled quantity ({selectedItem?.unit ?? "unit"})
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                  disabled={pending}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-800">
                Reason / notes
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  rows={3}
                  required
                  disabled={pending}
                  placeholder="e.g. expired milk, cracked eggs, cake damaged"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm font-normal text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                />
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
              )}
              {message && (
                <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="min-h-11 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !branchId || !itemId || !reason.trim() || !(Number(quantity) > 0)}
                onClick={submit}
                className="aims-primary min-h-11 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Saving…" : "Confirm Spoilage"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
