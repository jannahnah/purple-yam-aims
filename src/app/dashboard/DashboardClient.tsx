"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Role = "OWNER" | "BRANCH_MANAGER" | "CASHIER";

type DashboardUser = {
  id: string;
  username: string;
  name?: string | null;
  role: Role;
  branchId: string | null;
  branch?: {
    id: string;
    name: string;
  } | null;
};

type StockRecord = {
  id: string;
  branchId: string;
  itemId: string;
  quantity: number;
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
};

type RecentTransaction = {
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
};

type AlertItem = {
  id: string;
  status: string;
  currentQuantity: number;
  createdAt: string | Date;
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
};

type DashboardClientProps = {
  user: DashboardUser;
  totalItems: number;
  activeBranches: number;
  lowStock: number;
  outOfStock: number;
  stockRecords: StockRecord[];
  recentTransactions: RecentTransaction[];
};

function formatQuantity(quantity: number) {
  return Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(2).replace(/\.?0+$/, "");
}

function formatTransactionType(type: string) {
  return type.replaceAll("_", " ");
}

function formatTransactionQuantity(quantity: number) {
  return quantity > 0
    ? `+${formatQuantity(quantity)}`
    : formatQuantity(quantity);
}

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
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
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAlerts() {
      try {
        const response = await fetch("/api/dashboard/alerts", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load alerts");
        }

        const data: AlertItem[] = await response.json();

        if (isMounted) {
          setAlerts(data);
        }
      } catch (error) {
        console.error("Failed to load dashboard alerts:", error);

        if (isMounted) {
          setAlerts([]);
        }
      } finally {
        if (isMounted) {
          setLoadingAlerts(false);
        }
      }
    }

    loadAlerts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const stockByBranch = stockRecords.reduce<
    Record<string, Record<string, StockRecord>>
  >((result, stock) => {
    if (!result[stock.item.name]) {
      result[stock.item.name] = {};
    }

    result[stock.item.name][stock.branch.name] = stock;

    return result;
  }, {});

  const branchNames = Array.from(
    new Set(stockRecords.map((stock) => stock.branch.name)),
  );

  const itemNames = Array.from(
    new Set(stockRecords.map((stock) => stock.item.name)),
  );

  const finishedProductRecords = stockRecords.filter((stock) =>
    stock.item.name.toLowerCase().includes("finished"),
  );

  const finishedProductNames = Array.from(
    new Set(
      finishedProductRecords.map((stock) => stock.item.name),
    ),
  );

  const activeAlertCount = alerts.length;

  return (
    <div className="aims-page">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              Business-wide inventory overview —{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <h1 className="mt-1 aims-title">
              Owner Dashboard
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Signed in as{" "}
              <span className="font-semibold text-gray-700">
                {user.name?.trim() || user.username}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() =>
                  setIsNotificationOpen((currentValue) => !currentValue)
                }
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                aria-label="Open stock notifications"
                aria-expanded={isNotificationOpen}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>

                {activeAlertCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {activeAlertCount > 99 ? "99+" : activeAlertCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        Stock Alerts
                      </h2>

                      <p className="text-xs text-gray-500">
                        {activeAlertCount} active{" "}
                        {activeAlertCount === 1 ? "alert" : "alerts"}
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      Reorder review
                    </span>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {loadingAlerts ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        Loading alerts...
                      </div>
                    ) : alerts.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        No active stock alerts.
                      </div>
                    ) : (
                      alerts.map((alert) => {
                        const isOutOfStock = alert.currentQuantity <= 0;

                        return (
                          <Link
                            key={alert.id}
                            href="/reorder-alerts"
                            onClick={() => setIsNotificationOpen(false)}
                            className="block border-b border-gray-100 px-4 py-4 transition hover:bg-purple-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-900">
                                  {alert.item.name}
                                </p>

                                <p className="mt-1 truncate text-xs text-gray-500">
                                  {alert.branch.name}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                  isOutOfStock
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {isOutOfStock
                                  ? "Out of stock"
                                  : "Low stock"}
                              </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className="text-gray-500">
                                Current stock
                              </span>

                              <span className="font-semibold text-gray-800">
                                {formatQuantity(alert.currentQuantity)} /{" "}
                                {formatQuantity(alert.item.minThreshold)}{" "}
                                {alert.item.unit}
                              </span>
                            </div>

                            <p className="mt-3 text-xs font-semibold text-purple-700">
                              Click to view reorder alerts →
                            </p>
                          </Link>
                        );
                      })
                    )}
                  </div>

                  <Link
                    href="/reorder-alerts"
                    onClick={() => setIsNotificationOpen(false)}
                    className="block bg-gray-50 px-4 py-3 text-center text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
                  >
                    View all alerts →
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      <main className="space-y-8 p-4 sm:p-6 lg:p-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Inventory Items
            </p>

            <p className="mt-3 text-3xl font-bold text-gray-900">
              {totalItems}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Across all branches
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Active Branches
            </p>

            <p className="mt-3 text-3xl font-bold text-gray-900">
              {activeBranches}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Commissary and satellite branches
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Low Stock
            </p>

            <p className="mt-3 text-3xl font-bold text-amber-600">
              {lowStock}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              At or below minimum threshold
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Out of Stock
            </p>

            <p className="mt-3 text-3xl font-bold text-red-600">
              {outOfStock}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Zero-quantity entries
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Stock Notifications
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Items requiring replenishment review
              </p>
            </div>

            <Link
              href="/reorder-alerts"
              className="text-sm font-semibold text-purple-700 hover:text-purple-900"
            >
              {activeAlertCount} active
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {alerts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                No active stock notifications.
              </div>
            ) : (
              alerts.map((alert) => {
                const isOutOfStock = alert.currentQuantity <= 0;

                return (
                  <Link
                    key={alert.id}
                    href="/reorder-alerts"
                    className="flex flex-col gap-3 px-5 py-4 transition hover:bg-purple-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {alert.item.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {alert.branch.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="text-sm font-semibold text-gray-800">
                        {formatQuantity(alert.currentQuantity)} /{" "}
                        {formatQuantity(alert.item.minThreshold)}{" "}
                        {alert.item.unit}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isOutOfStock
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        Review needed
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div className="border-t border-gray-100 px-5 py-4">
            <Link
              href="/reorder-alerts"
              className="text-sm font-semibold text-purple-700 hover:text-purple-900"
            >
              View all alerts →
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Recent Transactions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Latest inventory activity
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {recentTransactions.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                No recent transactions found.
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-600">
                      {formatTransactionType(transaction.type)}
                    </span>

                    <div>
                      <p className="font-semibold text-gray-900">
                        {transaction.item.name}{" "}
                        <span className="text-purple-700">
                          {formatTransactionQuantity(
                            transaction.quantityDelta,
                          )}{" "}
                          {transaction.item.unit}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {transaction.branch.name} ·{" "}
                        {transaction.user.username}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    {formatTime(transaction.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Inventory by Branch — Summary
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Item</th>

                  {branchNames.map((branchName) => (
                    <th
                      key={branchName}
                      className="whitespace-nowrap px-5 py-3 font-semibold"
                    >
                      {branchName}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {itemNames.map((itemName) => (
                  <tr key={itemName}>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">
                      {itemName}
                    </td>

                    {branchNames.map((branchName) => {
                      const stock = stockByBranch[itemName]?.[branchName];

                      return (
                        <td
                          key={`${itemName}-${branchName}`}
                          className="whitespace-nowrap px-5 py-4 text-gray-700"
                        >
                          {stock ? (
                            <>
                              {formatQuantity(stock.quantity)}{" "}
                              <span className="text-xs text-gray-500">
                                {stock.item.unit}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
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

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Finished Product Stock by Branch
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>

                  {branchNames.map((branchName) => (
                    <th
                      key={branchName}
                      className="whitespace-nowrap px-5 py-3 font-semibold"
                    >
                      {branchName}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {finishedProductNames.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(branchNames.length + 1, 1)}
                      className="px-5 py-8 text-center text-sm text-gray-500"
                    >
                      No finished product stock found.
                    </td>
                  </tr>
                ) : (
                  finishedProductNames.map((productName) => (
                    <tr key={productName}>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">
                        {productName}
                      </td>

                      {branchNames.map((branchName) => {
                        const stock = finishedProductRecords.find(
                          (record) =>
                            record.item.name === productName &&
                            record.branch.name === branchName,
                        );

                        return (
                          <td
                            key={`${productName}-${branchName}`}
                            className="whitespace-nowrap px-5 py-4 text-gray-700"
                          >
                            {stock ? (
                              <>
                                {formatQuantity(stock.quantity)}{" "}
                                <span className="text-xs text-gray-500">
                                  {stock.item.unit}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}