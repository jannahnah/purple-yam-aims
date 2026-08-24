import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const revalidate = 0; // Ensures fresh database data on load

export default async function Dashboard() {
  // 1. Fetch real branch stock records along with Item and Branch relations
  const stockRecords = await prisma.branchStock.findMany({
    include: {
      item: true,
      branch: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Fetch unique items and active branches counts
  const totalItemsCount = await prisma.item.count();
  const activeBranchesCount = await prisma.branch.count();

  // 2. Compute dynamic metrics based on per-branch stock thresholds
  const lowStockItems = stockRecords.filter(
    (stock) => stock.quantity <= stock.item.minThreshold && stock.quantity > 0
  );
  const outOfStockItems = stockRecords.filter((stock) => stock.quantity === 0);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600">
              PURPLE YAM AIMS
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Owner Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Business-wide inventory overview
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/inventory"
              className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-800"
            >
              Manage Inventory
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign Out
            </Link>
          </div>
        </div>

        {/* Dynamic Summary Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Inventory Items"
            value={totalItemsCount.toString()}
            description="Unique product SKUs"
          />
          <DashboardCard
            title="Active Branches"
            value={activeBranchesCount.toString()}
            description="Commissary & Outlets"
          />
          <DashboardCard
            title="Low Stock"
            value={lowStockItems.length.toString()}
            description="Branch items at or below threshold"
          />
          <DashboardCard
            title="Out of Stock"
            value={outOfStockItems.length.toString()}
            description="Zero-quantity entries"
          />
        </div>

        {/* Main Content */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Active Reorder Alerts from PostgreSQL */}
          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900">
                Active Reorder Alerts
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
                <p className="p-5 text-sm text-gray-500">
                  No low stock alerts at this time.
                </p>
              ) : (
                [...outOfStockItems, ...lowStockItems].map((stock) => (
                  <AlertItem
                    key={stock.id}
                    item={stock.item.name}
                    branch={stock.branch.name}
                    stock={`${stock.quantity} / ${stock.item.minThreshold} ${stock.item.unit}`}
                    isOut={stock.quantity === 0}
                  />
                ))
              )}
            </div>
          </section>

          {/* Recent Activity Log */}
          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900">
                Recent Activity
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              <Transaction
                type="Database"
                description="Live multi-branch inventory synced"
                time="Just now"
              />
              <Transaction
                type="Stock-In"
                description="Purple Yam Flour restocked at Commissary"
                time="Today"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <p className="mt-3 text-3xl font-bold text-purple-700">{value}</p>
      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function AlertItem({
  item,
  branch,
  stock,
  isOut,
}: {
  item: string;
  branch: string;
  stock: string;
  isOut?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-5">
      <div>
        <p className="font-medium text-gray-900">{item}</p>
        <p className="text-xs text-gray-500">{branch}</p>
      </div>

      <div className="text-right">
        <p className={`font-semibold ${isOut ? "text-red-700" : "text-amber-600"}`}>
          {stock}
        </p>
        <span
          className={`mt-1 inline-block rounded border px-2 py-1 text-[10px] font-semibold ${
            isOut
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-yellow-300 bg-yellow-50 text-yellow-700"
          }`}
        >
          {isOut ? "OUT OF STOCK" : "LOW STOCK"}
        </span>
      </div>
    </div>
  );
}

function Transaction({
  type,
  description,
  time,
}: {
  type: string;
  description: string;
  time: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div>
        <span className="mb-1 inline-block rounded border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-700">
          {type}
        </span>
        <p className="text-sm text-gray-800">{description}</p>
      </div>
      <span className="shrink-0 text-xs text-gray-400">{time}</span>
    </div>
  );
}