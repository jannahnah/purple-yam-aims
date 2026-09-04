"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole = "OWNER" | "BRANCH_MANAGER" | "CASHIER";

interface CurrentUser {
  id: string;
  username: string;
  role: UserRole;
  branchId: string | null;
}

interface ReorderAlert {
  id: string;
  status: "PENDING" | "RESOLVED";
  createdAt: string;
  branch: {
    id: string;
    name: string;
  };
  item: {
    id: string;
    name: string;
    unit: string;
    minThreshold: number;
  };
  currentQuantity: number;
}

interface Props {
  currentUser: CurrentUser;
}

export default function ReorderAlertsClient({
  currentUser,
}: Props) {
  const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/reorder-alerts", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Failed to load reorder alerts."
          );
        }

        if (!cancelled) {
          setAlerts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load reorder alerts."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAlerts();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => alert.status === "PENDING"),
    [alerts]
  );

  const resolvedAlerts = useMemo(
    () => alerts.filter((alert) => alert.status === "RESOLVED"),
    [alerts]
  );

  function getSeverity(quantity: number) {
    if (quantity <= 0) {
      return {
        label: "Out of Stock",
        className:
          "bg-red-50 text-red-700 border border-red-200",
      };
    }

    return {
      label: "Low Stock",
      className:
        "bg-amber-50 text-amber-700 border border-amber-200",
    };
  }

  function formatQuantity(quantity: number) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(quantity);
  }

  function formatThreshold(threshold: number) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(threshold);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Reorder Alerts
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Items at or below their minimum stock threshold that
          require replenishment review.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            Unable to load reorder alerts
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Active Alert Summary */}
      {!loading && activeAlerts.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mt-0.5 shrink-0 text-red-600">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          <div>
            <p className="text-sm font-semibold text-red-800">
              {activeAlerts.length} active reorder alert
              {activeAlerts.length !== 1 ? "s" : ""}
            </p>

            <p className="mt-0.5 text-xs text-red-600">
              Review these items and initiate replenishment as
              needed. Alerts are automatically resolved when
              stock rises above the minimum threshold.
            </p>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Active Alerts
          </h2>

          <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-xs text-red-600">
            {activeAlerts.length}
          </span>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-purple-600" />

            <p className="mt-3 text-sm text-gray-500">
              Loading reorder alerts...
            </p>
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
              <svg
                className="h-5 w-5 text-green-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>

            <p className="mt-3 text-sm font-semibold text-gray-900">
              No active reorder alerts
            </p>

            <p className="mt-1 text-xs text-gray-500">
              All tracked items are currently above their minimum
              stock thresholds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Item
                  </th>

                  {currentUser.role === "OWNER" && (
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Branch
                    </th>
                  )}

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Current Stock
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Threshold
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Severity
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Created
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {activeAlerts.map((alert) => {
                  const severity = getSeverity(
                    alert.currentQuantity
                  );

                  return (
                    <tr
                      key={alert.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <span className="font-medium text-gray-900">
                          {alert.item.name}
                        </span>
                      </td>

                      {currentUser.role === "OWNER" && (
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {alert.branch.name}
                        </td>
                      )}

                      <td className="px-5 py-4">
                        <span className="font-mono text-sm font-bold text-red-700">
                          {formatQuantity(
                            alert.currentQuantity
                          )}{" "}
                          {alert.item.unit}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-sm text-gray-500">
                          {formatThreshold(
                            alert.item.minThreshold
                          )}{" "}
                          {alert.item.unit}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${severity.className}`}
                        >
                          {severity.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-gray-500">
                          {formatDate(alert.createdAt)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                          Pending
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolved Alerts */}
      {!loading && resolvedAlerts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-500">
              Resolved Alerts
            </h2>

            <p className="mt-0.5 text-xs text-gray-400">
              Previously triggered alerts that have automatically
              resolved after stock moved above the threshold.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Item
                  </th>

                  {currentUser.role === "OWNER" && (
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Branch
                    </th>
                  )}

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Current Stock
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Threshold
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Severity
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Created
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {resolvedAlerts.map((alert) => {
                  const severity = getSeverity(
                    alert.currentQuantity
                  );

                  return (
                    <tr
                      key={alert.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <span className="font-medium text-gray-400">
                          {alert.item.name}
                        </span>
                      </td>

                      {currentUser.role === "OWNER" && (
                        <td className="px-5 py-4 text-sm text-gray-400">
                          {alert.branch.name}
                        </td>
                      )}

                      <td className="px-5 py-4">
                        <span className="font-mono text-sm text-gray-400">
                          {formatQuantity(
                            alert.currentQuantity
                          )}{" "}
                          {alert.item.unit}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-sm text-gray-400">
                          {formatThreshold(
                            alert.item.minThreshold
                          )}{" "}
                          {alert.item.unit}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium opacity-70 ${severity.className}`}
                        >
                          {severity.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-gray-400">
                          {formatDate(alert.createdAt)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                          Resolved
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}