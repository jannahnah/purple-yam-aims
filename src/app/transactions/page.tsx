import { prisma } from "@/lib/prisma";
import TransactionHistory from "./TransactionHistory";

export const revalidate = 0;

export default async function TransactionsPage() {
  const transactions = await prisma.stockTransaction.findMany({
    include: {
      item: true,
      branch: true,
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <TransactionHistory
      transactions={transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        quantityDelta: transaction.quantityDelta,
        createdAt: transaction.createdAt.toISOString(),
        item: {
          name: transaction.item.name,
          unit: transaction.item.unit,
          sourceType: transaction.item.sourceType,
        },
        branch: {
          name: transaction.branch.name,
        },
        user: {
          username: transaction.user.username,
          role: transaction.user.role,
        },
      }))}
    />
  );
}