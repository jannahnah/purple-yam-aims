"use client";

import { useMemo, useState } from "react";

type Transaction = {
  id: string;
  type: "SALE" | "PRODUCTION" | "STOCK_RECEIPT" | "ADJUSTMENT";
  quantityDelta: number;
  createdAt: string;
  item: {
    name: string;
    unit: string;
    sourceType: string;
  };
  branch: {
    name: string;
  };
  user: {
    username: string;
    role: string;
  };
};

export default function TransactionHistory({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [itemFilter, setItemFilter] = useState("ALL");

  const branches = useMemo(
    () =>
      Array.from(
        new Set(transactions.map((transaction) => transaction.branch.name))
      ).sort(),
    [transactions]
  );

  const items = useMemo(
    () =>
      Array.from(
        new Set(transactions.map((transaction) => transaction.item.name))
      ).sort(),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesBranch =
        branchFilter === "ALL" ||
        transaction.branch.name === branchFilter;

      const matchesType =
        typeFilter === "ALL" ||
        transaction.type === typeFilter;

      const matchesItem =
        itemFilter === "ALL" ||
        transaction.item.name === itemFilter;

      return matchesBranch && matchesType && matchesItem;
    });
  }, [transactions, branchFilter, typeFilter, itemFilter]);

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
      second: "2-digit",
    });
  }

  function formatType(type: Transaction["type"]) {
    return type.replace("_", " ");
  }

  function formatQuantity(quantity: number) {
  const formatted = Number(quantity.toFixed(2));

  if (formatted > 0) return `+${formatted}`;
  return `${formatted}`;
  }

  function resetFilters() {
    setBranchFilter("ALL");
    setTypeFilter("ALL");
    setItemFilter("ALL");
  }

  const hasFilters =
    branchFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    itemFilter !== "ALL";

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Transaction History
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Review inventory movements and production transactions.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Showing
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {filteredTransactions.length}
              </p>
              <p className="text-xs text-gray-500">
                of {transactions.length} transactions
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Filter Transactions
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Narrow the history by branch, transaction type, or item.
              </p>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Branch */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Branch
              </label>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                <option value="ALL">All Branches</option>

                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Type */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Transaction Type
              </label>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                <option value="ALL">All Types</option>
                <option value="PRODUCTION">Production</option>
                <option value="SALE">Sale</option>
                <option value="STOCK_RECEIPT">Stock Receipt</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>

            {/* Item */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Item
              </label>

              <select
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                <option value="ALL">All Items</option>

                {items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm text-gray-600">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Transaction</th>
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3">Source Type</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3 text-right">Quantity</th>
                  <th className="px-5 py-3">User</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center"
                    >
                      <p className="text-sm font-medium text-gray-700">
                        No transactions found
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Try changing or clearing your filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const isIncrease = transaction.quantityDelta > 0;

                    return (
                      <tr
                        key={transaction.id}
                        className="transition hover:bg-gray-50"
                      >
                        {/* Date & Time */}
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="font-medium text-gray-900">
                            {formatDate(transaction.createdAt)}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500">
                            {formatTime(transaction.createdAt)}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              transaction.type === "PRODUCTION"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : transaction.type === "SALE"
                                ? "border-purple-200 bg-purple-50 text-purple-700"
                                : transaction.type === "STOCK_RECEIPT"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-gray-200 bg-gray-50 text-gray-700"
                            }`}
                          >
                            {formatType(transaction.type)}
                          </span>
                        </td>

                        {/* Item */}
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {transaction.item.name}
                        </td>

                        {/* Source Type */}
                        <td className="px-5 py-4">
                          <span className="rounded bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                            {transaction.item.sourceType}
                          </span>
                        </td>

                        {/* Branch */}
                        <td className="px-5 py-4">
                          {transaction.branch.name}
                        </td>

                        {/* Quantity */}
                        <td
                          className={`px-5 py-4 text-right font-bold ${
                            isIncrease
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatQuantity(transaction.quantityDelta)}{" "}
                          {transaction.item.unit}
                        </td>

                        {/* User */}
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">
                            {transaction.user.username}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500">
                            {transaction.user.role}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}