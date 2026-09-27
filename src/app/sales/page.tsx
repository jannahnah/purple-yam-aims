import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import SalesClient from "./SalesClient";
import { formatItemLabel } from "@/lib/item-label";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const user = await requireRole("CASHIER");

  if (!user.branchId || !user.branch) {
    throw new Error("Cashier is not assigned to a branch.");
  }

  const branchId = user.branchId;

  const [finishedItems, branchStock, salesHistory] =
    await Promise.all([
      prisma.item.findMany({
        where: {
          sourceType: "FINISHED_PRODUCT",
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.branchStock.findMany({
        where: {
          branchId,
          item: {
            sourceType: "FINISHED_PRODUCT",
            isActive: true,
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

      prisma.stockTransaction.findMany({
        where: {
          branchId,
          type: "SALE",
        },
        take: 20,
        include: {
          item: {
            select: {
              name: true,
              size: true,
              unit: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

  return (
    <AppShell
      user={{
        username: user.username,
        name: user.name,
        role: user.role,
        branchName: user.branch.name,
      }}
    >
      <SalesClient
        user={{
          username: user.username,
          name: user.name,
          branchId: user.branch.id,
          branchName: user.branch.name,
        }}
        products={finishedItems.map((item) => ({
          id: item.id,
          name: item.name,
          size: item.size,
          unit: item.unit,
        }))}
        stock={branchStock.map((record) => ({
          itemId: record.itemId,
          quantity: Number(record.quantity),
        }))}
        salesHistory={salesHistory.map((sale) => ({
          id: sale.id,
          productName: sale.item.name,
          size: sale.item.size,
          unit: sale.item.unit,
          quantity: Math.abs(Number(sale.quantityDelta)),
          createdAt: sale.createdAt.toISOString(),
        }))}
      />
    </AppShell>
  );
}