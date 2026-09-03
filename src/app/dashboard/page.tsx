import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const [
    totalItems,
    activeBranches,
    stockRecords,
    recentTransactions,
  ] = await Promise.all([
    prisma.item.count(),

    prisma.branch.count(),

    prisma.branchStock.findMany({
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
    <DashboardClient
      user={user}
      totalItems={totalItems}
      activeBranches={activeBranches}
      lowStock={lowStock}
      outOfStock={outOfStock}
      stockRecords={stockRecords}
      recentTransactions={recentTransactions}
    />
  );
}