import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import ManagerDashboardClient from "./ManagerDashboardClient";

export const dynamic = "force-dynamic";

export default async function ManagerDashboardPage() {
  const user = await requireRole("BRANCH_MANAGER");

  if (!user.branchId || !user.branch) {
    throw new Error("Branch Manager is not assigned to a branch.");
  }

  const branchId = user.branchId;

  const [items, stockRecords, alerts, transactions] =
    await Promise.all([
      prisma.item.findMany({
        orderBy: {
          name: "asc",
        },
      }),

      prisma.branchStock.findMany({
        where: {
          branchId,
        },
        include: {
          item: true,
        },
        orderBy: {
          item: {
            name: "asc",
          },
        },
      }),

      prisma.reorderAlert.findMany({
        where: {
          branchId,
          status: "PENDING",
        },
        include: {
          item: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.stockTransaction.findMany({
        where: {
          branchId,
        },
        take: 8,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          item: {
            select: {
              name: true,
              unit: true,
            },
          },
          user: {
            select: {
              username: true,
              role: true,
            },
          },
        },
      }),
    ]);

  const stockMap = new Map(
    stockRecords.map((stock) => [stock.itemId, stock])
  );

  const inventory = items.map((item) => {
    const stock = stockMap.get(item.id);

    return {
      itemId: item.id,
      itemName: item.name,
      sourceType: item.sourceType,
      unit: item.unit,
      quantity: stock?.quantity ?? 0,
      minThreshold: item.minThreshold,
    };
  });

  const lowStock = inventory.filter(
    (stock) =>
      stock.quantity > 0 &&
      stock.quantity <= stock.minThreshold
  );

  const outOfStock = inventory.filter(
    (stock) => stock.quantity === 0
  );

  const finishedProducts = inventory.filter(
    (item) => item.sourceType === "FINISHED_PRODUCT"
  );

  return (
    <ManagerDashboardClient
      user={{
        username: user.username,
        role: user.role,
        branch: {
          id: user.branch.id,
          name: user.branch.name,
          location: user.branch.location,
        },
      }}
      inventory={inventory}
      finishedProducts={finishedProducts}
      alerts={alerts.map((alert) => ({
        id: alert.id,
        itemName: alert.item.name,
        threshold: alert.item.minThreshold,
        currentStock:
          stockMap.get(alert.itemId)?.quantity ?? 0,
        unit: alert.item.unit,
      }))}
      transactions={transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        quantityDelta: transaction.quantityDelta,
        createdAt: transaction.createdAt.toISOString(),
        itemName: transaction.item.name,
        unit: transaction.item.unit,
        username: transaction.user.username,
      }))}
      stats={{
        totalItems: inventory.length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        activeAlerts: alerts.length,
      }}
    />
  );
}