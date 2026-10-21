import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import ProductionDashboardClient from "./ProductionDashboardClient";

export const dynamic = "force-dynamic";

export default async function ProductionDashboardPage() {
  const user = await requireRole("PRODUCTION_STAFF");
  if (!user.branchId || !user.branch) {
    throw new Error("Production Staff is not assigned to a branch.");
  }

  const branchId = user.branchId;
  const [finishedItems, stocks, transactions] = await Promise.all([
    prisma.item.findMany({
      where: {
        isActive: true,
        sourceType: "FINISHED_PRODUCT",
        ...(user.businessId ? { businessId: user.businessId } : {}),
      },
      orderBy: [{ name: "asc" }, { size: "asc" }],
      select: { id: true, name: true, size: true, unit: true },
    }),
    prisma.branchStock.findMany({
      where: { branchId, item: { isActive: true, sourceType: "FINISHED_PRODUCT" } },
      include: { item: { select: { id: true, name: true, size: true, unit: true } } },
      orderBy: { item: { name: "asc" } },
    }),
    prisma.stockTransaction.findMany({
      where: { branchId, type: "PRODUCTION", quantityDelta: { gt: 0 } },
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { name: true, size: true, unit: true } },
        user: { select: { name: true, username: true } },
      },
    }),
  ]);

  const stockMap = new Map(stocks.map((stock) => [stock.itemId, stock]));
  return (
    <AppShell user={{ username: user.username, name: user.name, role: user.role, branchName: user.branch.name }}>
      <ProductionDashboardClient
        user={{ name: user.name, username: user.username, branchId, branchName: user.branch.name }}
        products={finishedItems.map((item) => ({
          id: item.id,
          name: item.name,
          size: item.size,
          unit: item.unit,
          currentStock: stockMap.get(item.id)?.quantity ?? 0,
        }))}
        recent={transactions.map((row) => ({
          id: row.id,
          itemName: row.item.name,
          itemSize: row.item.size,
          unit: row.item.unit,
          quantity: row.quantityDelta,
          createdAt: row.createdAt.toISOString(),
          username: row.user.name?.trim() || row.user.username,
        }))}
      />
    </AppShell>
  );
}
