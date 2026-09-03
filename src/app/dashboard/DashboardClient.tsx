"use client";

import { useEffect, useState } from "react";

interface DashboardUser {
  id: string;
  username: string;
  role: string;
  branchId: string | null;
  branch: {
    id: string;
    name: string;
    location: string;
  } | null;
}

interface StockRecord {
  id: string;
  branchId: string;
  itemId: string;
  quantity: number;
  item: {
    id: string;
    name: string;
    sourceType: string;
    unit: string;
    minThreshold: number;
  };
  branch: {
    id: string;
    name: string;
    location: string;
  };
}

interface RecentTransaction {
  id: string;
  type: string;
  quantityDelta: number;
  createdAt: string | Date;
  item: {
    name: string;
    unit: string;
  };
  branch: {
    name: string;
  };
  user: {
    username: string;
  };
}

interface AlertItem {
  id: string;
  status: string;
  currentQuantity: number;
  item: {
    id: string;
    name: string;
    unit: string;
    minThreshold: number;
  };
  branch: {
    id: string;
    name: string;
  };
}

interface DashboardClientProps {
  user: DashboardUser;
  totalItems: number;
  activeBranches: number;
  lowStock: number;
  outOfStock: number;
  stockRecords: StockRecord[];
  recentTransactions: RecentTransaction[];
}

function formatQuantity(quantity: number) {
  return Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(2).replace(/\.?0+$/, "");
}

function formatTransactionType(type: string) {
  switch (type) {
    case "SALE":
      return "SALE";
    case "PRODUCTION":
      return "PRODUCTION";
    case "STOCK_RECEIPT":
      return "STOCK RECEIPT";
    case "ADJUSTMENT":
      return "ADJUSTMENT";
    default:
      return type;
  }
}

function getTransactionBadgeClass(type: string) {
  switch (type) {
    case "SALE":
      return "bg-red-50 text-red-700 border-red-200";

    case "PRODUCTION":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "STOCK_RECEIPT":
      return "bg-green-50 text-green-700 border-green-200";

    case "ADJUSTMENT":
      return "bg-gray-50 text-gray-700 border-gray-200";

    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function getStockStatus(quantity: number, threshold: number) {
  if (quantity === 0) {
    return "OUT OF STOCK";
  }

  if (quantity <= threshold) {
    return "LOW STOCK";
  }

  return "NORMAL";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardClient({
  user,
  totalItems,
  activeBranches,
  lowStock,
  outOfStock,
  stockRecords,
  recentTransactions,
}: DashboardClientProps) {
  const today = formatDate(new Date());

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch("/api/dashboard/alerts");

        if (response.ok) {
          const data = await response.json();
          setAlerts(data);
        }
      } catch (error) {
        console.error(
          "Failed to load stock notifications:",
          error
        );
      } finally {
        setLoadingAlerts(false);
      }
    }

    fetchNotifications();
  }, []);

  const branches = Array.from(
    new Map(
      stockRecords.map((stock) => [
        stock.branch.id,
        stock.branch,
      ])
    ).values()
  );

  const inventoryItems = Array.from(
    new Map(
      stockRecords.map((stock) => [
        stock.item.id,
        stock.item,
      ])
    ).values()
  );

  const finishedProducts = inventoryItems.filter(
    (item) => item.sourceType === "FINISHED_PRODUCT"
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Owner Dashboard
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Business-wide inventory overview — {today}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Signed in as{" "}
              <span className="font-semibold text-gray-700">
                {user.username}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/inventory"
              className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-800"
            >
              Manage Inventory
            </a>

            <button
              type="button"
              onClick={async () => {
                try {
                  const response = await fetch(
                    "/api/auth/logout",
                    {
                      method: "POST",
                    }
                  );

                  if (response.ok) {
                    window.location.href = "/";
                  }
                } catch (error) {
                  console.error(
                    "Logout failed:",
                    error
                  );
                }
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Inventory Items
            </p>

            <p className="mt-2 text-3xl font-bold text-purple-700">
              {totalItems}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Across all branches
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Active Branches
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {activeBranches}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Commissary and satellite branches
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Low Stock
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-600">
              {lowStock}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              At or below minimum threshold
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Out of Stock
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {outOfStock}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Zero-quantity entries
            </p>
          </div>

        </div>

        {/* Notifications + Transactions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Stock Notifications */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Stock Notifications
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Items requiring replenishment review
                </p>
              </div>

              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                {alerts.length} active
              </span>
            </div>

            {loadingAlerts ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                Loading notifications...
              </p>
            ) : alerts.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                No active stock notifications.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {alert.item.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {alert.branch.name}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-semibold text-red-700">
                        {formatQuantity(alert.currentQuantity)}{" "}
                        /{" "}
                        {formatQuantity(
                          alert.item.minThreshold
                        )}{" "}
                        {alert.item.unit}
                      </p>

                      <span className="mt-1 inline-block rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        REVIEW NEEDED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </section>

          {/* Recent Transactions */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Recent Transactions
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                Latest inventory activity
              </p>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                No transactions recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTransactions.map((transaction) => {
                  const date = new Date(
                    transaction.createdAt
                  );

                  const isPositive =
                    transaction.quantityDelta > 0;

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-start gap-3 px-5 py-3"
                    >
                      <span
                        className={`shrink-0 rounded border px-2 py-1 text-[10px] font-semibold ${getTransactionBadgeClass(
                          transaction.type
                        )}`}
                      >
                        {formatTransactionType(
                          transaction.type
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-700">
                          {transaction.item.name}{" "}
                          <span
                            className={
                              isPositive
                                ? "font-semibold text-green-600"
                                : "font-semibold text-red-600"
                            }
                          >
                            {isPositive ? "+" : ""}
                            {formatQuantity(
                              transaction.quantityDelta
                            )}{" "}
                            {transaction.item.unit}
                          </span>
                        </p>

                        <p className="text-xs text-gray-400">
                          {transaction.branch.name} ·{" "}
                          {transaction.user.username}
                        </p>
                      </div>

                      <p className="shrink-0 text-xs text-gray-400">
                        {date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

          </section>

        </div>

        {/* Inventory by Branch */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Inventory by Branch — Summary
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Item
                  </th>

                  {branches.map((branch) => (
                    <th
                      key={branch.id}
                      className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {branch.name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {inventoryItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.name}
                    </td>

                    {branches.map((branch) => {
                      const stock = stockRecords.find(
                        (record) =>
                          record.itemId === item.id &&
                          record.branchId === branch.id
                      );

                      const quantity =
                        stock?.quantity ?? null;

                      const status =
                        quantity === null
                          ? "NORMAL"
                          : getStockStatus(
                              quantity,
                              item.minThreshold
                            );

                      return (
                        <td
                          key={branch.id}
                          className="px-4 py-3 text-center"
                        >
                          {quantity === null ? (
                            <span className="text-gray-300">
                              —
                            </span>
                          ) : (
                            <div>
                              <span
                                className={`font-mono text-sm font-semibold ${
                                  status === "OUT OF STOCK"
                                    ? "text-red-600"
                                    : status === "LOW STOCK"
                                    ? "text-amber-600"
                                    : "text-gray-700"
                                }`}
                              >
                                {formatQuantity(quantity)}
                              </span>

                              <span className="ml-1 text-xs text-gray-400">
                                {item.unit}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>

        {/* Finished Products */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Finished Product Stock by Branch
            </h2>
          </div>

          {finishedProducts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              No finished products found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Product
                    </th>

                    {branches.map((branch) => (
                      <th
                        key={branch.id}
                        className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        {branch.name}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {finishedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {product.name}
                      </td>

                      {branches.map((branch) => {
                        const stock =
                          stockRecords.find(
                            (record) =>
                              record.itemId === product.id &&
                              record.branchId === branch.id
                          );

                        return (
                          <td
                            key={branch.id}
                            className="px-4 py-3 text-center"
                          >
                            {stock ? (
                              <>
                                <span className="font-mono font-semibold text-gray-700">
                                  {formatQuantity(
                                    stock.quantity
                                  )}
                                </span>

                                <span className="ml-1 text-xs text-gray-400">
                                  {product.unit}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-300">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>

      </div>
    </main>
  );
}