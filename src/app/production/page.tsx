import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import ProductionStaffClient from "./ProductionStaffClient";

export const dynamic = "force-dynamic";

export default async function ProductionStaffPage() {
  const user = await requireRole("PRODUCTION_STAFF");

  const assignedBranchId = user.branchId;
  if (!assignedBranchId) {
    return (
      <AppShell user={{ username: user.username, name: user.name, role: user.role, branchName: null }}>
        <div className="p-6"><h1 className="text-xl font-bold">Production Log</h1><p className="mt-2 text-red-700">This account has no assigned branch. Ask the owner to assign one.</p></div>
      </AppShell>
    );
  }

  const [branch, products, recent] = await Promise.all([
    prisma.branch.findUnique({ where: { id: assignedBranchId }, select: { id: true, name: true } }),
    prisma.item.findMany({
      where: { isActive: true, sourceType: "FINISHED_PRODUCT", ...(user.businessId ? { businessId: user.businessId } : {}) },
      select: { id: true, name: true, size: true, unit: true, recipeAsFinished: { select: { id: true }, take: 1 } },
      orderBy: [{ name: "asc" }, { size: "asc" }],
    }),
    prisma.stockTransaction.findMany({
      where: { branchId: assignedBranchId, type: "PRODUCTION", quantityDelta: { gt: 0 }, item: { sourceType: "FINISHED_PRODUCT" } },
      take: 12,
      orderBy: { createdAt: "desc" },
      include: { item: { select: { name: true, size: true, unit: true } }, user: { select: { name: true, username: true } } },
    }),
  ]);

  return (
    <AppShell user={{ username: user.username, name: user.name, role: user.role, branchName: branch?.name ?? null }}>
      <ProductionStaffClient
        branchId={assignedBranchId}
        branchName={branch?.name ?? "Assigned branch"}
        products={products.map((item) => ({ id: item.id, name: item.name, size: item.size, unit: item.unit, hasRecipe: item.recipeAsFinished.length > 0 }))}
        recent={recent.map((tx) => ({ id: tx.id, itemName: tx.item.name, size: tx.item.size, unit: tx.item.unit, quantity: tx.quantityDelta, username: tx.user.name || tx.user.username, createdAt: tx.createdAt.toISOString() }))}
      />
    </AppShell>
  );
}
