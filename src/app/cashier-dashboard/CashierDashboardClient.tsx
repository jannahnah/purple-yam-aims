"use client";

import Link from "next/link";

interface FinishedItem {
  id: string;
  name: string;
  unit: string;
  sourceType: string;
}

interface BranchStock {
  branchId: string;
  itemId: string;
  quantity: number;
  item: FinishedItem;
}

interface RecentSale {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  createdAt: string;
}

interface Props {
  user: {
    id: string;
    username: string;
    name: string | null;
    role: string;
    branchId: string;
    branchName: string;
  };

  branch: {
    id: string;
    name: string;
  };

  finishedItems: FinishedItem[];

  branchStock: BranchStock[];

  stats: {
    todaySalesCount: number;
    totalToday: number;
    availableProducts: number;
    totalProducts: number;
  };

  recentSales: RecentSale[];
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStockStatus(quantity: number) {
  if (quantity === 0) {
    return {
      label: "Out of Stock",
      className:
        "border-red-200 bg-red-50 text-red-600",
    };
  }

  if (quantity <= 3) {
    return {
      label: "Low",
      className:
        "border-amber-200 bg-amber-50 text-amber-600",
    };
  }

  return {
    label: "Available",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-600",
  };
}

export default function CashierDashboardClient({
  user,
  branch,
  finishedItems,
  branchStock,
  stats,
  recentSales,
}: Props) {
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const stockMap = new Map(
    branchStock.map((stock) => [
      stock.itemId,
      stock,
    ])
  );

  return (
    <div className="aims-page px-6 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="aims-title">
            Cashier Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {user.name?.trim() || user.username}
            {" · "}
            {branch.name}
            {" · "}
            {today}
          </p>
        </div>

        {/* Quick Action */}
        <div className="flex items-center justify-between gap-5 rounded-2xl bg-purple-700 p-7 text-white shadow-sm">
          <div>
            <p className="mb-1 text-sm font-medium text-purple-200">
              Record a Sale
            </p>

            <p className="text-2xl font-bold">
              New Transaction
            </p>

            <p className="mt-1 text-xs text-purple-300">
              Select a product and enter the quantity
              sold.
            </p>
          </div>

          <Link
            href="/sales"
            className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 active:scale-95"
          >
            Record Sale →
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Today&apos;s Sales
            </p>

            <p className="mt-2 text-4xl font-bold text-purple-700">
              {stats.todaySalesCount}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              {stats.totalToday} units total
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Products Available
            </p>

            <p className="mt-2 text-4xl font-bold text-gray-900">
              {stats.availableProducts}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Out of {stats.totalProducts} products
            </p>
          </div>
        </div>

        {/* Product Availability */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Product Availability — {branch.name}
            </h2>
          </div>

          {finishedItems.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-500">
                No finished products are currently
                configured.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {finishedItems.map((product) => {
                const stock =
                  stockMap.get(product.id);

                const quantity =
                  stock?.quantity ?? 0;

                const status =
                  getStockStatus(quantity);

                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {product.name}
                    </span>

                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono text-sm font-semibold ${
                          quantity === 0
                            ? "text-red-600"
                            : quantity <= 3
                              ? "text-amber-600"
                              : "text-gray-700"
                        }`}
                      >
                        {quantity} {product.unit}
                      </span>

                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Sales */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Recent Sales — {branch.name}
            </h2>
          </div>

          {recentSales.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">
              No sales recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {sale.itemName}
                    </p>

                    <p className="text-xs text-gray-400">
                      {formatDateTime(
                        sale.createdAt
                      )}
                    </p>
                  </div>

                  <span className="font-mono text-sm font-semibold text-gray-700">
                    {sale.quantity} {sale.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}