import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import CashierDashboardClient from "./CashierDashboardClient";

export const dynamic = "force-dynamic";

export default async function CashierDashboardPage() {
  const user = await requireRole("CASHIER");

  if (!user.branchId || !user.branch) {
    throw new Error(
      "Cashier is not assigned to a branch."
    );
  }

  const branchId = user.branchId;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(
    startOfTomorrow.getDate() + 1
  );

  const [
    finishedItems,
    branchStock,
    todaySales,
    recentSales,
  ] = await Promise.all([
    // Finished products available for sale
    prisma.item.findMany({
      where: {
        sourceType: "FINISHED_PRODUCT",
      },
      orderBy: {
        name: "asc",
      },
    }),

    // Finished-product stock for the cashier's branch
    prisma.branchStock.findMany({
      where: {
        branchId,
        item: {
          sourceType: "FINISHED_PRODUCT",
        },
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

    // Sales recorded today
    prisma.stockTransaction.findMany({
      where: {
        branchId,
        type: "SALE",
        createdAt: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
      include: {
        item: {
          select: {
            name: true,
            unit: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    // Most recent sales for this branch
    prisma.stockTransaction.findMany({
      where: {
        branchId,
        type: "SALE",
      },
      take: 8,
      include: {
        item: {
          select: {
            name: true,
            unit: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const totalToday = todaySales.reduce(
    (sum, sale) =>
      sum + Math.abs(Number(sale.quantityDelta)),
    0
  );

  const availableProducts = branchStock.filter(
    (stock) => Number(stock.quantity) > 0
  ).length;

  return (
    <AppShell
      user={{
        username: user.username,
        name: user.name,
        role: user.role,
        branchName: user.branch.name,
      }}
    >
      <CashierDashboardClient
        user={{
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          branchId: user.branch.id,
          branchName: user.branch.name,
        }}
        branch={{
          id: user.branch.id,
          name: user.branch.name,
        }}
        finishedItems={finishedItems.map(
          (item) => ({
            id: item.id,
            name: item.name,
            unit: item.unit,
            sourceType: item.sourceType,
          })
        )}
        branchStock={branchStock.map(
          (stock) => ({
            branchId: stock.branchId,
            itemId: stock.itemId,
            quantity: Number(stock.quantity),
            item: {
              id: stock.item.id,
              name: stock.item.name,
              unit: stock.item.unit,
              sourceType: stock.item.sourceType,
            },
          })
        )}
        stats={{
          todaySalesCount: todaySales.length,
          totalToday,
          availableProducts,
          totalProducts: finishedItems.length,
        }}
        recentSales={recentSales.map(
          (sale) => ({
            id: sale.id,
            itemName: sale.item.name,
            unit: sale.item.unit,
            quantity: Math.abs(
              Number(sale.quantityDelta)
            ),
            createdAt:
              sale.createdAt.toISOString(),
          })
        )}
      />
    </AppShell>
  );
}