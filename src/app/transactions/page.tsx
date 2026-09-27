import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import TransactionHistory from "./TransactionHistory";
import { formatItemLabel } from "@/lib/item-label";

export const revalidate = 0;

export default async function TransactionsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  const transactions =
    await prisma.stockTransaction.findMany({
      where:
        currentUser.role === "OWNER"
          ? undefined
          : {
              branchId:
                currentUser.branchId ?? "__NO_BRANCH__",
            },
      include: {
        item: true,
        branch: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  /*
   * Transfer transactions store the opposite branch ID in
   * transferBranchId rather than using a second Prisma relation.
   *
   * Fetch only the branch records needed by the transactions
   * so the Records page can display:
   *   TRANSFER OUT → To: [branch]
   *   TRANSFER IN  → From: [branch]
   */
  const transferBranchIds = Array.from(
    new Set(
      transactions
        .map((transaction) => transaction.transferBranchId)
        .filter(
          (branchId): branchId is string =>
            Boolean(branchId)
        )
    )
  );

  const transferBranches =
    transferBranchIds.length > 0
      ? await prisma.branch.findMany({
          where: {
            id: {
              in: transferBranchIds,
            },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

  const transferBranchMap = new Map(
    transferBranches.map((branch) => [
      branch.id,
      branch.name,
    ])
  );

  return (
    <AppShell
      user={{
        username: currentUser.username,
        name: currentUser.name,
        role: currentUser.role,
        branchName:
          currentUser.branch?.name ?? null,
      }}
    >
      <TransactionHistory
        transactions={transactions.map(
          (transaction) => ({
            id: transaction.id,
            type: transaction.type,

            /*
             * Inventory history:
             * Previous Quantity → Change → New Quantity
             *
             * These values are stored at the time the
             * transaction is created.
             */
            previousQuantity:
              transaction.previousQuantity ?? null,

            quantityDelta:
              transaction.quantityDelta,

            newQuantity:
              transaction.newQuantity ?? null,

            createdAt:
              transaction.createdAt.toISOString(),

            item: {
              name: transaction.item.name,
              size: transaction.item.size,
              unit: transaction.item.unit,
              sourceType:
                transaction.item.sourceType,
            },

            branch: {
              name: transaction.branch.name,
            },

            user: {
              username:
                transaction.user.username,
              role: transaction.user.role,
            },

            transferId:
              transaction.transferId ?? null,

            transferBranchId:
              transaction.transferBranchId ?? null,

            transferBranchName:
              transaction.transferBranchId
                ? transferBranchMap.get(
                    transaction.transferBranchId
                  ) ?? null
                : null,
          })
        )}

        currentUser={{
          role: currentUser.role,
          branchName:
            currentUser.branch?.name ?? null,
        }}
      />
    </AppShell>
  );
}
