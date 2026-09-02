"use client";

import { useMemo, useState } from "react";
import { recordSale } from "@/app/actions/sales";

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

interface BranchStock {
  branchId: string;
  itemId: string;
  quantity: number;
}

export default function SalesModal({
  branches,
  items,
  branchStocks,
}: {
  branches: Branch[];
  items: Item[];
  branchStocks: BranchStock[];
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

  const [soldQuantity, setSoldQuantity] = useState<number>(1);

  const availableStock =
    branchStocks.find(
      (stock) =>
        stock.branchId === selectedBranch &&
        stock.itemId === selectedFinishedItem
    )?.quantity ?? 0;

  const selectedProduct = finishedItems.find(
    (item) => item.id === selectedFinishedItem
  );

  const remainingStock = useMemo(() => {
    return availableStock - soldQuantity;
  }, [availableStock, soldQuantity]);

  const hasInsufficientStock =
    soldQuantity > availableStock && soldQuantity > 0;

  const isValidQuantity =
    Number.isInteger(soldQuantity) &&
    soldQuantity > 0 &&
    soldQuantity <= availableStock;

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

    if (!Number.isInteger(soldQuantity) || soldQuantity <= 0) {
      alert("Sale quantity must be a whole number greater than zero.");
      return;
    }

    if (soldQuantity > availableStock) {
      alert(
        `Insufficient stock. Available: ${availableStock} ${
          selectedProduct?.unit || "units"
        }.`
      );
      return;
    }

    setLoading(true);

    try {
      await recordSale({
        branchId: selectedBranch,
        finishedItemId: selectedFinishedItem,
        soldQuantity,
      });

      alert("Sale recorded successfully.");

      setIsOpen(false);
      setSoldQuantity(1);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to record sale.";

      alert(message);
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    if (!loading) {
      setIsOpen(false);
    }
  }

  function handleBranchChange(branchId: string) {
    setSelectedBranch(branchId);
    setSoldQuantity(1);
  }

  function handleProductChange(itemId: string) {
    setSelectedFinishedItem(itemId);
    setSoldQuantity(1);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        + Record Sale
      </button>

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
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Record Sale
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Record a completed sale and update finished-product
                    inventory.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  aria-label="Close sales modal"
                  className="rounded-lg p-1.5 text-xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
                {/* Branch */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800">
                    Target Branch
                  </label>

                  <p className="mt-1 text-xs text-gray-500">
                    Select where the sale occurred.
                  </p>

                  <select
                    value={selectedBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    required
                    disabled={loading}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
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
                  <label className="block text-sm font-semibold text-gray-800">
                    Finished Product
                  </label>

                  <p className="mt-1 text-xs text-gray-500">
                    Select the finished product being sold.
                  </p>

                  <select
                    value={selectedFinishedItem}
                    onChange={(e) =>
                      handleProductChange(e.target.value)
                    }
                    required
                    disabled={loading}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  >
                    {finishedItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Available Stock */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        Available Stock
                      </span>

                      <p className="mt-0.5 text-xs text-gray-400">
                        Current finished-product inventory
                      </p>
                    </div>

                    <span className="text-lg font-bold text-gray-900">
                      {availableStock}{" "}
                      {selectedProduct?.unit || "units"}
                    </span>
                  </div>
                </div>

                {/* Quantity Sold */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800">
                    Quantity Sold
                  </label>

                  <p className="mt-1 text-xs text-gray-500">
                    Enter the number of finished products sold.
                  </p>

                  <div className="relative mt-2">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max={availableStock}
                      value={soldQuantity}
                      onChange={(e) =>
                        setSoldQuantity(Number(e.target.value))
                      }
                      required
                      disabled={loading}
                      className={`w-full rounded-lg border px-3 py-2.5 pr-16 text-sm text-gray-800 outline-none transition focus:ring-2 disabled:bg-gray-100 ${
                        hasInsufficientStock
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
                      {selectedProduct?.unit || "units"}
                    </span>
                  </div>

                  {hasInsufficientStock && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      Insufficient stock. You can sell up to{" "}
                      {availableStock}{" "}
                      {selectedProduct?.unit || "units"}.
                    </p>
                  )}
                </div>

                {/* Sale Summary */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Sale Summary
                    </h3>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Review the inventory change before recording.
                    </p>
                  </div>

                  <div className="space-y-3 px-4 py-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Current stock
                      </span>

                      <span className="font-medium text-gray-900">
                        {availableStock}{" "}
                        {selectedProduct?.unit || "units"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Quantity sold
                      </span>

                      <span className="font-medium text-red-600">
                        -{soldQuantity || 0}{" "}
                        {selectedProduct?.unit || "units"}
                      </span>
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">
                          Remaining stock
                        </span>

                        <span
                          className={`text-lg font-bold ${
                            hasInsufficientStock
                              ? "text-red-600"
                              : "text-gray-900"
                          }`}
                        >
                          {remainingStock < 0 ? 0 : remainingStock}{" "}
                          {selectedProduct?.unit || "units"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation / Ready State */}
                {isValidQuantity && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
                        ✓
                      </span>

                      <div>
                        <h3 className="text-sm font-semibold text-green-900">
                          Ready to record
                        </h3>

                        <p className="mt-1 text-xs leading-relaxed text-green-800">
                          This sale can be recorded. Finished-product
                          inventory will decrease by {soldQuantity}{" "}
                          {selectedProduct?.unit || "units"}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Before Recording */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h3 className="text-sm font-semibold text-blue-900">
                    Before recording
                  </h3>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-blue-800">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                        ✓
                      </span>

                      Finished-product stock will be checked.
                    </div>

                    <div className="flex items-center gap-2 text-xs text-blue-800">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                        ✓
                      </span>

                      Stock will not go below zero.
                    </div>

                    <div className="flex items-center gap-2 text-xs text-blue-800">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                        ✓
                      </span>

                      A SALE transaction will be recorded.
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs leading-relaxed text-amber-800">
                    <span className="font-semibold">Note:</span>{" "}
                    The sale will not be recorded if the requested quantity
                    exceeds available finished-product stock.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedBranch ||
                    !selectedFinishedItem ||
                    !isValidQuantity
                  }
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Recording Sale..." : "Confirm Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}