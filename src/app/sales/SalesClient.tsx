"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { recordSale } from "@/app/actions/sales";
import { formatItemLabel } from "@/lib/item-label";

type SalesUser = {
  username: string;
  name?: string | null;
  branchId: string;
  branchName: string;
};

type Product = {
  id: string;
  name: string;
  size?: "SMALL" | "ROUND" | "MEDIUM" | "LARGE" | null;
  unit: string;
};

type StockRecord = {
  itemId: string;
  quantity: number;
};

type SalesHistoryRecord = {
  id: string;
  productName: string;
  size?: "SMALL" | "ROUND" | "MEDIUM" | "LARGE" | null;
  unit: string;
  quantity: number;
  createdAt: string | Date;
};

type SalesClientProps = {
  user: SalesUser;
  products?: Product[];
  stock?: StockRecord[];
  salesHistory?: SalesHistoryRecord[];
};

export default function SalesClient({
  user,
  products = [],
  stock = [],
  salesHistory = [],
}: SalesClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "quick-record" | "sales-history"
  >("quick-record");

  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? ""
  );

  const [soldQuantity, setSoldQuantity] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const selectedProduct = useMemo(() => {
    return products.find(
      (product) => product.id === selectedProductId
    );
  }, [products, selectedProductId]);

  const availableStock = useMemo(() => {
    return (
      stock.find(
        (stockRecord) =>
          stockRecord.itemId === selectedProductId
      )?.quantity ?? 0
    );
  }, [stock, selectedProductId]);

  const parsedQuantity = Number(soldQuantity);

  const isValidQuantity =
    soldQuantity.trim() !== "" &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    parsedQuantity <= availableStock;

  const remainingStock = Math.max(
    availableStock -
      (Number.isFinite(parsedQuantity) ? parsedQuantity : 0),
    0
  );

  function handleProductChange(productId: string) {
    setSelectedProductId(productId);
    setSoldQuantity("");
    setIsReviewing(false);
    setMessage("");
  }

  function handleQuantityChange(value: string) {
    setSoldQuantity(value);
    setIsReviewing(false);
    setMessage("");
  }

  function handleReviewSale() {
    setMessage("");

    if (products.length === 0) {
      setMessage("No finished products are available.");
      return;
    }

    if (!selectedProductId) {
      setMessage("Please select a finished product.");
      return;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setMessage(
        "Please enter a whole-number quantity greater than zero."
      );
      return;
    }

    if (parsedQuantity > availableStock) {
      setMessage(
        `Insufficient stock. Available stock is ${availableStock} ${
          selectedProduct?.unit ?? "units"
        }.`
      );
      return;
    }

    setIsReviewing(true);
  }

  function handleBackToForm() {
    setIsReviewing(false);
    setMessage("");
  }

  async function handleConfirmSale() {
    if (!selectedProduct || !isValidQuantity) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await recordSale({
        branchId: user.branchId,
        finishedItemId: selectedProduct.id,
        soldQuantity: parsedQuantity,
      });

      setMessage("Sale recorded successfully.");
      setSoldQuantity("");
      setIsReviewing(false);

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to record sale."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatDate(value: string | Date) {
    return new Date(value).toLocaleString();
  }

  return (
    <div className="min-h-screen bg-[#f8f8fb]">
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        {/* Page Title and Action */}
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-950">
              Sales
            </h1>

            <p className="mt-2 text-base text-gray-500">
              Record sales transactions and view sales history.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 inline-flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("quick-record");
              setMessage("");
            }}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === "quick-record"
                ? "bg-white text-gray-950 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Quick Record
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("sales-history");
              setIsReviewing(false);
              setMessage("");
            }}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === "sales-history"
                ? "bg-white text-gray-950 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Sales History
          </button>
        </div>

        {/* Quick Record Tab */}
        {activeTab === "quick-record" && (
          <div className="mt-8 grid gap-7 lg:grid-cols-2">
            {/* Record Sale Card */}
            <section className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
              {!isReviewing ? (
                <>
                  <div>
                    <h2 className="text-xl font-bold text-gray-950">
                      Record New Sale
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                      Record a completed sale for {user.branchName}.
                    </p>
                  </div>

                  <div className="mt-8 space-y-6">
                    {/* Branch */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Branch
                      </label>

                      <p className="mt-3 text-base font-semibold text-gray-950">
                        {user.branchName}
                      </p>

                      <p className="mt-2 text-xs text-gray-500">
                        Cashiers can only record sales for their
                        assigned branch.
                      </p>
                    </div>

                    {/* Product */}
                    <div>
                      <label
                        htmlFor="sales-product"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Product
                      </label>

                      <select
                        id="sales-product"
                        value={selectedProductId}
                        onChange={(event) =>
                          handleProductChange(event.target.value)
                        }
                        disabled={
                          isSubmitting || products.length === 0
                        }
                        className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100"
                      >
                        {products.length === 0 && (
                          <option value="">
                            No finished products available
                          </option>
                        )}

                        {products.map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                          >
                            {formatItemLabel(product)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label
                          htmlFor="sales-quantity"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Quantity
                        </label>

                        <span className="text-xs text-gray-400">
                          max {availableStock}
                        </span>
                      </div>

                      <div className="relative mt-3">
                        <input
                          id="sales-quantity"
                          type="number"
                          min="1"
                          max={availableStock}
                          step="1"
                          value={soldQuantity}
                          onChange={(event) =>
                            handleQuantityChange(event.target.value)
                          }
                          placeholder="Enter quantity"
                          disabled={
                            isSubmitting || products.length === 0
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-16 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100"
                        />

                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                          {selectedProduct?.unit ?? "units"}
                        </span>
                      </div>
                    </div>

                    {/* Validation Message */}
                    {message && (
                      <div
                        className={`rounded-xl border px-4 py-3 text-sm ${
                          message.includes("successfully")
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {message}
                      </div>
                    )}

                    {/* Review Button */}
                    <button
                      type="button"
                      onClick={handleReviewSale}
                      disabled={
                        isSubmitting ||
                        products.length === 0 ||
                        !selectedProductId
                      }
                      className="w-full rounded-xl bg-purple-700 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Review Sale →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-bold text-gray-950">
                      Review Sale
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                      Check the inventory change before confirming.
                    </p>
                  </div>

                  <div className="mt-8 space-y-5">
                    {/* Product */}
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
                      <span className="text-sm text-gray-500">
                        Product
                      </span>

                      <span className="text-right text-sm font-semibold text-gray-950">
                        {selectedProduct ? formatItemLabel(selectedProduct) : "Unknown product"}
                      </span>
                    </div>

                    {/* Current Stock */}
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
                      <span className="text-sm text-gray-500">
                        Current stock
                      </span>

                      <span className="text-sm font-semibold text-gray-950">
                        {availableStock}{" "}
                        {selectedProduct?.unit ?? "units"}
                      </span>
                    </div>

                    {/* Quantity Sold */}
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
                      <span className="text-sm text-gray-500">
                        Quantity sold
                      </span>

                      <span className="text-sm font-semibold text-red-600">
                        -{parsedQuantity}{" "}
                        {selectedProduct?.unit ?? "units"}
                      </span>
                    </div>

                    {/* Remaining Stock */}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-gray-700">
                        Remaining stock
                      </span>

                      <span className="text-lg font-bold text-gray-950">
                        {remainingStock}{" "}
                        {selectedProduct?.unit ?? "units"}
                      </span>
                    </div>

                    {/* Confirmation Message */}
                    {message && (
                      <div
                        className={`rounded-xl border px-4 py-3 text-sm ${
                          message.includes("successfully")
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {message}
                      </div>
                    )}

                    {/* Review Actions */}
                    <div className="grid gap-3 pt-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleBackToForm}
                        disabled={isSubmitting}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ← Back
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmSale}
                        disabled={
                          isSubmitting || !isValidQuantity
                        }
                        className="rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting
                          ? "Recording..."
                          : "Confirm Sale"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Product Availability Card */}
            <section className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
              <h2 className="text-xl font-bold text-gray-950">
                Product Availability —{" "}
                {user.branchName.replace("Purple Yam - ", "")}
              </h2>

              <div className="mt-7 space-y-4">
                {products.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                    No finished products are currently available.
                  </div>
                ) : (
                  products.map((product) => {
                    const quantity =
                      stock.find(
                        (stockRecord) =>
                          stockRecord.itemId === product.id
                      )?.quantity ?? 0;

                    const isSelected =
                      product.id === selectedProductId;

                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() =>
                          handleProductChange(product.id)
                        }
                        className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-5 text-left transition ${
                          isSelected
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 bg-gray-50 hover:border-purple-200 hover:bg-purple-50/50"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              isSelected
                                ? "bg-purple-500"
                                : "bg-gray-300"
                            }`}
                          />

                          <span className="truncate text-sm font-semibold text-gray-900">
                            {formatItemLabel(product)}
                          </span>
                        </div>

                        <span className="shrink-0 text-sm font-semibold text-gray-900">
                          {quantity}{" "}
                          <span className="font-normal text-gray-400">
                            {product.unit}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}

        {/* Sales History Tab */}
        {activeTab === "sales-history" && (
          <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">
              Sales History
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Sales recorded for {user.branchName}.
            </p>

            <div className="mt-7 overflow-x-auto">
              {salesHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center text-sm text-gray-500">
                  No sales transactions have been recorded yet.
                </div>
              ) : (
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 font-semibold">
                        Product
                      </th>

                      <th className="px-4 py-3 font-semibold">
                        Quantity
                      </th>

                      <th className="px-4 py-3 font-semibold">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {salesHistory.map((sale) => (
                      <tr
                        key={sale.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-4 py-4 font-medium text-gray-900">
                          {formatItemLabel({
                            name: sale.productName,
                            size: sale.size,
                          })}
                        </td>

                        <td className="px-4 py-4 font-semibold text-red-600">
                          -{sale.quantity} {sale.unit}
                        </td>

                        <td className="px-4 py-4 text-gray-500">
                          {formatDate(sale.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}