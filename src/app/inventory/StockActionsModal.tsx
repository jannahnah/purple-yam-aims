"use client";

import { useEffect, useState } from "react";
import { adjustStock, transferStock } from "@/app/actions/inventory";

interface Branch {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  unit: string;
}

interface BranchStock {
  id: string;
  branchId: string;
  itemId: string;
  quantity: number;
}

interface StockActionsModalProps {
  branches: Branch[];
  items: Item[];
  branchStocks: BranchStock[];
}

export default function StockActionsModal({
  branches,
  items,
  branchStocks,
}: StockActionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"transfer" | "adjust">("adjust");

  const [branchId, setBranchId] = useState("");
  const [itemId, setItemId] = useState("");
  const [newTotalQuantity, setNewTotalQuantity] = useState("");

  const [actionType, setActionType] =
    useState<"ADJUSTMENT" | "STOCK_RECEIPT">("ADJUSTMENT");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (branches.length > 0 && !branchId) {
        setBranchId(branches[0].id);
      }

      if (items.length > 0 && !itemId) {
        setItemId(items[0].id);
      }

      setError(null);
    }
  }, [isOpen, branches, items, branchId, itemId]);

  const currentStockRecord = branchStocks.find(
    (stock) =>
      stock.branchId === branchId && stock.itemId === itemId
  );

  const currentQuantity = currentStockRecord?.quantity ?? 0;

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetQuantity = parseFloat(newTotalQuantity);

    if (isNaN(targetQuantity) || targetQuantity < 0) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (!branchId || !itemId) {
      setError("Please select both a branch and an item.");
      return;
    }

    const delta = targetQuantity - currentQuantity;

    setLoading(true);

    try {
      await adjustStock({
        branchId,
        itemId,
        quantity: delta,
        type: actionType,
      });

      setNewTotalQuantity("");
      setIsOpen(false);

      // Refresh the server-rendered inventory data
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to adjust stock."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Open Modal Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
      >
        Stock Actions
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <h2 className="mb-4 text-xl font-bold text-gray-800">
              Stock Operation
            </h2>

            {/* Tabs */}
            <div className="mb-6 flex border-b">
              <button
                type="button"
                className={`flex-1 border-b-2 py-2 text-center text-sm font-medium ${
                  activeTab === "transfer"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("transfer")}
              >
                Transfer Stock
              </button>

              <button
                type="button"
                className={`flex-1 border-b-2 py-2 text-center text-sm font-medium ${
                  activeTab === "adjust"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("adjust")}
              >
                Stock Adjustment
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {error}
              </div>
            )}

            {/* Adjustment */}
            {activeTab === "adjust" && (
              <form
                onSubmit={handleAdjustSubmit}
                className="space-y-4"
              >
                {/* Branch */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Target Branch
                  </label>

                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Item
                  </label>

                  <select
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Type */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Action Type
                  </label>

                  <select
                    value={actionType}
                    onChange={(e) =>
                      setActionType(
                        e.target.value as
                          | "ADJUSTMENT"
                          | "STOCK_RECEIPT"
                      )
                    }
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ADJUSTMENT">
                      Stock Adjustment (Audit)
                    </option>

                    <option value="STOCK_RECEIPT">
                      Stock Receipt (Replenishment)
                    </option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">
                      New Total Quantity
                    </label>

                    <span className="text-xs text-gray-500">
                      Current Stock:{" "}
                      <strong className="text-purple-700">
                        {currentQuantity}
                      </strong>
                    </span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newTotalQuantity}
                    onChange={(e) =>
                      setNewTotalQuantity(e.target.value)
                    }
                    placeholder="Enter new total quantity"
                    required
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-lg bg-purple-600 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Adjustment"}
                </button>
              </form>
            )}

            {/* Transfer placeholder */}
            {activeTab === "transfer" && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                Transfer Stock functionality is available in the
                inventory actions module.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}