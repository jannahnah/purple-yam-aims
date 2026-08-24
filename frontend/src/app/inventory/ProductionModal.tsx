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

  // Filter finished items and potential ingredients
  const finishedItems = items.filter(
    (item) => item.sourceType === "FINISHED_PRODUCT"
  );
  const rawMaterials = items.filter(
    (item) => item.sourceType !== "FINISHED_PRODUCT"
  );

  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || "");
  const [selectedFinishedItem, setSelectedFinishedItem] = useState(
    finishedItems[0]?.id || ""
  );
  const [producedQuantity, setProducedQuantity] = useState<number>(1);

  // Dynamic ingredient rows
  const [ingredientRows, setIngredientRows] = useState<
    { itemId: string; quantity: number }[]
  >([{ itemId: rawMaterials[0]?.id || "", quantity: 1 }]);

  const addIngredientRow = () => {
    if (rawMaterials.length > 0) {
      setIngredientRows((prev) => [
        ...prev,
        { itemId: rawMaterials[0].id, quantity: 1 },
      ]);
    }
  };

  const removeIngredientRow = (index: number) => {
    setIngredientRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateIngredientRow = (
    index: number,
    field: "itemId" | "quantity",
    value: string | number
  ) => {
    setIngredientRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await logProductionRun({
        branchId: selectedBranch,
        finishedItemId: selectedFinishedItem,
        producedQuantity: Number(producedQuantity),
        ingredients: ingredientRows.map((ing) => ({
          itemId: ing.itemId,
          quantity: Number(ing.quantity),
        })),
      });
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to log production run.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        + Log Production Run
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Log Production Run (Baking Batch)
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Target Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Finished Item Produced
                  </label>
                  <select
                    value={selectedFinishedItem}
                    onChange={(e) => setSelectedFinishedItem(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                  >
                    {finishedItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Yield Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={producedQuantity}
                    onChange={(e) => setProducedQuantity(Number(e.target.value))}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                </div>
              </div>

              <hr className="my-2 border-gray-200" />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">
                    Raw Ingredients Deducted
                  </label>
                  <button
                    type="button"
                    onClick={addIngredientRow}
                    className="text-xs font-medium text-emerald-600 hover:underline"
                  >
                    + Add Ingredient
                  </button>
                </div>

                <div className="space-y-2">
                  {ingredientRows.map((row, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={row.itemId}
                        onChange={(e) =>
                          updateIngredientRow(index, "itemId", e.target.value)
                        }
                        className="flex-1 rounded-lg border border-gray-300 p-2 text-sm"
                      >
                        {rawMaterials.map((mat) => (
                          <option key={mat.id} value={mat.id}>
                            {mat.name} ({mat.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        value={row.quantity}
                        onChange={(e) =>
                          updateIngredientRow(
                            index,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                        placeholder="Qty"
                        className="w-24 rounded-lg border border-gray-300 p-2 text-sm"
                      />

                      {ingredientRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(index)}
                          className="text-red-500 hover:text-red-700 text-sm px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Recording Batch..." : "Confirm Production Run"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}