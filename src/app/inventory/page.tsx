import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/authorization";
import Link from "next/link";
import StockActionsModal from "./StockActionsModal";
import ProductionModal from "./ProductionModal";
import SalesModal from "./SalesModal";

export const dynamic = "force-dynamic";

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
  }).format(date);
}

export default async function InventoryPage() {
  const user = await requireUser();

  const isOwner = user.role === "OWNER";
  const isManager = user.role === "BRANCH_MANAGER";
  const isCashier = user.role === "CASHIER";

  /*
   * OWNER:
   *   sees all branches.
   *
   * BRANCH_MANAGER / CASHIER:
   *   sees only their assigned branch.
   */
  const branchFilter =
    isOwner
      ? {}
      : user.branchId
        ? { branchId: user.branchId }
        : { branchId: "__NO_BRANCH__" };

  const stockRecords = await prisma.branchStock.findMany({
    where: branchFilter,
    include: {
      item: true,
      branch: true,
    },
    orderBy: [
      { branch: { name: "asc" } },
      { item: { name: "asc" } },
    ],
  });

  /*
   * Owner needs all branches.
   * Manager/Cashier only receive their own branch.
   */
  const branches = await prisma.branch.findMany({
    where: isOwner
      ? undefined
      : user.branchId
        ? { id: user.branchId }
        : { id: "__NO_BRANCH__" },
    orderBy: {
      name: "asc",
    },
  });

  /*
   * Items are global definitions.
   * Inventory visibility is controlled through BranchStock above.
   */
  const items = await prisma.item.findMany({
    orderBy: {
      name: "asc",
    },
  });

  const dashboardHref = isOwner
    ? "/dashboard"
    : isManager
      ? "/manager-dashboard"
      : "/cashier-dashboard";

  const canManageStock = isOwner || isManager;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* =========================================================
            SIDEBAR
        ========================================================= */}
        <aside className="hidden w-64 shrink-0 bg-purple-950 text-white lg:flex lg:flex-col">
          {/* Brand */}
          <div className="border-b border-purple-800 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-700 text-lg font-bold">
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
              {user.role === "OWNER"
                ? "Admin Owner"
                : user.role === "BRANCH_MANAGER"
                  ? "Branch Manager"
                  : "Cashier"}
            </p>

            <p className="mt-1 text-xs text-purple-200">
              {user.username}
              {user.branch ? ` • ${user.branch.name}` : " • Owner"}
            </p>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-3 py-4">
            <div className="space-y-1">
              <Link
                href={dashboardHref}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
              >
                <span className="w-5 text-center">⌂</span>
                Dashboard
              </Link>

              <Link
                href="/inventory"
                className="flex items-center gap-3 rounded-lg bg-purple-800 px-4 py-3 text-sm font-semibold text-white"
              >
                <span className="w-5 text-center">▣</span>
                Inventory

                <span className="ml-auto h-2 w-2 rounded-full bg-purple-200" />
              </Link>

              <Link
                href="/sales"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
              >
                <span className="w-5 text-center">🛒</span>
                Sales
              </Link>

              {(isOwner || isManager) && (
                <Link
                  href="/production"
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
                >
                  <span className="w-5 text-center">⚗</span>
                  Production
                </Link>
              )}

              {(isOwner || isManager) && (
                <Link
                  href="/transfers"
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
                >
                  <span className="w-5 text-center">⇄</span>
                  Transfers
                </Link>
              )}

              {isOwner && (
                <>
                  <Link
                    href="/reorder-alerts"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
                  >
                    <span className="w-5 text-center">♧</span>
                    Reorder Alerts
                  </Link>

                  <Link
                    href="/reports"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
                  >
                    <span className="w-5 text-center">▤</span>
                    Reports
                  </Link>

                  <Link
                    href="/users"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
                  >
                    <span className="w-5 text-center">♙</span>
                    User Management
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Bottom Navigation */}
          <div className="border-t border-purple-800 px-3 py-4">
            <Link
              href="/account"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
            >
              <span className="w-5 text-center">⚙</span>
              Account Settings
            </Link>

            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800"
            >
              <span className="w-5 text-center">⇥</span>
              Logout
            </Link>
          </div>
        </aside>

        {/* =========================================================
            MAIN CONTENT
        ========================================================= */}
        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
            {/* Header */}
            <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Inventory
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  {isOwner
                    ? "Raw material and finished-product inventory across all branches."
                    : `Inventory for ${user.branch?.name ?? "your assigned branch"}.`}
                </p>

                <div className="mt-3 inline-flex rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700">
                  {isOwner
                    ? "OWNER • ALL BRANCHES"
                    : `${user.role.replace("_", " ")} • ${user.branch?.name ?? "NO BRANCH"}`}
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

                {(isOwner || isManager || isCashier) && (
                  <SalesModal
                    branches={branches}
                    items={items}
                    branchStocks={stockRecords.map((stock) => ({
                      branchId: stock.branchId,
                      itemId: stock.itemId,
                      quantity: stock.quantity,
                    }))}
                  />
                )}

                <Link
                  href={dashboardHref}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  ← Dashboard
                </Link>
              </div>
            </div>

            {/* =====================================================
                SUMMARY CARDS
            ===================================================== */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                  Inventory Items
                </p>

                <p className="mt-2 text-3xl font-bold text-purple-700">
                  {stockRecords.length}
                </p>

                <p className="mt-1 text-xs text-purple-500">
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

                <p className="mt-1 text-xs text-gray-400">
                  {isOwner
                    ? "Active business branches"
                    : "Your assigned branch"}
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
                  Low Stock
                </p>

                <p className="mt-2 text-3xl font-bold text-yellow-700">
                  {
                    stockRecords.filter(
                      (stock) =>
                        stock.quantity > 0 &&
                        stock.quantity <= stock.item.minThreshold
                    ).length
                  }
                </p>

                <p className="mt-1 text-xs text-yellow-600">
                  At or below threshold
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  Out of Stock
                </p>

                <p className="mt-2 text-3xl font-bold text-red-600">
                  {
                    stockRecords.filter(
                      (stock) => stock.quantity === 0
                    ).length
                  }
                </p>

                <p className="mt-1 text-xs text-red-500">
                  Zero-quantity entries
                </p>
              </div>
            </div>

            {/* =====================================================
                FILTER BAR
            ===================================================== */}
            <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {/* Search */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                    Search
                  </label>

                  <input
                    type="text"
                    placeholder="Search item or branch..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    disabled
                    title="Filtering UI will be connected next."
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                    Branch
                  </label>

                  <select
                    disabled={!isOwner}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100 disabled:text-gray-500"
                    defaultValue={isOwner ? "ALL" : user.branchId ?? ""}
                  >
                    {isOwner && (
                      <option value="ALL">
                        All Branches
                      </option>
                    )}

                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                    Source Type
                  </label>

                  <select
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none disabled:bg-gray-100"
                    title="Filtering UI will be connected next."
                  >
                    <option>All Source Types</option>
                    <option>Commissary</option>
                    <option>Branch Sourced</option>
                    <option>Finished Product</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                    Status
                  </label>

                  <select
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none disabled:bg-gray-100"
                    title="Filtering UI will be connected next."
                  >
                    <option>All Statuses</option>
                    <option>In Stock</option>
                    <option>Low Stock</option>
                    <option>Out of Stock</option>
                  </select>
                </div>
              </div>
            </div>

            {/* =====================================================
                INVENTORY TABLE
            ===================================================== */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Current Inventory
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Live stock records from the inventory database.
                    </p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {stockRecords.length} records
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1000px] w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-3">
                        Item
                      </th>

                      <th className="px-5 py-3">
                        Source
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
                        Reorder Threshold
                      </th>

                      <th className="px-5 py-3">
                        Status
                      </th>

                      <th className="px-5 py-3">
                        Last Updated
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {stockRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-12 text-center"
                        >
                          <p className="font-medium text-gray-700">
                            No inventory records found.
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            There is currently no stock record available
                            for this branch.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      stockRecords.map((stock) => {
                        const status = getStockStatus(
                          stock.quantity,
                          stock.item.minThreshold
                        );

                        const statusClass =
                          status === "OUT OF STOCK"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : status === "LOW STOCK"
                              ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                              : "border-green-200 bg-green-50 text-green-700";

                        return (
                          <tr
                            key={stock.id}
                            className="transition hover:bg-purple-50/30"
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-gray-900">
                                {stock.item.name}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700">
                                {formatSourceType(
                                  stock.item.sourceType
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-gray-600">
                              {stock.branch.name}
                            </td>

                            <td className="px-5 py-4">
                              <span className="font-bold text-gray-900">
                                {formatQuantity(stock.quantity)}
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
                                className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold tracking-wide ${statusClass}`}
                              >
                                {status}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-xs text-gray-500">
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

            {/* =====================================================
                ROLE INFORMATION
            ===================================================== */}
            <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                  i
                </span>

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
                        ? `You are viewing inventory for ${user.branch?.name ?? "your assigned branch"}. Stock operations and production are limited to your assigned branch.`
                        : `You are viewing inventory for ${user.branch?.name ?? "your assigned branch"}. Sales are available, while management stock operations are restricted.`}
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