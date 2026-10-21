"use client";

import Link from "next/link";
import { formatItemLabel } from "@/lib/item-label";
import { StatCard } from "@/components/StatCard";
import { useEffect, useRef, useState } from "react";

type Role = "OWNER" | "BRANCH_MANAGER" | "CASHIER" | "INVENTORY_MANAGER";

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
    size?: "SMALL" | "ROUND" | "MEDIUM" | "LARGE" | null;
    unit: string;
    minThreshold: number;
    sourceType: string;
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
    let isInitialLoad = true;
    let knownAlertIds = new Set<string>();

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

        if (!isMounted) {
          return;
        }

        // Do not notify for alerts that already existed when the dashboard opened.
        // Only newly created pending alerts trigger desktop notifications.
        const newAlerts = isInitialLoad
          ? []
          : data.filter((alert) => !knownAlertIds.has(alert.id));

        knownAlertIds = new Set(data.map((alert) => alert.id));
        isInitialLoad = false;
        setAlerts(data);

        if (
          newAlerts.length > 0 &&
          "Notification" in window &&
          Notification.permission === "granted" &&
          "serviceWorker" in navigator
        ) {
          try {
            const registration = await navigator.serviceWorker.ready;

            for (const alert of newAlerts) {
              await registration.showNotification("Purple Yam — Low stock", {
                body: `${alert.item.name} at ${alert.branch.name}: ${alert.currentQuantity} ${alert.item.unit} remaining (threshold ${alert.item.minThreshold}).`,
                icon: "/purple-yam-favicon.svg",
                badge: "/purple-yam-favicon.svg",
                tag: `reorder-alert-${alert.id}`,
                data: { url: "/reorder-alerts" },
              });
            }
          } catch (notificationError) {
            console.error(
              "Failed to display low-stock desktop notification:",
              notificationError
            );
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard alerts:", error);
      } finally {
        if (isMounted) {
          setLoadingAlerts(false);
        }
      }
    }

    void loadAlerts();
    const pollId = window.setInterval(() => {
      void loadAlerts();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(pollId);
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
    const itemLabel = formatItemLabel(stock.item);

    if (!result[itemLabel]) {
      result[itemLabel] = {};
    }

    result[itemLabel][stock.branch.name] = stock;

    return result;
  }, {});

  const branchNames = Array.from(
    new Set(stockRecords.map((stock) => stock.branch.name)),
  );

  const itemNames = Array.from(
    new Set(stockRecords.map((stock) => formatItemLabel(stock.item))),
  );

  const finishedProductRecords = stockRecords.filter(
    (stock) => stock.item.sourceType === "FINISHED_PRODUCT",
  );

  const finishedProductNames = Array.from(
    new Set(
      finishedProductRecords.map((stock) =>
        formatItemLabel(stock.item),
      ),
    ),
  );

  const activeAlertCount = alerts.length;

  return (
    <div className="aims-page owner-dashboard-page">
      <header className="dashboard-topbar relative z-30 border-b border-purple-900/30 px-3 py-3 backdrop-blur sm:sticky sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
          <div>
            <p className="text-xs leading-4 text-zinc-500 sm:text-sm sm:leading-normal">
              Business-wide inventory overview —{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-2xl lg:text-3xl">
              Purple Yam
            </h1>

            <p className="mt-1 text-xs leading-4 text-zinc-500 sm:text-sm sm:leading-normal">
              Signed in as{" "}
              <span className="font-semibold text-zinc-900">
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
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700 transition hover:bg-zinc-100 sm:h-11 sm:w-11 sm:rounded-xl"
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
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center sm:h-5 sm:min-w-5 justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {activeAlertCount > 99 ? "99+" : activeAlertCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:mt-3 sm:w-[min(360px,calc(100vw-2rem))]">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
                        Stock Alerts
                      </h2>

                      <p className="text-[11px] text-gray-500 sm:text-xs">
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
                            className="block border-b border-gray-100 px-3 py-3 transition hover:bg-purple-50 sm:px-4 sm:py-4"
                          >
                            <div className="flex items-start justify-between gap-2 sm:gap-3">
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

                            <div className="mt-2 flex items-center justify-between text-[11px] sm:mt-3 sm:text-xs">
                              <span className="text-gray-500">
                                Current stock
                              </span>

                              <span className="font-semibold text-gray-800">
                                {formatQuantity(alert.currentQuantity)} /{" "}
                                {formatQuantity(alert.item.minThreshold)}{" "}
                                {alert.item.unit}
                              </span>
                            </div>

                            <p className="mt-2 text-[11px] font-semibold text-purple-700 sm:mt-3 sm:text-xs">
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
                    className="block bg-gray-50 px-3 py-2.5 text-center text-xs font-semibold text-purple-700 transition hover:bg-purple-100 sm:px-4 sm:py-3 sm:text-sm"
                  >
                    View all alerts →
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      <main className="aims-container space-y-5 sm:space-y-8">
        <section className="dashboard-welcome flex flex-col gap-4 rounded-2xl p-4 text-zinc-900 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
              Owner Role
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {user.name?.trim() || "Owner"}! <span aria-hidden="true">👋</span>
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-600 sm:text-sm">
              Here&apos;s your real-time stock summary across your central commissary and satellite branches.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <Link href="/inventory" className="dashboard-hero-action">
              View Inventory
            </Link>
            <Link href="/inventory" className="dashboard-hero-action dashboard-hero-action-light">
              Quick Transfer
            </Link>
          </div>
        </section>

        <section className="dashboard-summary-grid grid gap-2.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Inventory Items"
            value={totalItems}
            description="Across all branches"
          />
          <StatCard
            label="Active Branches"
            value={activeBranches}
            description="Commissary and satellite branches"
          />
          <StatCard
            label="Low Stock"
            value={lowStock}
            valueClassName="text-amber-600"
            description="At or below minimum threshold"
          />
          <StatCard
            label="Out of Stock"
            value={outOfStock}
            valueClassName="text-red-600"
            description="Zero-quantity entries"
          />
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm sm:rounded-2xl">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
            <div>
              <h2 className="text-base font-bold text-gray-900 sm:text-lg">
                Stock Notifications
              </h2>

              <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
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
                      <p className="text-xs font-semibold text-gray-800 sm:text-sm">
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
          <div className="border-b border-gray-100 px-3 py-3 sm:px-5 sm:py-5">
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
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-600">
                      {formatTransactionType(transaction.type)}
                    </span>

                    <div>
                      <p className="font-semibold text-gray-900">
                        {formatItemLabel(transaction.item)}{" "}
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
          <div className="border-b border-gray-100 px-3 py-3 sm:px-5 sm:py-5">
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">
              Inventory by Branch — Summary
            </h2>
          </div>

          <div className="overflow-x-auto aims-table-wrap">
            <table className="min-w-full table-fixed text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="w-[30%] px-3 py-2 font-semibold sm:px-5 sm:py-3">Item</th>

                  {branchNames.map((branchName) => (
                    <th
                      key={branchName}
                      className="whitespace-nowrap px-3 py-2 font-semibold sm:px-5 sm:py-3"
                    >
                      {branchName}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {itemNames.map((itemName) => (
                  <tr key={itemName}>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-900 sm:px-5 sm:py-3.5">
                      {itemName}
                    </td>

                    {branchNames.map((branchName) => {
                      const stock = stockByBranch[itemName]?.[branchName];

                      return (
                        <td
                          key={`${itemName}-${branchName}`}
                          className="whitespace-nowrap px-3 py-2.5 text-gray-700 sm:px-5 sm:py-3.5"
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
                            formatItemLabel(record.item) === productName &&
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