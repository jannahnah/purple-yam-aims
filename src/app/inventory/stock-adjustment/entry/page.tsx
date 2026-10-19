import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import StockAdjustmentEntry from "./StockAdjustmentEntry";

export const dynamic = "force-dynamic";

export default async function StockAdjustmentEntryPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const user = await requireUser();
  if (user.role !== "INVENTORY_MANAGER") redirect("/inventory");
  const params = await searchParams;
  const branchId = params.branchId;
  if (!branchId) redirect("/inventory/stock-adjustment");

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) redirect("/inventory/stock-adjustment");

  const [items, stocks] = await Promise.all([
    prisma.item.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.branchStock.findMany({ where: { branchId, item: { isActive: true } }, select: { itemId: true, quantity: true } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <a href="/inventory/stock-adjustment" className="text-sm font-medium text-purple-700 hover:underline">← Change branch</a>
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Stock Actions</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Multi-item stock entry</h1>
        <p className="mt-2 text-sm text-gray-600">Branch: <strong>{branch.name}</strong>. Add as many item rows as needed; each item can only be selected once in this batch.</p>
      </div>
      <StockAdjustmentEntry
        branchId={branch.id}
        branchName={branch.name}
        items={items.map((item) => ({ id: item.id, name: item.name, size: item.size, unit: item.unit }))}
        stocks={stocks}
      />
    </main>
  );
}