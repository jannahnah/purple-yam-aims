import { prisma } from "@/lib/prisma";
import Link from "next/link";
import StockActionsModal from "./StockActionsModal";
import ProductionModal from "./ProductionModal";
import SalesModal from "./SalesModal";

export const revalidate = 0;

export default async function InventoryPage() {
  const stockRecords = await prisma.branchStock.findMany({
    include: {
      item: true,
      branch: true,
    },
    orderBy: [
      { branch: { name: "asc" } },
      { item: { name: "asc" } },
    ],
  });

  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  const items = await prisma.item.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500">Multi-branch stock levels and thresholds</p>
          </div>
          
          <div className="flex items-center gap-3">
          <ProductionModal branches={branches} items={items} />
          <SalesModal
              branches={branches}
              items={items}
              branchStocks={stockRecords.map((stock) => ({
                branchId: stock.branchId,
                itemId: stock.itemId,
                quantity: stock.quantity,
              }))}
            />
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
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Item Name</th>
                <th className="px-6 py-3">Source Type</th>
                <th className="px-6 py-3">Branch Location</th>
                <th className="px-6 py-3">Current Stock</th>
                <th className="px-6 py-3">Min Threshold</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stockRecords.map((stock) => {
                const isOut = stock.quantity === 0;
                const isLow = stock.quantity <= stock.item.minThreshold;

                return (
                  <tr key={stock.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{stock.item.name}</td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 border border-purple-200">
                        {stock.item.sourceType}
                      </span>
                    </td>
                    <td className="px-6 py-4">{stock.branch.name}</td>
                    <td className="px-6 py-4 font-semibold">
                      {stock.quantity} {stock.item.unit}
                    </td>
                    <td className="px-6 py-4">{stock.item.minThreshold} {stock.item.unit}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${
                          isOut
                            ? "border-red-300 bg-red-50 text-red-700"
                            : isLow
                            ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                            : "border-green-300 bg-green-50 text-green-700"
                        }`}
                      >
                        {isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "IN STOCK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}