"use client";

import { useState } from "react";
import { logProductionRun } from "@/app/actions/production";

interface Branch {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  unit: string;
  sourceType: string;
}

export default function ProductionModal({
  branches,
  items,
}: {
  branches: Branch[];
  items: Item[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const finishedItems = items.filter(
    (item) => item.sourceType === "FINISHED_PRODUCT"
  );

  const [selectedBranch, setSelectedBranch] = useState(
    branches[0]?.id || ""
  );

  const [selectedFinishedItem, setSelectedFinishedItem] = useState(
    finishedItems[0]?.id || ""
  );

  const [producedQuantity, setProducedQuantity] = useState<number>(1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedBranch) {
      alert("Please select a branch.");
      return;
    }

    if (!selectedFinishedItem) {
      alert("Please select a finished product.");
      return;
    }

    if (!Number.isFinite(producedQuantity) || producedQuantity <= 0) {
      alert("Production quantity must be greater than zero.");
      return;
    }

    setLoading(true);

    try {
      await logProductionRun({
        branchId: selectedBranch,
        finishedItemId: selectedFinishedItem,
        producedQuantity: Number(producedQuantity),
      });

      alert("Production recorded successfully.");

      setIsOpen(false);
      setProducedQuantity(1);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to log production run.";

      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        + Log Production Run
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Log Production Run
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Record a baking batch using the approved production recipe.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="text-xl text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Target Branch */}
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Target Branch
                </label>

                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  required
                  disabled={loading}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm"
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Finished Product */}
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Finished Product
                </label>

                <select
                  value={selectedFinishedItem}
                  onChange={(e) =>
                    setSelectedFinishedItem(e.target.value)
                  }
                  required
                  disabled={loading}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm"
                >
                  {finishedItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Yield Quantity */}
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Yield Quantity
                </label>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={producedQuantity}
                    onChange={(e) =>
                      setProducedQuantity(Number(e.target.value))
                    }
                    required
                    disabled={loading}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 pr-16 text-sm"
                  />

                  <span className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-xs text-gray-500">
                    units
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  Ingredient quantities are calculated automatically from
                  the approved recipe.
                </p>
              </div>

              {/* Recipe Information */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-800">
                  Production Recipe
                </p>

                <p className="mt-1 text-xs leading-relaxed text-blue-700">
                  The system will load the recipe for the selected finished
                  product, calculate the required ingredients based on the
                  yield, and check available stock before making any changes.
                </p>
              </div>

              {/* Production Process */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700">
                  Production Process
                </p>

                <ul className="mt-2 space-y-1 text-xs text-gray-600">
                  <li>• Verify the selected branch.</li>
                  <li>• Verify the finished product.</li>
                  <li>• Load the approved production recipe.</li>
                  <li>• Calculate ingredient requirements.</li>
                  <li>• Check available raw-material stock.</li>
                  <li>• Deduct required ingredients.</li>
                  <li>• Add the finished product to branch stock.</li>
                  <li>• Record production transactions.</li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="w-1/3 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedBranch ||
                    !selectedFinishedItem ||
                    !Number.isFinite(producedQuantity) ||
                    producedQuantity <= 0
                  }
                  className="w-2/3 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Recording Production..."
                    : "Confirm Production Run"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}