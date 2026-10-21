import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/authorization";
import AppShell from "@/components/AppShell";
import InventoryClient from "./InventoryClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await requireUser();
  if (user.role === "PRODUCTION_STAFF") redirect("/production-dashboard");

  const isOwner = user.role === "OWNER";
  const canViewAllBranches = isOwner || user.role === "INVENTORY_MANAGER";
  const branchFilter = canViewAllBranches
    ? {}
    : user.branchId
      ? { branchId: user.branchId }
      : { branchId: "__NO_BRANCH__" };

  const stockRecords = await prisma.branchStock.findMany({
    where: { ...branchFilter, item: { isActive: true } },
    include: { item: true, branch: true },
    orderBy: [{ branch: { name: "asc" } }, { item: { name: "asc" } }],
  });

  const branches = await prisma.branch.findMany({
    where: canViewAllBranches ? undefined : user.branchId ? { id: user.branchId } : { id: "__NO_BRANCH__" },
    orderBy: { name: "asc" },
  });

  const transferBranches = canViewAllBranches
    ? await prisma.branch.findMany({ orderBy: { name: "asc" } })
    : [];

  const items = await prisma.item.findMany({
    where: { isActive: true, ...(user.businessId ? { businessId: user.businessId } : {}) },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell user={{ username: user.username, name: user.name, role: user.role, branchName: user.branch?.name ?? null }}>
      <InventoryClient
        user={{ role: user.role, username: user.username, branchId: user.branchId, branchName: user.branch?.name ?? null }}
        stockRecords={stockRecords}
        branches={branches}
        transferBranches={transferBranches}
        items={items}
      />
    </AppShell>
  );
}
