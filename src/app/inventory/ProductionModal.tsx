"use client";

import { useEffect, useMemo, useState } from "react";
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

interface RecipeIngredient {
  itemId: string;
  name: string;
  unit: string;
  requiredPerUnit: number;
  availableQuantity: number | null;
}

interface RecipeResponse {
  finishedItem: {
    id: string;
    name: string;
    unit: string;
    sourceType: string;
  };
  ingredients: RecipeIngredient[];
  message?: string;
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

  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState("");
  const [recipe, setRecipe] = useState<RecipeIngredient[]>([]);

  const finishedItems = items.filter(
    (item) => item.sourceType === "FINISHED_PRODUCT"
  );

  const [selectedBranch, setSelectedBranch] = useState(
    branches[0]?.id || ""
  );

  const [selectedFinishedItem, setSelectedFinishedItem] = useState(
    finishedItems[0]?.id || ""
  );

  const [producedQuantity, setProducedQuantity] =
    useState<number>(1);

  const selectedProduct = finishedItems.find(
    (item) => item.id === selectedFinishedItem
  );

  const selectedUnit = selectedProduct?.unit?.trim().toLowerCase() || "";

  const requiresWholeNumber =
    selectedUnit === "pcs" || selectedUnit === "cans";

  const isValidProductionQuantity =
    Number.isFinite(producedQuantity) &&
    producedQuantity > 0 &&
    Number.isInteger(producedQuantity);

  /*
   * Load the recipe and current ingredient stock whenever
   * the selected finished product or branch changes.
   */
  useEffect(() => {
    if (!isOpen || !selectedFinishedItem) {
      return;
    }

    let cancelled = false;

    async function loadRecipe() {
      setRecipeLoading(true);
      setRecipeError("");
      setRecipe([]);

      try {
        const params = new URLSearchParams({
          finishedItemId: selectedFinishedItem,
          branchId: selectedBranch,
        });

        const response = await fetch(
          `/api/inventory/production-recipe?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data: RecipeResponse | { error?: string } =
          await response.json();

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Failed to load production recipe."
          );
        }

        if (!cancelled) {
          const recipeData = data as RecipeResponse;

          setRecipe(recipeData.ingredients || []);

          if (recipeData.message) {
            setRecipeError(recipeData.message);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setRecipe([]);
          setRecipeError(
            error instanceof Error
              ? error.message
              : "Failed to load production recipe."
          );
        }
      } finally {
        if (!cancelled) {
          setRecipeLoading(false);
        }
      }
    }

    loadRecipe();

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedFinishedItem, selectedBranch]);

  /*
   * Calculate the actual ingredient requirements
   * for the requested production quantity.
   */
  const calculatedIngredients = useMemo(() => {
    return recipe.map((ingredient) => {
      const requiredQuantity =
        ingredient.requiredPerUnit * producedQuantity;

      const hasStock =
        ingredient.availableQuantity !== null &&
        ingredient.availableQuantity >= requiredQuantity;

      return {
        ...ingredient,
        requiredQuantity,
        hasStock,
      };
    });
  }, [recipe, producedQuantity]);

  const hasInsufficientStock = calculatedIngredients.some(
    (ingredient) => !ingredient.hasStock
  );

  const hasRecipe = recipe.length > 0;

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

    if (!isValidProductionQuantity) {
      if (requiresWholeNumber) {
        alert(
          `Production quantity must be a whole number for products measured in ${selectedProduct?.unit}.`
        );
      } else {
        alert(
          "Production quantity must be a whole number greater than zero."
        );
      }

      return;
    }

    if (recipeLoading) {
      alert("Please wait while the production recipe is loading.");
      return;
    }

    if (!hasRecipe) {
      alert(
        "No production recipe exists for the selected finished product."
      );
      return;
    }

    if (hasInsufficientStock) {
      alert(
        "Production cannot be recorded because one or more ingredients have insufficient stock."
      );
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

  function closeModal() {
    if (!loading) {
      setIsOpen(false);
    }
  }

  return (
    <>
      {/* Open Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        + Log Production Run
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
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Log Production Run
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Record a new baking batch and update branch
                    inventory.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  aria-label="Close production modal"
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">
                {/* Branch */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800">
                    Target Branch
                  </label>

                  <p className="mt-1 text-xs text-gray-500">
                    Select where the production will be recorded.
                  </p>

                  <select
                    value={selectedBranch}
                    onChange={(e) =>
                      setSelectedBranch(e.target.value)
                    }
                    required
                    disabled={loading}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
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
                    Select the product that will be added to
                    inventory.
                  </p>

                  <select
                    value={selectedFinishedItem}
                    onChange={(e) =>
                      setSelectedFinishedItem(e.target.value)
                    }
                    required
                    disabled={loading}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
                  >
                    {finishedItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Production Quantity */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800">
                    Production Quantity
                  </label>

                  <p className="mt-1 text-xs text-gray-500">
                    Enter the number of finished products produced.
                  </p>

                  <div className="relative mt-2">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={producedQuantity}
                      onChange={(e) =>
                        setProducedQuantity(
                          Number(e.target.value)
                        )
                      }
                      required
                      disabled={loading}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-16 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
                    />

                    {requiresWholeNumber && (
                      <p className="mt-2 text-xs text-gray-500">
                        This product is measured in{" "}
                        {selectedProduct?.unit}, so production
                        quantity must be a whole number.
                      </p>
                    )}

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
                      {selectedProduct?.unit || "units"}
                    </span>
                  </div>
                </div>

                {/* Actual Production Recipe */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 text-blue-600">ℹ</div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-blue-900">
                        Production Recipe
                      </h3>

                      <p className="mt-1 text-xs leading-relaxed text-blue-800">
                        Required quantities are based on the selected production quantity.
                      </p>

                      {/* Recipe Loading */}
                      {recipeLoading && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-white px-4 py-3">
                          <p className="text-xs text-gray-500">
                            Loading recipe and current stock...
                          </p>
                        </div>
                      )}

                      {/* Recipe Error / No Recipe */}
                      {!recipeLoading && recipeError && (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                          <p className="text-xs leading-relaxed text-amber-800">
                            {recipeError}
                          </p>
                        </div>
                      )}

                      {/* Recipe Table */}
                      {!recipeLoading && hasRecipe && (
                        <div className="mt-4 overflow-hidden rounded-lg border border-blue-200 bg-white">
                          <div className="grid grid-cols-[minmax(0,1.5fr)_0.9fr_0.9fr_auto] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            <span>Ingredient</span>
                            <span>Required</span>
                            <span>Available</span>
                            <span>Status</span>
                          </div>

                          <div className="divide-y divide-gray-100">
                            {calculatedIngredients.map(
                              (ingredient) => (
                                <div
                                  key={ingredient.itemId}
                                  className="grid grid-cols-[minmax(0,1.5fr)_0.9fr_0.9fr_auto] items-center gap-3 px-3 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-gray-800">
                                      {ingredient.name}
                                    </p>

                                    <p className="mt-0.5 text-[11px] text-gray-500">
                                      {ingredient.requiredPerUnit}{" "}
                                      {ingredient.unit} per{" "}
                                      {selectedProduct?.unit ||
                                        "unit"}
                                    </p>
                                  </div>

                                  <p className="text-xs font-medium text-gray-700">
                                  {Number(ingredient.requiredQuantity.toFixed(2))}{" "}
                                  {ingredient.unit}
                                  </p>

                                  <p
                                    className={`text-xs font-medium ${
                                      ingredient.availableQuantity ===
                                        null ||
                                      !ingredient.hasStock
                                        ? "text-red-600"
                                        : "text-gray-700"
                                    }`}
                                  >
                                  {ingredient.availableQuantity === null
                                    ? "No stock"
                                    : `${Number(
                                    ingredient.availableQuantity.toFixed(2)
                                    )} ${ingredient.unit}`}
                                  </p>

                                  <div>
                                    {ingredient.hasStock ? (
                                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-700">
                                        ✓
                                      </span>
                                    ) : (
                                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-sm text-red-600">
                                        !
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Insufficient Stock */}
                      {!recipeLoading &&
                        hasRecipe &&
                        hasInsufficientStock && (
                          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                            <p className="text-xs font-semibold text-red-800">
                              Insufficient ingredient stock
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-red-700">
                              Production cannot be confirmed until
                              all required ingredients have enough
                              stock at the selected branch.
                            </p>
                          </div>
                        )}

                      {/* Ready */}
                      {!recipeLoading &&
                        hasRecipe &&
                        !hasInsufficientStock && (
                          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <p className="text-xs font-semibold text-emerald-800">
                              Ready for production
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                              All required ingredients have
                              sufficient stock.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* Inventory Protection */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Before production
                  </h3>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        ✓
                      </span>
                      Recipe requirements will be calculated.
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        ✓
                      </span>
                      Raw-material stock will be checked first.
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        ✓
                      </span>
                      Finished-product stock will be updated.
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        ✓
                      </span>
                      Production transactions will be recorded.
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs leading-relaxed text-amber-800">
                    <span className="font-semibold">
                      Note:
                    </span>{" "}
                    Production will not be recorded if any required
                    ingredient has insufficient stock.
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
                    recipeLoading ||
                    !selectedBranch ||
                    !selectedFinishedItem ||
                    !isValidProductionQuantity ||
                    !hasRecipe ||
                    hasInsufficientStock
                  }
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Recording Production..."
                    : recipeLoading
                      ? "Loading Recipe..."
                      : hasInsufficientStock
                        ? "Insufficient Stock"
                        : "Confirm Production"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}