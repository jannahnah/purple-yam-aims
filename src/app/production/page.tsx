import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import ProductionStaffClient from "./ProductionStaffClient";

export const dynamic = "force-dynamic";

function manilaDayStart() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return new Date(`${value("year")}-${value("month")}-${value("day")}T00:00:00+08:00`);
}

export default async function ProductionStaffPage() {
  const user = await requireRole("PRODUCTION_STAFF");
  const assignedBranchId = user.branchId;

  if (!assignedBranchId) {
    return (
      <AppShell user={{ username: user.username, name: user.name, role: user.role, branchName: null }}>
        <div className="p-6"><h1 className="text-xl font-bold">Production Log</h1><p className="mt-2 text-red-700">This account has no assigned branch. Ask the owner to assign one.</p></div>
      </AppShell>
    );
  }

  const todayStart = manilaDayStart();
  const businessItemFilter = user.businessId ? { businessId: user.businessId } : {};
  const [branch, products, recent, todayTransactions, finishedStocks] = await Promise.all([
    prisma.branch.findUnique({ where: { id: assignedBranchId }, select: { id: true, name: true } }),
    prisma.item.findMany({
      where: { isActive: true, sourceType: "FINISHED_PRODUCT", ...businessItemFilter },
      select: { id: true, name: true, size: true, unit: true, recipeAsFinished: { select: { id: true }, take: 1 } },
      orderBy: [{ name: "asc" }, { size: "asc" }],
    }),
    prisma.stockTransaction.findMany({
      where: { branchId: assignedBranchId, type: "PRODUCTION", quantityDelta: { gt: 0 }, item: { sourceType: "FINISHED_PRODUCT", ...businessItemFilter } },
      take: 12,
      orderBy: { createdAt: "desc" },
      include: { item: { select: { name: true, size: true, unit: true } }, user: { select: { name: true, username: true } } },
    }),
    prisma.stockTransaction.findMany({
      where: {
        branchId: assignedBranchId,
        createdAt: { gte: todayStart },
        type: { in: ["PRODUCTION", "SALE"] },
        item: { sourceType: "FINISHED_PRODUCT", ...businessItemFilter },
      },
      select: { type: true, quantityDelta: true },
    }),
    prisma.branchStock.findMany({
      where: { branchId: assignedBranchId, item: { isActive: true, sourceType: "FINISHED_PRODUCT", ...businessItemFilter } },
      select: { quantity: true, item: { select: { id: true } } },
    }),
  ]);

  const producedToday = todayTransactions.reduce((total, tx) => total + (tx.type === "PRODUCTION" && tx.quantityDelta > 0 ? tx.quantityDelta : 0), 0);
  const soldToday = todayTransactions.reduce((total, tx) => total + (tx.type === "SALE" && tx.quantityDelta < 0 ? Math.abs(tx.quantityDelta) : 0), 0);
  const availableStock = finishedStocks.reduce((total, stock) => total + stock.quantity, 0);

  return (
    <AppShell user={{ username: user.username, name: user.name, role: user.role, branchName: branch?.name ?? null }}>
      <ProductionStaffClient
        branchId={assignedBranchId}
        branchName={branch?.name ?? "Assigned branch"}
        products={products.map((item) => ({ id: item.id, name: item.name, size: item.size, unit: item.unit, hasRecipe: item.recipeAsFinished.length > 0 }))}
        recent={recent.map((tx) => ({ id: tx.id, itemName: tx.item.name, size: tx.item.size, unit: tx.item.unit, quantity: tx.quantityDelta, username: tx.user.name || tx.user.username, createdAt: tx.createdAt.toISOString() }))}
        summary={{ producedToday, soldToday, availableStock, productCount: finishedStocks.length }}
      />
    </AppShell>
  );
}
