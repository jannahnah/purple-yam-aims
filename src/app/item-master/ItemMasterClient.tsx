"use client";

import { useEffect, useMemo, useState } from "react";

type SourceType =
  | "COMMISSARY_SUPPLIED"
  | "BRANCH_SOURCED"
  | "FINISHED_PRODUCT";

type Category = "RAW_MATERIAL" | "PACKAGING";

type RecipeIngredient = {
  id: string;
  requiredQuantity: number;
  ingredientItem: {
    id: string;
    name: string;
    unit: string;
    sourceType: SourceType;
    category: Category;
  };
};

type Item = {
  id: string;
  name: string;
  sourceType: SourceType;
  category: Category;
  size: "SMALL" | "ROUND" | "MEDIUM" | "LARGE" | null;
  isActive: boolean;
  unit: string;
  minThreshold: number;
  recipeAsFinished: RecipeIngredient[];
  _count: {
    branchStocks: number;
    stockTransactions: number;
  };
};

const SOURCE_LABELS: Record<SourceType, string> = {
  COMMISSARY_SUPPLIED: "Commissary Supplied",
  BRANCH_SOURCED: "Branch Sourced",
  FINISHED_PRODUCT: "Finished Product",
};

function getCategoryLabel(item: Item) {
  return item.sourceType === "FINISHED_PRODUCT"
    ? "Finished Product"
    : item.category === "PACKAGING"
      ? "Packaging"
      : "Raw Material";
}

function sourceBadgeClass(sourceType: SourceType) {
  switch (sourceType) {
    case "FINISHED_PRODUCT":
      return "bg-emerald-100 text-emerald-700";
    case "COMMISSARY_SUPPLIED":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function createEmptyItemForm() {
  return {
    id: "",
    name: "",
    sourceType: "BRANCH_SOURCED" as SourceType,
    category: "RAW_MATERIAL" as Category,
    size: "" as "" | "SMALL" | "ROUND" | "MEDIUM" | "LARGE",
    unit: "pcs",
    minThreshold: "0",
  };
}

type ItemForm = ReturnType<typeof createEmptyItemForm>;

type RecipeRow = {
  itemId: string;
  requiredQuantity: string;
};

export default function ItemMasterClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>(
    createEmptyItemForm()
  );

  const [selectedFinishedId, setSelectedFinishedId] = useState("");
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [recipeMessage, setRecipeMessage] = useState("");
  const [toasts, setToasts] = useState<
    Array<{ id: number; type: "success" | "error"; message: string }>
  >([]);

  const activeItems = useMemo(
    () => items.filter((item) => item.isActive),
    [items]
  );

  const archivedItems = useMemo(
    () => items.filter((item) => !item.isActive),
    [items]
  );

  const finishedProducts = useMemo(
    () =>
      activeItems.filter(
        (item) => item.sourceType === "FINISHED_PRODUCT"
      ),
    [activeItems]
  );

  const recipeIngredients = useMemo(
    () =>
      activeItems.filter(
        (item) => item.sourceType !== "FINISHED_PRODUCT"
      ),
    [activeItems]
  );

  function showToast(
    type: "success" | "error",
    message: string
  ) {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setToasts((current) => [
      ...current,
      { id, type, message },
    ]);

    window.setTimeout(() => {
      setToasts((current) =>
        current.filter((toast) => toast.id !== id)
      );
    }, 3500);
  }

  async function loadItems() {
    const response = await fetch("/api/item-master", {
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load Item Master.");
    }

    setItems(data);
  }

  useEffect(() => {
    let active = true;

    loadItems()
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load Item Master."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedFinishedId) {
      setRecipeRows([]);
      return;
    }

    const finished = finishedProducts.find(
      (item) => item.id === selectedFinishedId
    );

    setRecipeRows(
      finished?.recipeAsFinished.map((entry) => ({
        itemId: entry.ingredientItem.id,
        requiredQuantity: String(entry.requiredQuantity),
      })) ?? []
    );
    setRecipeMessage("");
  }, [selectedFinishedId, finishedProducts]);

  function openCreateItem() {
    setItemForm(createEmptyItemForm());
    setError("");
    setSuccess("");
    setShowItemModal(true);
  }

  function openEditItem(item: Item) {
    setItemForm({
      id: item.id,
      name: item.name,
      sourceType: item.sourceType,
      category: item.sourceType === "FINISHED_PRODUCT"
        ? "RAW_MATERIAL"
        : item.category,
      size: item.size ?? "",
      unit: item.unit,
      minThreshold: String(item.minThreshold),
    });
    setError("");
    setSuccess("");
    setShowItemModal(true);
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/item-master", {
        method: itemForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...itemForm,
          minThreshold: Number(itemForm.minThreshold),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save item.");
      }

      await loadItems();
      setShowItemModal(false);

      const message = itemForm.id
        ? "Item updated successfully."
        : itemForm.sourceType === "FINISHED_PRODUCT"
          ? "Finished product added successfully."
          : "Item added successfully.";

      setSuccess(message);
      showToast("success", message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save item.";
      setError(message);
      showToast("error", message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteItem(item: Item) {
    const label =
      item.size
        ? `${item.name} — ${item.size.charAt(0) + item.size.slice(1).toLowerCase()}`
        : item.name;

    if (
      !window.confirm(
        `Delete "${label}" from the active Item Master? Historical records will be preserved.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/item-master?id=${encodeURIComponent(item.id)}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete item."
        );
      }

      await loadItems();
      showToast("success", "Item deleted successfully.");
      setSuccess("Item deleted successfully.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to delete item.";
      showToast("error", message);
      setError(message);
    }
  }

  async function handleRestoreItem(item: Item) {
    try {
      const response = await fetch("/api/item-master", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          action: "restore",
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to restore item."
        );
      }

      await loadItems();
      showToast("success", "Item restored successfully.");
      setSuccess("Item restored successfully.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to restore item.";
      showToast("error", message);
      setError(message);
    }
  }

  function addRecipeRow() {
    const firstUnused =
      recipeIngredients.find(
        (item) =>
          !recipeRows.some((row) => row.itemId === item.id)
      ) ?? recipeIngredients[0];

    if (!firstUnused) return;

    setRecipeRows((rows) => [
      ...rows,
      {
        itemId: firstUnused.id,
        requiredQuantity: "1",
      },
    ]);
  }

  function updateRecipeRow(
    index: number,
    field: keyof RecipeRow,
    value: string
  ) {
    setRecipeRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [field]: value }
          : row
      )
    );
  }

  function removeRecipeRow(index: number) {
    setRecipeRows((rows) =>
      rows.filter((_, rowIndex) => rowIndex !== index)
    );
  }

  async function saveRecipe() {
    if (!selectedFinishedId) {
      setRecipeMessage("Select a finished product first.");
      return;
    }

    const ingredients = recipeRows.map((row) => ({
      itemId: row.itemId,
      requiredQuantity: Number(row.requiredQuantity),
    }));

    if (
      ingredients.length === 0 ||
      ingredients.some(
        (row) =>
          !row.itemId ||
          !Number.isFinite(row.requiredQuantity) ||
          row.requiredQuantity <= 0
      )
    ) {
      setRecipeMessage(
        "Every recipe row needs an ingredient and a quantity greater than zero."
      );
      return;
    }

    setRecipeSaving(true);
    setRecipeMessage("");

    try {
      const response = await fetch(
        "/api/inventory/production-recipe",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finishedItemId: selectedFinishedId,
            ingredients,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save recipe.");
      }

      await loadItems();

      // Return the builder to a clean "Select finished product" state
      // after the recipe is safely persisted.
      setSelectedFinishedId("");
      setRecipeRows([]);
      setRecipeMessage("");
      setSuccess("Recipe saved successfully.");
      showToast("success", "Recipe saved successfully.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to save recipe.";
      setRecipeMessage(message);
      showToast("error", message);
    } finally {
      setRecipeSaving(false);
    }
  }

  async function clearRecipe() {
    if (!selectedFinishedId) return;

    setRecipeSaving(true);
    setRecipeMessage("");

    try {
      const response = await fetch(
        `/api/inventory/production-recipe?finishedItemId=${encodeURIComponent(
          selectedFinishedId
        )}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to clear recipe.");
      }

      await loadItems();
      setRecipeMessage("Recipe cleared.");
      showToast("success", "Recipe cleared successfully.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to clear recipe.";
      setRecipeMessage(message);
      showToast("error", message);
    } finally {
      setRecipeSaving(false);
    }
  }

  return (
    <div className="aims-page p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-600">
              Owner Controls
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Item Master
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Create finished products, maintain inventory items, configure reorder thresholds,
              and define approved production recipes without hard-coding formulations.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateItem}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800"
          >
            + Add Item
          </button>
        </div>

        {(error || success) && (
          <div
            className={
              error
                ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                : "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            }
          >
            {error || success}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="aims-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Total Items
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {activeItems.length}
            </p>
          </div>
          <div className="aims-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Finished Products
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {finishedProducts.length}
            </p>
          </div>
          <div className="aims-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Configured Recipes
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {finishedProducts.filter((item) => item.recipeAsFinished.length > 0).length}
            </p>
          </div>
        </div>

        <section className="aims-card overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Item Master Records
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Owner-managed names, source types, categories, units, and reorder thresholds.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="aims-table min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Item", "Size", "Type", "Category", "Unit", "Threshold", "Recipe", "Action"].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">
                      Loading Item Master...
                    </td>
                  </tr>
                ) : activeItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">
                      No items found.
                    </td>
                  </tr>
                ) : (
                  activeItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {item.size
                          ? item.size.charAt(0) + item.size.slice(1).toLowerCase()
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sourceBadgeClass(item.sourceType)}`}>
                          {SOURCE_LABELS[item.sourceType]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {getCategoryLabel(item)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{item.unit}</td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-700">
                        {item.minThreshold}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {item.sourceType === "FINISHED_PRODUCT"
                          ? item.recipeAsFinished.length
                            ? `${item.recipeAsFinished.length} ingredients`
                            : "Not configured"
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditItem(item)}
                            title="Edit item"
                            aria-label={`Edit ${item.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            title="Delete item"
                            aria-label={`Delete ${item.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v5" />
                              <path d="M14 11v5" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 text-xs text-gray-500">
            Delete removes the item from active use while preserving its audit and transaction history.
            Items with remaining stock or active recipes cannot be deleted.
          </div>
        </section>

        {archivedItems.length > 0 && (
          <section className="aims-card overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-700">
                Deleted Items
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Deleted items remain stored for audit history and can be restored.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="aims-table min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Item", "Size", "Type", "Unit", "Action"].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {archivedItems.map((item) => (
                    <tr key={item.id} className="bg-gray-50/70">
                      <td className="px-5 py-4 font-medium text-gray-700">
                        {item.name}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {item.size
                          ? item.size.charAt(0) +
                            item.size.slice(1).toLowerCase()
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {SOURCE_LABELS[item.sourceType]}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {item.unit}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleRestoreItem(item)}
                          title="Restore item"
                          aria-label={`Restore ${item.name}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-green-100 bg-green-50 text-green-700 transition hover:bg-green-100"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M9 14 4 9l5-5" />
                            <path d="M4 9h9a6 6 0 0 1 6 6v1" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        <section className="aims-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Production Recipe Builder
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Define the fixed quantity of each component consumed per one finished product.
              </p>
            </div>

            <select
              value={selectedFinishedId}
              onChange={(event) => setSelectedFinishedId(event.target.value)}
              className="aims-control min-w-64 px-3 text-sm"
            >
              <option value="">Select finished product</option>
              {finishedProducts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {selectedFinishedId ? (
            <div className="mt-5 space-y-4">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Component
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Quantity per {finishedProducts.find((item) => item.id === selectedFinishedId)?.unit || "unit"}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recipeRows.map((row, index) => {
                      const ingredient = recipeIngredients.find(
                        (item) => item.id === row.itemId
                      );
                      return (
                        <tr key={`${row.itemId}-${index}`}>
                          <td className="px-4 py-3">
                            <select
                              value={row.itemId}
                              onChange={(event) =>
                                updateRecipeRow(index, "itemId", event.target.value)
                              }
                              className="aims-control w-full min-w-56 px-3 text-sm"
                            >
                              {recipeIngredients.map((item) => (
                                <option
                                  key={item.id}
                                  value={item.id}
                                  disabled={recipeRows.some(
                                    (other, otherIndex) =>
                                      otherIndex !== index && other.itemId === item.id
                                  )}
                                >
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0.0001"
                              step="any"
                              value={row.requiredQuantity}
                              onChange={(event) =>
                                updateRecipeRow(index, "requiredQuantity", event.target.value)
                              }
                              className="aims-control w-40 px-3 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {ingredient?.unit ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeRecipeRow(index)}
                              className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {!recipeRows.length && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                          No recipe components configured yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addRecipeRow}
                  disabled={recipeRows.length >= recipeIngredients.length}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Add Component
                </button>

                <button
                  type="button"
                  onClick={saveRecipe}
                  disabled={recipeSaving || !recipeRows.length}
                  className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {recipeSaving ? "Saving..." : "Save Recipe"}
                </button>

                <button
                  type="button"
                  onClick={clearRecipe}
                  disabled={recipeSaving || !recipeRows.length}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear Recipe
                </button>

                {recipeMessage && (
                  <span className="self-center text-sm text-gray-600">
                    {recipeMessage}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-gray-700">
                Select a finished product to configure its recipe.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Production will remain blocked until the selected product has a recipe.
              </p>
            </div>
          )}
        </section>
      </div>

      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[200] flex w-[min(92vw,420px)] flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={
                toast.type === "success"
                  ? "flex items-start gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800 shadow-xl"
                  : "flex items-start gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-800 shadow-xl"
              }
              role="status"
            >
              <span
                className={
                  toast.type === "success"
                    ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100"
                    : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100"
                }
              >
                {toast.type === "success" ? "✓" : "!"}
              </span>
              <p className="leading-relaxed">{toast.message}</p>
            </div>
          ))}
        </div>
      )}

      {showItemModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900">
                {itemForm.id ? "Edit Item" : "Add Item"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Finished products are created here; recipes are configured below.
              </p>
            </div>

            <form onSubmit={saveItem}>
              <div className="space-y-4 px-6 py-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Item Name
                  </label>
                  <input
                    value={itemForm.name}
                    onChange={(event) =>
                      setItemForm((form) => ({ ...form, name: event.target.value }))
                    }
                    className="aims-control w-full px-3 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Source Type
                  </label>
                  <select
                    value={itemForm.sourceType}
                    onChange={(event) =>
                      setItemForm((form) => ({
                        ...form,
                        sourceType: event.target.value as SourceType,
                        category:
                          event.target.value === "FINISHED_PRODUCT"
                            ? "RAW_MATERIAL"
                            : form.category,
                        size:
                          event.target.value === "FINISHED_PRODUCT"
                            ? form.size
                            : "",
                      }))
                    }
                    className="aims-control w-full px-3 text-sm"
                  >
                    <option value="COMMISSARY_SUPPLIED">Commissary Supplied</option>
                    <option value="BRANCH_SOURCED">Branch Sourced</option>
                    <option value="FINISHED_PRODUCT">Finished Product</option>
                  </select>
                </div>

                {itemForm.sourceType === "FINISHED_PRODUCT" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Finished Product Size
                    </label>
                    <select
                      value={itemForm.size}
                      onChange={(event) =>
                        setItemForm((form) => ({
                          ...form,
                          size: event.target.value as ItemForm["size"],
                        }))
                      }
                      className="aims-control w-full px-3 text-sm"
                      required
                    >
                      <option value="">Select size</option>
                      <option value="SMALL">Small</option>
                      <option value="ROUND">Round</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LARGE">Large</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-400">
                      Each finished-product size is a separate stock and recipe record.
                    </p>
                  </div>
                )}

                {itemForm.sourceType !== "FINISHED_PRODUCT" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      value={itemForm.category}
                      onChange={(event) =>
                        setItemForm((form) => ({
                          ...form,
                          category: event.target.value as Category,
                        }))
                      }
                      className="aims-control w-full px-3 text-sm"
                    >
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="PACKAGING">Packaging</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Unit
                  </label>
                  <input
                    value={itemForm.unit}
                    onChange={(event) =>
                      setItemForm((form) => ({ ...form, unit: event.target.value }))
                    }
                    placeholder="pcs, pack, can, kg..."
                    className="aims-control w-full px-3 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Minimum Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={itemForm.minThreshold}
                    onChange={(event) =>
                      setItemForm((form) => ({
                        ...form,
                        minThreshold: event.target.value,
                      }))
                    }
                    className="aims-control w-full px-3 text-sm"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Owner-defined level used to trigger reorder review.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
