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

  // Adjustment state
  const [branchId, setBranchId] = useState("");
  const [itemId, setItemId] = useState("");
  const [newTotalQuantity, setNewTotalQuantity] = useState("");

  const [actionType, setActionType] =
    useState<"ADJUSTMENT" | "STOCK_RECEIPT">("ADJUSTMENT");

  // Transfer state
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [transferItemId, setTransferItemId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (branches.length > 0) {
        if (!branchId) {
          setBranchId(branches[0].id);
        }

        if (!sourceBranchId) {
          setSourceBranchId(branches[0].id);
        }

        if (!destinationBranchId && branches.length > 1) {
          setDestinationBranchId(branches[1].id);
        }
      }

      if (items.length > 0) {
        if (!itemId) {
          setItemId(items[0].id);
        }

        if (!transferItemId) {
          setTransferItemId(items[0].id);
        }
      }

      setError(null);
    }
  }, [
    isOpen,
    branches,
    items,
    branchId,
    sourceBranchId,
    destinationBranchId,
    itemId,
    transferItemId,
  ]);

  // =========================
  // STOCK ADJUSTMENT
  // =========================

  const currentStockRecord = branchStocks.find(
    (stock) =>
      stock.branchId === branchId &&
      stock.itemId === itemId
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

  // =========================
  // STOCK TRANSFER
  // =========================

  const sourceStockRecord = branchStocks.find(
    (stock) =>
      stock.branchId === sourceBranchId &&
      stock.itemId === transferItemId
  );

  const sourceQuantity = sourceStockRecord?.quantity ?? 0;

  const selectedTransferItem = items.find(
    (item) => item.id === transferItemId
  );

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const quantity = parseFloat(transferQuantity);

    if (!sourceBranchId || !destinationBranchId) {
      setError("Please select both source and destination branches.");
      return;
    }

    if (sourceBranchId === destinationBranchId) {
      setError("Source and destination branches must be different.");
      return;
    }

    if (!transferItemId) {
      setError("Please select an item.");
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      setError("Transfer quantity must be greater than zero.");
      return;
    }

    if (quantity > sourceQuantity) {
      setError(
        `Insufficient stock. Available: ${sourceQuantity} ${
          selectedTransferItem?.unit || "units"
        }.`
      );
      return;
    }

    setLoading(true);

    try {
      await transferStock({
        sourceBranchId,
        destinationBranchId,
        itemId: transferItemId,
        quantity,
      });

      setTransferQuantity("");
      setIsOpen(false);

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to transfer stock."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // CLOSE MODAL
  // =========================

  const closeModal = () => {
    if (!loading) {
      setIsOpen(false);
      setError(null);
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
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
                onClick={() => {
                  setActiveTab("transfer");
                  setError(null);
                }}
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
                onClick={() => {
                  setActiveTab("adjust");
                  setError(null);
                }}
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

            {/* =========================
                TRANSFER STOCK
            ========================= */}
            {activeTab === "transfer" && (
              <form
                onSubmit={handleTransferSubmit}
                className="space-y-4"
              >
                <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                  <p className="text-xs text-purple-800">
                    Transfer existing stock from one branch to another.
                    The source stock will decrease and the destination
                    stock will increase automatically.
                  </p>
                </div>

                {/* Source Branch */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Source Branch
                  </label>

                  <select
                    value={sourceBranchId}
                    onChange={(e) =>
                      setSourceBranchId(e.target.value)
                    }
                    disabled={loading}
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination Branch */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Destination Branch
                  </label>

                  <select
                    value={destinationBranchId}
                    onChange={(e) =>
                      setDestinationBranchId(e.target.value)
                    }
                    disabled={loading}
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
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
                    value={transferItemId}
                    onChange={(e) =>
                      setTransferItemId(e.target.value)
                    }
                    disabled={loading}
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  >
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Available Stock */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">
                      Available at Source
                    </span>

                    <span className="font-semibold text-purple-700">
                      {sourceQuantity}{" "}
                      {selectedTransferItem?.unit || "units"}
                    </span>
                  </div>
                </div>

                {/* Transfer Quantity */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Quantity to Transfer
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    max={sourceQuantity}
                    value={transferQuantity}
                    onChange={(e) =>
                      setTransferQuantity(e.target.value)
                    }
                    placeholder="Enter transfer quantity"
                    required
                    disabled={loading}
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                </div>

                {/* Protection */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs leading-relaxed text-amber-800">
                    <span className="font-semibold">Important:</span>{" "}
                    The transfer will not proceed if the requested
                    quantity is greater than the available source stock.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !sourceBranchId ||
                    !destinationBranchId ||
                    !transferItemId ||
                    !transferQuantity ||
                    parseFloat(transferQuantity) <= 0 ||
                    parseFloat(transferQuantity) > sourceQuantity ||
                    sourceBranchId === destinationBranchId
                  }
                  className="w-full rounded-lg bg-purple-600 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Transferring..." : "Transfer Stock"}
                </button>
              </form>
            )}

            {/* =========================
                STOCK ADJUSTMENT
            ========================= */}
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
                    onChange={(e) =>
                      setBranchId(e.target.value)
                    }
                    disabled={loading}
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
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
                    onChange={(e) =>
                      setItemId(e.target.value)
                    }
                    disabled={loading}
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
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
                    disabled={loading}
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
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
                    disabled={loading}
                    className="w-full rounded-lg border p-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
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
          </div>
        </div>
      )}
    </>
  );
}