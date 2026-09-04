"use client";

import { useEffect, useMemo, useState } from "react";

type ReportType =
  | "inventory-by-branch"
  | "low-stock"
  | "out-of-stock"
  | "sales-summary"
  | "production-summary"
  | "transaction-history";

type UserRole = "OWNER" | "BRANCH_MANAGER" | "CASHIER";

interface CurrentUser {
  id: string;
  username: string;
  role: UserRole;
  branchId: string | null;
}

interface InventoryRow {
  id: string;
  branch: {
    id: string;
    name: string;
  };
  item: {
    id: string;
    name: string;
    sourceType: string;
    unit: string;
    minThreshold: number;
  };
  quantity: number;
}

interface SalesRow {
  id: string;
  createdAt: string;
  branch: {
    id: string;
    name: string;
  };
  item: {
    id: string;
    name: string;
    unit: string;
  };
  quantity: number;
  recordedBy: string;
}

interface ProductionRow {
  id: string;
  createdAt: string;
  branch: {
    id: string;
    name: string;
  };
  item: {
    id: string;
    name: string;
    unit: string;
  };
  quantity: number;
  recordedBy: string;
}

interface TransactionRow {
  id: string;
  type:
    | "SALE"
    | "PRODUCTION"
    | "STOCK_RECEIPT"
    | "ADJUSTMENT";
  quantityDelta: number;
  createdAt: string;
  branch: {
    id: string;
    name: string;
  };
  item: {
    id: string;
    name: string;
    unit: string;
    sourceType: string;
  };
  user: {
    username: string;
    role: string;
  };
}

interface ReportsData {
  inventory: InventoryRow[];
  sales: SalesRow[];
  production: ProductionRow[];
  transactions: TransactionRow[];
}

interface Props {
  currentUser: CurrentUser;
}

const REPORT_OPTIONS: {
  id: ReportType;
  label: string;
  desc: string;
}[] = [
  {
    id: "inventory-by-branch",
    label: "Inventory by Branch",
    desc: "All inventory items grouped by branch.",
  },
  {
    id: "low-stock",
    label: "Low Stock Report",
    desc: "Items at or below their reorder threshold.",
  },
  {
    id: "out-of-stock",
    label: "Out-of-Stock Report",
    desc: "Items with zero quantity.",
  },
  {
    id: "sales-summary",
    label: "Sales Summary",
    desc: "All recorded sales transactions.",
  },
  {
    id: "production-summary",
    label: "Production Summary",
    desc: "All recorded production output.",
  },
  {
    id: "transaction-history",
    label: "Transaction History",
    desc: "Complete log of all inventory movements.",
  },
];

export default function ReportsClient({
  currentUser,
}: Props) {
  const [report, setReport] =
    useState<ReportType>("inventory-by-branch");

  const [data, setData] = useState<ReportsData>({
    inventory: [],
    sales: [],
    production: [],
    transactions: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/reports", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error || "Failed to load reports."
          );
        }

        if (!cancelled) {
          setData({
            inventory: Array.isArray(result.inventory)
              ? result.inventory
              : [],
            sales: Array.isArray(result.sales)
              ? result.sales
              : [],
            production: Array.isArray(result.production)
              ? result.production
              : [],
            transactions: Array.isArray(result.transactions)
              ? result.transactions
              : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load reports."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      cancelled = true;
    };
  }, []);

  const inventoryWithStatus = useMemo(() => {
    return data.inventory.map((row) => {
      let status:
        | "NORMAL"
        | "LOW STOCK"
        | "OUT OF STOCK";

      if (row.quantity <= 0) {
        status = "OUT OF STOCK";
      } else if (row.quantity <= row.item.minThreshold) {
        status = "LOW STOCK";
      } else {
        status = "NORMAL";
      }

      return {
        ...row,
        status,
      };
    });
  }, [data.inventory]);

  const lowStockRows = useMemo(
    () =>
      inventoryWithStatus.filter(
        (row) => row.status === "LOW STOCK"
      ),
    [inventoryWithStatus]
  );

  const outOfStockRows = useMemo(
    () =>
      inventoryWithStatus.filter(
        (row) => row.status === "OUT OF STOCK"
      ),
    [inventoryWithStatus]
  );

  const activeReportLabel =
    REPORT_OPTIONS.find((option) => option.id === report)
      ?.label ?? "Reports";

  function formatQuantity(quantity: number) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(quantity);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatSourceType(sourceType: string) {
    return sourceType
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );
  }

  function formatTransactionType(type: TransactionRow["type"]) {
    return type
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );
  }

  function getStatusBadge(
    status: "NORMAL" | "LOW STOCK" | "OUT OF STOCK"
  ) {
    if (status === "OUT OF STOCK") {
      return (
        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
          Out of Stock
        </span>
      );
    }

    if (status === "LOW STOCK") {
      return (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          Low Stock
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        Normal
      </span>
    );
  }

  function getTransactionBadge(
    type: TransactionRow["type"]
  ) {
    const classes =
      type === "PRODUCTION"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : type === "SALE"
          ? "border-purple-200 bg-purple-50 text-purple-700"
          : type === "STOCK_RECEIPT"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-gray-200 bg-gray-50 text-gray-700";

    return (
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}
      >
        {formatTransactionType(type)}
      </span>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reports
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Inventory and operations reports based on live
            system data.
          </p>
        </div>

        {/* Report Selector */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {REPORT_OPTIONS.map((option) => {
            const selected = report === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setReport(option.id)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selected
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    selected
                      ? "text-purple-800"
                      : "text-gray-900"
                  }`}
                >
                  {option.label}
                </p>

                <p className="mt-0.5 text-xs text-gray-400">
                  {option.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">
              Unable to load reports
            </p>

            <p className="mt-1 text-xs text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Report Output */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {activeReportLabel}
            </h2>

            <span className="rounded bg-purple-50 px-2 py-0.5 font-mono text-xs text-purple-600">
              LIVE DATA
            </span>
          </div>

          {loading ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-purple-600" />

              <p className="mt-3 text-sm text-gray-500">
                Loading report data...
              </p>
            </div>
          ) : (
            <>
              {/* Inventory by Branch */}
              {report === "inventory-by-branch" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3">
                          Item
                        </th>
                        <th className="px-5 py-3">
                          Source Type
                        </th>
                        <th className="px-5 py-3">
                          Branch
                        </th>
                        <th className="px-5 py-3">
                          Stock
                        </th>
                        <th className="px-5 py-3">
                          Unit
                        </th>
                        <th className="px-5 py-3">
                          Threshold
                        </th>
                        <th className="px-5 py-3">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {inventoryWithStatus.length === 0 ? (
                        <EmptyRow colSpan={7} />
                      ) : (
                        inventoryWithStatus.map((row) => (
                          <tr
                            key={row.id}
                            className="transition hover:bg-gray-50"
                          >
                            <td className="px-5 py-4 font-medium text-gray-900">
                              {row.item.name}
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                                {formatSourceType(
                                  row.item.sourceType
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-gray-600">
                              {row.branch.name}
                            </td>

                            <td className="px-5 py-4 font-mono font-semibold text-gray-900">
                              {formatQuantity(row.quantity)}
                            </td>

                            <td className="px-5 py-4 text-xs text-gray-500">
                              {row.item.unit}
                            </td>

                            <td className="px-5 py-4 font-mono text-gray-500">
                              {formatQuantity(
                                row.item.minThreshold
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {getStatusBadge(row.status)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Low Stock */}
              {report === "low-stock" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[750px] text-left text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3">
                          Item
                        </th>
                        <th className="px-5 py-3">
                          Branch
                        </th>
                        <th className="px-5 py-3">
                          Current Stock
                        </th>
                        <th className="px-5 py-3">
                          Threshold
                        </th>
                        <th className="px-5 py-3">
                          Deficit
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {lowStockRows.length === 0 ? (
                        <EmptyRow colSpan={5} />
                      ) : (
                        lowStockRows.map((row) => {
                          const deficit =
                            row.item.minThreshold -
                            row.quantity;

                          return (
                            <tr
                              key={row.id}
                              className="transition hover:bg-amber-50"
                            >
                              <td className="px-5 py-4 font-medium text-gray-900">
                                {row.item.name}
                              </td>

                              <td className="px-5 py-4 text-gray-600">
                                {row.branch.name}
                              </td>

                              <td className="px-5 py-4 font-mono font-bold text-amber-700">
                                {formatQuantity(
                                  row.quantity
                                )}{" "}
                                {row.item.unit}
                              </td>

                              <td className="px-5 py-4 font-mono text-gray-500">
                                {formatQuantity(
                                  row.item.minThreshold
                                )}
                              </td>

                              <td className="px-5 py-4 font-mono font-semibold text-red-600">
                                −{formatQuantity(deficit)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Out of Stock */}
              {report === "out-of-stock" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3">
                          Item
                        </th>
                        <th className="px-5 py-3">
                          Branch
                        </th>
                        <th className="px-5 py-3">
                          Source Type
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {outOfStockRows.length === 0 ? (
                        <EmptyRow colSpan={3} />
                      ) : (
                        outOfStockRows.map((row) => (
                          <tr
                            key={row.id}
                            className="transition hover:bg-red-50"
                          >
                            <td className="px-5 py-4 font-medium text-gray-900">
                              {row.item.name}
                            </td>

                            <td className="px-5 py-4 text-gray-600">
                              {row.branch.name}
                            </td>

                            <td className="px-5 py-4 text-xs text-gray-500">
                              {formatSourceType(
                                row.item.sourceType
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sales Summary */}
              {report === "sales-summary" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3">
                          Date
                        </th>
                        <th className="px-5 py-3">
                          Branch
                        </th>
                        <th className="px-5 py-3">
                          Product
                        </th>
                        <th className="px-5 py-3">
                          Quantity
                        </th>
                        <th className="px-5 py-3">
                          Recorded By
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {data.sales.length === 0 ? (
                        <EmptyRow colSpan={5} />
                      ) : (
                        data.sales.map((sale) => (
                          <tr
                            key={sale.id}
                            className="transition hover:bg-gray-50"
                          >
                            <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-gray-500">
                              {formatDate(
                                sale.createdAt
                              )}
                            </td>

                            <td className="px-5 py-4 text-gray-600">
                              {sale.branch.name}
                            </td>

                            <td className="px-5 py-4 font-medium text-gray-900">
                              {sale.item.name}
                            </td>

                            <td className="px-5 py-4 font-mono font-semibold text-gray-900">
                              {formatQuantity(
                                sale.quantity
                              )}{" "}
                              {sale.item.unit}
                            </td>

                            <td className="px-5 py-4 text-gray-500">
                              {sale.recordedBy}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Production Summary */}
              {report === "production-summary" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3">
                          Date
                        </th>
                        <th className="px-5 py-3">
                          Branch
                        </th>
                        <th className="px-5 py-3">
                          Product
                        </th>
                        <th className="px-5 py-3">
                          Quantity Produced
                        </th>
                        <th className="px-5 py-3">
                          Recorded By
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {data.production.length === 0 ? (
                        <EmptyRow colSpan={5} />
                      ) : (
                        data.production.map((production) => (
                          <tr
                            key={production.id}
                            className="transition hover:bg-gray-50"
                          >
                            <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-gray-500">
                              {formatDate(
                                production.createdAt
                              )}
                            </td>

                            <td className="px-5 py-4 text-gray-600">
                              {production.branch.name}
                            </td>

                            <td className="px-5 py-4 font-medium text-gray-900">
                              {production.item.name}
                            </td>

                            <td className="px-5 py-4 font-mono font-semibold text-gray-900">
                              {formatQuantity(
                                production.quantity
                              )}{" "}
                              {production.item.unit}
                            </td>

                            <td className="px-5 py-4 text-gray-500">
                              {production.recordedBy}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Transaction History */}
              {report === "transaction-history" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3">
                          Date & Time
                        </th>
                        <th className="px-5 py-3">
                          Transaction
                        </th>
                        <th className="px-5 py-3">
                          Item
                        </th>
                        <th className="px-5 py-3">
                          Source Type
                        </th>
                        <th className="px-5 py-3">
                          Branch
                        </th>
                        <th className="px-5 py-3 text-right">
                          Quantity
                        </th>
                        <th className="px-5 py-3">
                          User
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {data.transactions.length === 0 ? (
                        <EmptyRow colSpan={7} />
                      ) : (
                        data.transactions.map(
                          (transaction) => {
                            const isIncrease =
                              transaction.quantityDelta > 0;

                            return (
                              <tr
                                key={transaction.id}
                                className="transition hover:bg-gray-50"
                              >
                                <td className="whitespace-nowrap px-5 py-4">
                                  <div className="font-medium text-gray-900">
                                    {formatDate(
                                      transaction.createdAt
                                    )}
                                  </div>

                                  <div className="mt-0.5 text-xs text-gray-500">
                                    {formatTime(
                                      transaction.createdAt
                                    )}
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  {getTransactionBadge(
                                    transaction.type
                                  )}
                                </td>

                                <td className="px-5 py-4 font-medium text-gray-900">
                                  {transaction.item.name}
                                </td>

                                <td className="px-5 py-4">
                                  <span className="rounded bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                                    {formatSourceType(
                                      transaction.item
                                        .sourceType
                                    )}
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-gray-600">
                                  {transaction.branch.name}
                                </td>

                                <td
                                  className={`px-5 py-4 text-right font-mono font-bold ${
                                    isIncrease
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {isIncrease ? "+" : ""}
                                  {formatQuantity(
                                    transaction.quantityDelta
                                  )}{" "}
                                  {transaction.item.unit}
                                </td>

                                <td className="px-5 py-4">
                                  <div className="font-medium text-gray-900">
                                    {
                                      transaction.user
                                        .username
                                    }
                                  </div>

                                  <div className="mt-0.5 text-xs text-gray-500">
                                    {
                                      transaction.user.role
                                    }
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function EmptyRow({
  colSpan,
}: {
  colSpan: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-6 py-12 text-center"
      >
        <p className="text-sm font-medium text-gray-700">
          No data found
        </p>

        <p className="mt-1 text-xs text-gray-500">
          There are no records available for this report.
        </p>
      </td>
    </tr>
  );
}