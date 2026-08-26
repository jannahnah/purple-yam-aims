"use client";

import { useEffect, useState } from "react";

type InventoryItem = {
  id: string;
  branchId: string;
  branch: string;
  itemId: string;
  item: string;
  sourceType: string;
  unit: string;
  quantity: number;
  minThreshold: number;
  lowStock: boolean;
  updatedAt: string;
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/inventory");

      if (!response.ok) {
        throw new Error("Failed to load inventory.");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load inventory.");
      }

      setInventory(data.inventory);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load inventory."
      );
    } finally {
      setLoading(false);
    }
  }

  async function adjustStock(id: string, quantityDelta: number) {
    try {
      setError("");

      const response = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantityDelta,
          userId: "50e9ac75-11b6-43a0-bab7-43ff3de49404",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Inventory adjustment failed.");
      }

      await loadInventory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Inventory adjustment failed."
      );
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and adjust current stock levels.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading inventory...
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No inventory records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Item
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Source
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Branch
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Stock
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Threshold
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Adjust
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {inventory.map((stock) => (
                    <tr key={stock.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">
                          {stock.item}
                        </div>
                        <div className="text-xs text-gray-400">
                          {stock.unit}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {stock.sourceType.replaceAll("_", " ")}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {stock.branch}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        {stock.quantity}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {stock.minThreshold}
                      </td>

                      <td className="px-5 py-4">
                        {stock.lowStock ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Normal
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => adjustStock(stock.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                          >
                            −
                          </button>

                          <button
                            type="button"
                            onClick={() => adjustStock(stock.id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}