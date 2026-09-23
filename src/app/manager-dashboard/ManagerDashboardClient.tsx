"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type InventoryItem = {
  itemId: string;
  itemName: string;
  sourceType: string;
  unit: string;
  quantity: number;
  minThreshold: number;
};

type Alert = {
  id: string;
  itemName: string;
  threshold: number;
  currentStock: number;
  unit: string;
};

type Transaction = {
  id: string;
  type:
    | "SALE"
    | "PRODUCTION"
    | "STOCK_RECEIPT"
    | "ADJUSTMENT"
    | "TRANSFER_IN"
    | "TRANSFER_OUT";
  quantityDelta: number;
  createdAt: string;
  itemName: string;
  unit: string;
  username: string;
};

type Props = {
  user: {
    username: string;
    role: string;
    branch: {
      id: string;
      name: string;
      location: string | null;
    };
  };
  inventory: InventoryItem[];
  finishedProducts: InventoryItem[];
  alerts: Alert[];
  transactions: Transaction[];
  stats: {
    totalItems: number;
    lowStock: number;
    outOfStock: number;
    activeAlerts: number;
  };
};

type NotificationAlert = {
  id: string;
  itemName: string;
  threshold: number;
  currentStock: number;
  unit: string;
};

function formatQuantity(quantity: number) {
  return Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(2).replace(/\.?0+$/, "");
}

function getStockStatus(
  quantity: number,
  minThreshold: number
) {
  if (quantity === 0) {
    return "OUT OF STOCK";
  }

  if (quantity <= minThreshold) {
    return "LOW STOCK";
  }

  return "IN STOCK";
}

function getStatusClass(status: string) {
  if (status === "OUT OF STOCK") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "LOW STOCK") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function formatTransactionType(
  type: Transaction["type"]
) {
  switch (type) {
    case "STOCK_RECEIPT":
      return "STOCK RECEIPT";

    case "ADJUSTMENT":
      return "ADJUSTMENT";

    case "PRODUCTION":
      return "PRODUCTION";

    case "SALE":
      return "SALE";

    case "TRANSFER_IN":
      return "TRANSFER IN";

    case "TRANSFER_OUT":
      return "TRANSFER OUT";

    default:
      return type;
  }
}

function getTransactionClass(
  type: Transaction["type"]
) {
  switch (type) {
    case "SALE":
      return "bg-red-50 text-red-700 border-red-200";

    case "PRODUCTION":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "STOCK_RECEIPT":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "ADJUSTMENT":
      return "bg-gray-50 text-gray-700 border-gray-200";

    case "TRANSFER_IN":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "TRANSFER_OUT":
      return "bg-orange-50 text-orange-700 border-orange-200";

    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

export default function ManagerDashboard({
  user,
  inventory,
  finishedProducts,
  alerts,
  transactions,
  stats,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [isNotificationsOpen, setIsNotificationsOpen] =
    useState(false);

  const [notificationAlerts, setNotificationAlerts] =
    useState<NotificationAlert[]>(alerts);

  const [isLoadingNotifications, setIsLoadingNotifications] =
    useState(false);

  const notificationRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target as Node
        )
      ) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  async function loadNotifications() {
    try {
      setIsLoadingNotifications(true);

      const response = await fetch(
        "/api/dashboard/alerts",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load notifications."
        );
      }

      const data = await response.json();

      setNotificationAlerts(
        (Array.isArray(data) ? data : []).map(
          (alert: {
            id: string;
            item: {
              name: string;
              unit: string;
              minThreshold: number;
            };
            currentQuantity: number;
          }) => ({
            id: alert.id,
            itemName: alert.item.name,
            threshold: alert.item.minThreshold,
            currentStock: alert.currentQuantity,
            unit: alert.item.unit,
          })
        )
      );
    } catch (error) {
      console.error(
        "Notification loading error:",
        error
      );
    } finally {
      setIsLoadingNotifications(false);
    }
  }

  async function toggleNotifications() {
    const nextState = !isNotificationsOpen;

    setIsNotificationsOpen(nextState);

    if (nextState) {
      await loadNotifications();
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Branch Manager Dashboard
            </h1>

            <p className="mt-0.5 text-sm text-gray-500">
              {user.branch.name} — {today}
            </p>
          </div>

          {/* Notification Bell */}
          <div
            ref={notificationRef}
            className="relative"
          >
            <button
              type="button"
              onClick={toggleNotifications}
              aria-label="Open notifications"
              aria-expanded={isNotificationsOpen}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-purple-700"
            >
              {/* Bell icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17H9m9-5V9a6 6 0 1 0-12 0v3c0 1.5-.5 2.7-1.5 4h15c-1-1.3-1.5-2.5-1.5-4Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 20h4"
                />
              </svg>

              {/* Notification count */}
              {notificationAlerts.length > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-gray-50">
                  {notificationAlerts.length > 99
                    ? "99+"
                    : notificationAlerts.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">

                {/* Dropdown Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      Notifications
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {notificationAlerts.length} active alert
                      {notificationAlerts.length === 1
                        ? ""
                        : "s"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={loadNotifications}
                    disabled={isLoadingNotifications}
                    className="text-xs font-medium text-purple-700 transition hover:text-purple-900 disabled:opacity-50"
                  >
                    {isLoadingNotifications
                      ? "Refreshing..."
                      : "Refresh"}
                  </button>
                </div>

                {/* Notifications */}
                {isLoadingNotifications ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-500">
                      Loading notifications...
                    </p>
                  </div>
                ) : notificationAlerts.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m5 12 4 4L19 6"
                        />
                      </svg>
                    </div>

                    <p className="mt-3 text-sm font-medium text-gray-700">
                      No active alerts
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Your branch inventory is within
                      normal levels.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notificationAlerts.map(
                      (alert) => {
                        const status =
                          alert.currentStock === 0
                            ? "OUT OF STOCK"
                            : "LOW STOCK";

                        return (
                          <Link
                            key={alert.id}
                            href="/reorder-alerts"
                            onClick={() =>
                              setIsNotificationsOpen(false)
                            }
                            className="block border-b border-gray-50 px-4 py-3 transition hover:bg-gray-50 last:border-0"
                            aria-label={`View reorder alert for ${alert.itemName}`}
                          >
                            <div className="flex items-start gap-3">

                              {/* Alert icon */}
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="h-4 w-4"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v4"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 17h.01"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M10.3 4.6 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7 0 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                                  />
                                </svg>
                              </div>

                              {/* Alert details */}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                  {alert.itemName}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-500">
                                  Current:{" "}
                                  <span className="font-semibold text-red-600">
                                    {formatQuantity(
                                      alert.currentStock
                                    )}{" "}
                                    {alert.unit}
                                  </span>
                                </p>

                                <p className="text-xs text-gray-400">
                                  Threshold:{" "}
                                  {formatQuantity(
                                    alert.threshold
                                  )}{" "}
                                  {alert.unit}
                                </p>

                                <span
                                  className={`mt-2 inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${getStatusClass(
                                    status
                                  )}`}
                                >
                                  {status}
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      }
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <Link
                    href="/reorder-alerts"
                    onClick={() =>
                      setIsNotificationsOpen(false)
                    }
                    className="block w-full rounded-lg bg-purple-800 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-purple-900"
                  >
                    View Reorder Alerts
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total Items
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {stats.totalItems}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Inventory entries
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Low Stock
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-600">
              {stats.lowStock}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              At or below threshold
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Out of Stock
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {stats.outOfStock}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Zero quantity
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Active Alerts
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                stats.activeAlerts > 0
                  ? "text-red-600"
                  : "text-gray-900"
              }`}
            >
              {stats.activeAlerts}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Pending review
            </p>
          </div>
        </div>

        {/* Alerts + Transactions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Reorder Alerts */}
          <section className="aims-card overflow-hidden">

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Reorder Alerts
              </h2>

              <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-mono text-red-600">
                {alerts.length} active
              </span>
            </div>

            {alerts.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                No active alerts for this branch.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">

                {alerts.map((alert) => {
                  const status =
                    alert.currentStock === 0
                      ? "OUT OF STOCK"
                      : "LOW STOCK";

                  return (
                    <Link
                      key={alert.id}
                      href="/reorder-alerts"
                      className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-gray-50"
                      aria-label={`View reorder alert for ${alert.itemName}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {alert.itemName}
                        </p>

                        <p className="text-xs text-gray-400">
                          Threshold:{" "}
                          {formatQuantity(
                            alert.threshold
                          )}{" "}
                          {alert.unit}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold text-red-700">
                          {formatQuantity(
                            alert.currentStock
                          )}{" "}
                          {alert.unit}
                        </p>

                        <span
                          className={`mt-1 inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${getStatusClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Transactions */}
          <section className="aims-card overflow-hidden">

            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Recent Branch Activity
              </h2>
            </div>

            {transactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                No recent transactions.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">

                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-start gap-3 px-5 py-3"
                  >
                    <span
                      className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${getTransactionClass(
                        transaction.type
                      )}`}
                    >
                      {formatTransactionType(
                        transaction.type
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-700">
                        {transaction.itemName}
                      </p>

                      <p className="text-xs text-gray-400">
                        {transaction.username}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={`font-mono text-xs font-semibold ${
                          transaction.quantityDelta > 0
                            ? "text-emerald-600"
                            : transaction.quantityDelta < 0
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        {transaction.quantityDelta > 0
                          ? "+"
                          : ""}
                        {formatQuantity(
                          transaction.quantityDelta
                        )}{" "}
                        {transaction.unit}
                      </p>

                      <p className="text-xs text-gray-400">
                        {formatDate(
                          transaction.createdAt
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Current Inventory */}
        <section className="aims-card overflow-hidden">

          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Current Inventory — {user.branch.name}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="aims-table text-sm">

              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Item
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Stock
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Threshold
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {inventory.map((item) => {
                  const status = getStockStatus(
                    item.quantity,
                    item.minThreshold
                  );

                  return (
                    <tr
                      key={item.itemId}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.itemName}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500">
                        {item.sourceType.replaceAll(
                          "_",
                          " "
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">
                        {formatQuantity(
                          item.quantity
                        )}{" "}
                        <span className="text-xs font-normal text-gray-400">
                          {item.unit}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-gray-500">
                        {formatQuantity(
                          item.minThreshold
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${getStatusClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Finished Products */}
        <section className="aims-card overflow-hidden">

          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Finished Product Stock — {user.branch.name}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="aims-table text-sm">

              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Product
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Available
                  </th>
                </tr>
              </thead>

              <tbody>
                {finishedProducts.map((product) => {
                  const quantity = product.quantity;

                  return (
                    <tr
                      key={product.itemId}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {product.itemName}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono font-semibold ${
                            quantity === 0
                              ? "text-red-600"
                              : quantity <= 3
                              ? "text-amber-600"
                              : "text-gray-800"
                          }`}
                        >
                          {formatQuantity(
                            quantity
                          )}{" "}
                          {product.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}