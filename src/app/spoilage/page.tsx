import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import SpoilageClient from "./SpoilageClient";

export const dynamic = "force-dynamic";

export default async function SpoilagePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!["INVENTORY_MANAGER", "PRODUCTION_STAFF"].includes(user.role)) redirect("/unauthorized");
  const canViewAll = user.role === "INVENTORY_MANAGER";
  const branches = await prisma.branch.findMany({
    where: canViewAll ? undefined : { id: user.branchId ?? "__NO_BRANCH__" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const branchId = canViewAll ? branches[0]?.id ?? "" : user.branchId ?? "";
  const items = await prisma.item.findMany({
    where: { isActive: true, ...(user.businessId ? { businessId: user.businessId } : {}) },
    select: { id: true, name: true, size: true, unit: true, sourceType: true, category: true },
    orderBy: [{ sourceType: "asc" }, { name: "asc" }, { size: "asc" }],
  });
  const recent = await prisma.stockTransaction.findMany({
    where: { type: "SPOILAGE", ...(canViewAll ? {} : { branchId: user.branchId ?? "__NO_BRANCH__" }) },
    take: 30,
    orderBy: { createdAt: "desc" },
    include: { item: { select: { name: true, size: true, unit: true } }, branch: { select: { name: true } }, user: { select: { name: true, username: true } } },
  });
  return <AppShell user={{ username: user.username, name: user.name, role: user.role, branchName: user.branch?.name ?? null }}>
    <SpoilageClient userRole={user.role} branches={branches} initialBranchId={branchId} items={items} recent={recent.map(t => ({ id: t.id, itemName: t.item.name, size: t.item.size, unit: t.item.unit, quantity: Math.abs(t.quantityDelta), reason: t.reason ?? "", branchName: t.branch.name, username: t.user.name || t.user.username, createdAt: t.createdAt.toISOString() }))} />
  </AppShell>;
}
