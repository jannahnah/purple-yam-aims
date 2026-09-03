"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StockActionsModal from "./StockActionsModal";
import ProductionModal from "./ProductionModal";
import SalesModal from "./SalesModal";

type Role = "OWNER" | "BRANCH_MANAGER" | "CASHIER";

type Branch = {
  id: string;
  name: string;
};

type Item = {
  id: string;
  name: string;
  sourceType: string;
  unit: string;
  minThreshold: number;
};

type StockRecord = {
  id: string;
  branchId: string;
  itemId: string;
  quantity: number;
  updatedAt: Date;
  branch: Branch;
  item: Item;
};

type UserInfo = {
  role: Role;
  username: string;
  branchId: string | null;
  branchName: string | null;
};

type Props = {
  user: UserInfo;
  stockRecords: StockRecord[];
  branches: Branch[];
  items: Item[];
};

function formatQuantity(quantity: number) {
  return Number(quantity.toFixed(2));
}

function formatSourceType(sourceType: string) {
  switch (sourceType) {
    case "COMMISSARY_SUPPLIED":
      return "Commissary";
    case "BRANCH_SOURCED":
      return "Branch Sourced";
    case "FINISHED_PRODUCT":
      return "Finished Product";
    default:
      return sourceType;
  }
}

function getStockStatus(quantity: number, threshold: number) {
  if (quantity === 0) {
    return "OUT OF STOCK";
  }

  if (quantity <= threshold) {
    return "LOW STOCK";
  }

  return "IN STOCK";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getRoleLabel(role: Role) {
  switch (role) {
    case "OWNER":
      return "Admin Owner";
    case "BRANCH_MANAGER":
      return "Branch Manager";
    case "CASHIER":
      return "Cashier";
  }
}

function getSourceBadgeClass(sourceType: string) {
  switch (sourceType) {
    case "COMMISSARY_SUPPLIED":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "BRANCH_SOURCED":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "FINISHED_PRODUCT":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "OUT OF STOCK":
      return "border-red-200 bg-red-50 text-red-700";
    case "LOW STOCK":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export default function InventoryClient({
  user,
  stockRecords,
  branches,
  items,
}: Props) {
  const isOwner = user.role === "OWNER";
  const isManager = user.role === "BRANCH_MANAGER";
  const isCashier = user.role === "CASHIER";

  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(
    isOwner ? "ALL" : user.branchId ?? ""
  );
  const [selectedSource, setSelectedSource] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const dashboardHref = isOwner
    ? "/dashboard"
    : isManager
      ? "/manager-dashboard"
      : "/cashier-dashboard";

  const canManageStock = isOwner || isManager;

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return stockRecords.filter((stock) => {
      const matchesSearch =
        normalizedSearch === "" ||
        stock.item.name.toLowerCase().includes(normalizedSearch) ||
        stock.branch.name.toLowerCase().includes(normalizedSearch);

      const matchesBranch =
        selectedBranch === "ALL" ||
        stock.branchId === selectedBranch;

      const matchesSource =
        selectedSource === "ALL" ||
        stock.item.sourceType === selectedSource;

      const status = getStockStatus(
        stock.quantity,
        stock.item.minThreshold
      );

      const matchesStatus =
        selectedStatus === "ALL" ||
        status === selectedStatus;

      return (
        matchesSearch &&
        matchesBranch &&
        matchesSource &&
        matchesStatus
      );
    });
  }, [
    stockRecords,
    search,
    selectedBranch,
    selectedSource,
    selectedStatus,
  ]);

  const lowStockCount = stockRecords.filter(
    (stock) =>
      stock.quantity > 0 &&
      stock.quantity <= stock.item.minThreshold
  ).length;

  const outOfStockCount = stockRecords.filter(
    (stock) => stock.quantity === 0
  ).length;

  const clearFilters = () => {
    setSearch("");
    setSelectedBranch(isOwner ? "ALL" : user.branchId ?? "");
    setSelectedSource("ALL");
    setSelectedStatus("ALL");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedSource !== "ALL" ||
    selectedStatus !== "ALL" ||
    (isOwner && selectedBranch !== "ALL");

  return (
    <main className="min-h-screen bg-[#f7f7fa]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 bg-purple-950 text-white lg:flex lg:flex-col">
          <div className="border-b border-purple-800 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-700 text-sm font-bold shadow-sm">
                PY
              </div>

              <div>
                <h1 className="text-base font-bold">
                  Purple Yam
                </h1>

                <p className="text-xs text-purple-200">
                  AIMS Prototype
                </p>
              </div>
            </div>
          </div>

          {/* User */}
          <div className="border-b border-purple-800 px-5 py-4">
            <p className="text-sm font-semibold">
              {getRoleLabel(user.role)}
            </p>

            <p className="mt-1 truncate text-xs text-purple-200">
              {user.username}
              {" • "}
              {user.branchName ?? "Owner"}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4">
            <div className="space-y-1">
              <Link
                href={dashboardHref}
                className="flex items-center rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
              >
                Dashboard
              </Link>

              <Link
                href="/inventory"
                className="flex items-center rounded-lg bg-purple-800 px-4 py-3 text-sm font-semibold text-white shadow-sm"
              >
                Inventory
                <span className="ml-auto h-2 w-2 rounded-full bg-purple-200" />
              </Link>

              <Link
                href="/sales"
                className="flex items-center rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
              >
                Sales
              </Link>

              {(isOwner || isManager) && (
                <>
                  <Link
                    href="/production"
                    className="flex items-center rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
                  >
                    Production
                  </Link>

                  <Link
                    href="/transfers"
                    className="flex items-center rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
                  >
                    Transfers
                  </Link>
                </>
              )}

              {isOwner && (
                <>
                  <Link
                    href="/reorder-alerts"
                    className="flex items-center rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
                  >
                    Reorder Alerts
                  </Link>

                  <Link
                    href="/reports"
                    className="flex items-center rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
                  >
                    Reports
                  </Link>

                  <Link
                    href="/users"
                    className="flex items-center rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
                  >
                    User Management
                  </Link>
                </>
              )}
            </div>
          </nav>

          <div className="border-t border-purple-800 px-3 py-4">
            <Link
              href="/account"
              className="flex items-center rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
            >
              Account Settings
            </Link>

            <Link
              href="/"
              className="mt-1 flex items-center rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
            >
              Logout
            </Link>
          </div>
        </aside>

        {/* Main */}
        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
            {/* Header */}
            <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-purple-600">
                    Inventory Management
                  </span>
                </div>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
                  Inventory
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {isOwner
                    ? "Monitor raw materials and finished products across all branches."
                    : `Monitor inventory for ${
                        user.branchName ?? "your assigned branch"
                      }.`}
                </p>

                <div className="mt-3 inline-flex rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                  {isOwner
                    ? "OWNER • ALL BRANCHES"
                    : `${user.role.replace("_", " ")} • ${
                        user.branchName ?? "NO BRANCH"
                      }`}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {canManageStock && (
                  <>
                    <StockActionsModal
                      branches={branches}
                      items={items}
                      branchStocks={stockRecords.map((stock) => ({
                        id: stock.id,
                        branchId: stock.branchId,
                        itemId: stock.itemId,
                        quantity: stock.quantity,
                      }))}
                    />

                    <ProductionModal
                      branches={branches}
                      items={items}
                    />
                  </>
                )}

                <SalesModal
                  branches={branches}
                  items={items}
                  branchStocks={stockRecords.map((stock) => ({
                    branchId: stock.branchId,
                    itemId: stock.itemId,
                    quantity: stock.quantity,
                  }))}
                />

                <Link
                  href={dashboardHref}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                >
                  ← Dashboard
                </Link>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Inventory Items
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stockRecords.length}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {isOwner
                    ? "Stock records across all branches"
                    : "Stock records in your branch"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Branches
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {branches.length}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {isOwner
                    ? "Active business branches"
                    : "Your assigned branch"}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Low Stock
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-600">
                  {lowStockCount}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  At or below threshold
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  Out of Stock
                </p>

                <p className="mt-2 text-3xl font-bold text-red-600">
                  {outOfStockCount}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Zero-quantity entries
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Filter Inventory
                  </h2>

                  <p className="text-xs text-gray-500">
                    Narrow the inventory records displayed below.
                  </p>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-left text-xs font-semibold text-purple-600 hover:text-purple-800 sm:text-right"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {/* Search */}
                <div>
                  <label
                    htmlFor="inventory-search"
                    className="mb-1.5 block text-xs font-semibold text-gray-600"
                  >
                    Search
                  </label>

                  <input
                    id="inventory-search"
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search item or branch..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                {/* Branch */}
                <div>
                  <label
                    htmlFor="inventory-branch"
                    className="mb-1.5 block text-xs font-semibold text-gray-600"
                  >
                    Branch
                  </label>

                  <select
                    id="inventory-branch"
                    value={selectedBranch}
                    onChange={(event) =>
                      setSelectedBranch(event.target.value)
                    }
                    disabled={!isOwner}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {isOwner && (
                      <option value="ALL">
                        All Branches
                      </option>
                    )}

                    {branches.map((branch) => (
                      <option
                        key={branch.id}
                        value={branch.id}
                      >
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source */}
                <div>
                  <label
                    htmlFor="inventory-source"
                    className="mb-1.5 block text-xs font-semibold text-gray-600"
                  >
                    Source Type
                  </label>

                  <select
                    id="inventory-source"
                    value={selectedSource}
                    onChange={(event) =>
                      setSelectedSource(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="ALL">
                      All Source Types
                    </option>

                    <option value="COMMISSARY_SUPPLIED">
                      Commissary
                    </option>

                    <option value="BRANCH_SOURCED">
                      Branch Sourced
                    </option>

                    <option value="FINISHED_PRODUCT">
                      Finished Product
                    </option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label
                    htmlFor="inventory-status"
                    className="mb-1.5 block text-xs font-semibold text-gray-600"
                  >
                    Status
                  </label>

                  <select
                    id="inventory-status"
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="ALL">
                      All Statuses
                    </option>

                    <option value="IN STOCK">
                      In Stock
                    </option>

                    <option value="LOW STOCK">
                      Low Stock
                    </option>

                    <option value="OUT OF STOCK">
                      Out of Stock
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Inventory table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Current Inventory
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Live stock records from the inventory database.
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                    {filteredRecords.length}{" "}
                    {filteredRecords.length === 1
                      ? "record"
                      : "records"}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-3.5">
                        Item
                      </th>

                      <th className="px-5 py-3.5">
                        Source
                      </th>

                      <th className="px-5 py-3.5">
                        Branch
                      </th>

                      <th className="px-5 py-3.5 text-right">
                        Stock
                      </th>

                      <th className="px-5 py-3.5">
                        Unit
                      </th>

                      <th className="px-5 py-3.5">
                        Reorder Threshold
                      </th>

                      <th className="px-5 py-3.5">
                        Status
                      </th>

                      <th className="px-5 py-3.5">
                        Last Updated
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-16 text-center"
                        >
                          <div className="mx-auto max-w-sm">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-lg font-bold text-purple-600">
                              PY
                            </div>

                            <p className="mt-4 font-semibold text-gray-800">
                              No inventory found
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-gray-500">
                              Try changing your search or filters.
                            </p>

                            {hasActiveFilters && (
                              <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-4 rounded-lg bg-purple-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-800"
                              >
                                Clear Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((stock) => {
                        const status = getStockStatus(
                          stock.quantity,
                          stock.item.minThreshold
                        );

                        return (
                          <tr
                            key={stock.id}
                            className="transition hover:bg-purple-50/40"
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-gray-900">
                                {stock.item.name}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${getSourceBadgeClass(
                                  stock.item.sourceType
                                )}`}
                              >
                                {formatSourceType(
                                  stock.item.sourceType
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-gray-600">
                              {stock.branch.name}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span className="text-base font-bold text-gray-900">
                                {formatQuantity(
                                  stock.quantity
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-gray-500">
                              {stock.item.unit}
                            </td>

                            <td className="px-5 py-4 text-gray-600">
                              {formatQuantity(
                                stock.item.minThreshold
                              )}{" "}
                              {stock.item.unit}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusBadgeClass(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                              {formatDate(stock.updatedAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Role information */}
            <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                  i
                </div>

                <div>
                  <p className="text-sm font-semibold text-purple-900">
                    {isOwner
                      ? "Owner inventory access"
                      : isManager
                        ? "Branch Manager inventory access"
                        : "Cashier inventory access"}
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-purple-700">
                    {isOwner
                      ? "You are viewing inventory across all branches. Stock operations and production can be recorded from this page."
                      : isManager
                        ? `You are viewing inventory for ${
                            user.branchName ?? "your assigned branch"
                          }. Stock operations and production are limited to your assigned branch.`
                        : `You are viewing inventory for ${
                            user.branchName ?? "your assigned branch"
                          }. Sales are available, while management stock operations are restricted.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}