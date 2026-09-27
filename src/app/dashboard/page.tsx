import { requireOwner } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireOwner();

  const [
    totalItems,
    activeBranches,
    stockRecords,
    recentTransactions,
  ] = await Promise.all([
    prisma.item.count({ where: { isActive: true } }),

    prisma.branch.count(),

    prisma.branchStock.findMany({
      where: {
        item: {
          isActive: true,
        },
      },
      include: {
        item: true,
        branch: true,
      },
      orderBy: [
        { branch: { name: "asc" } },
        { item: { name: "asc" } },
      ],
    }),

    prisma.stockTransaction.findMany({
      take: 8,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        item: {
          select: {
            name: true,
            size: true,
            unit: true,
          },
        },
        branch: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            username: true,
          },
        },
      },
    }),
  ]);

  const lowStock = stockRecords.filter(
    (stock) =>
      stock.quantity > 0 &&
      stock.quantity <= stock.item.minThreshold
  ).length;

  const outOfStock = stockRecords.filter(
    (stock) => stock.quantity === 0
  ).length;

  return (
    <AppShell
      user={{
        username: user.username,
        name: user.name,
        role: user.role,
        branchName: user.branch?.name ?? null,
      }}
    >
      <DashboardClient
        user={user}
        totalItems={totalItems}
        activeBranches={activeBranches}
        lowStock={lowStock}
        outOfStock={outOfStock}
        stockRecords={stockRecords}
        recentTransactions={recentTransactions}
      />
    </AppShell>
  );
}