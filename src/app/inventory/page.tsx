import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/authorization";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await requireUser();

  const isOwner = user.role === "OWNER";

  /*
   * OWNER:
   *   sees all branches.
   *
   * BRANCH_MANAGER / CASHIER:
   *   sees only their assigned branch.
   */
  const branchFilter = isOwner
    ? {}
    : user.branchId
      ? { branchId: user.branchId }
      : { branchId: "__NO_BRANCH__" };

  const stockRecords = await prisma.branchStock.findMany({
    where: branchFilter,
    include: {
      item: true,
      branch: true,
    },
    orderBy: [
      { branch: { name: "asc" } },
      { item: { name: "asc" } },
    ],
  });

  /*
   * OWNER:
   *   receives all branches for filtering/actions.
   *
   * MANAGER / CASHIER:
   *   receive only their assigned branch.
   */
  const branches = await prisma.branch.findMany({
    where: isOwner
      ? undefined
      : user.branchId
        ? { id: user.branchId }
        : { id: "__NO_BRANCH__" },
    orderBy: {
      name: "asc",
    },
  });

  /*
   * Items are global definitions.
   * Inventory visibility is controlled through BranchStock.
   */
  const items = await prisma.item.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <InventoryClient
      user={{
        role: user.role,
        username: user.username,
        branchId: user.branchId,
        branchName: user.branch?.name ?? null,
      }}
      stockRecords={stockRecords}
      branches={branches}
      items={items}
    />
  );
}