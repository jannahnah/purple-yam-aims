import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/authorization";
import AppShell from "@/components/AppShell";
import TransferDeliveryHistory from "./TransferDeliveryHistory";

export const dynamic = "force-dynamic";

export default async function TransferDeliveriesPage() {
  const user = await requireRole("OWNER", "BRANCH_MANAGER");

  const transactions = await prisma.stockTransaction.findMany({
    where:
      user.role === "OWNER"
        ? {
            type: {
              in: ["TRANSFER_IN", "TRANSFER_OUT"],
            },
          }
        : {
            branchId: user.branchId ?? "__NO_BRANCH__",
            type: {
              in: ["TRANSFER_IN", "TRANSFER_OUT"],
            },
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

  const transferBranchIds = Array.from(
    new Set(
      transactions
        .map((transaction) => transaction.transferBranchId)
        .filter(
          (branchId): branchId is string => Boolean(branchId)
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
        username: user.username,
        name: user.name,
        role: user.role,
        branchName: user.branch?.name ?? null,
      }}
    >
      <TransferDeliveryHistory
        transactions={transactions.map((transaction) => ({
          id: transaction.id,
          transferId: transaction.transferId,
          type: transaction.type,
          quantityDelta: transaction.quantityDelta,
          previousQuantity: transaction.previousQuantity,
          newQuantity: transaction.newQuantity,
          createdAt: transaction.createdAt.toISOString(),
          item: {
            name: transaction.item.name,
            unit: transaction.item.unit,
            sourceType: transaction.item.sourceType,
          },
          branch: {
            id: transaction.branch.id,
            name: transaction.branch.name,
          },
          transferBranchId: transaction.transferBranchId,
          transferBranchName: transaction.transferBranchId
            ? transferBranchMap.get(
                transaction.transferBranchId
              ) ?? null
            : null,
          user: {
            username: transaction.user.username,
            role: transaction.user.role,
          },
        }))}
        currentUser={{
          role: user.role,
          branchName: user.branch?.name ?? null,
        }}
      />
    </AppShell>
  );
}
