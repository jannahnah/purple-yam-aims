import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import StockAdjustmentBranchSelector from "./StockAdjustmentBranchSelector";

export const dynamic = "force-dynamic";

export default async function StockAdjustmentPage() {
  const user = await requireUser();
  if (user.role !== "INVENTORY_MANAGER") redirect("/inventory");

  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <a href="/inventory" className="text-sm font-medium text-purple-700 hover:underline">← Back to Inventory</a>
      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Stock Actions</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Select a branch</h1>
        <p className="mt-2 text-sm text-gray-600">Choose the branch you are counting or replenishing. You must select a branch before opening the item entry page.</p>
        <StockAdjustmentBranchSelector branches={branches.map(({ id, name }) => ({ id, name }))} />
      </div>
    </main>
  );
}