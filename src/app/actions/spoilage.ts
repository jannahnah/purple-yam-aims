"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessBranch } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import { updateReorderAlert } from "@/lib/reorder-alerts";

export async function logSpoilage(input: { branchId: string; itemId: string; quantity: number; reason: string }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be logged in.");
  if (!["OWNER", "BRANCH_MANAGER", "INVENTORY_MANAGER", "PRODUCTION_STAFF"].includes(currentUser.role)) {
    throw new Error("You do not have permission to log spoiled stock.");
  }
  if (!input.branchId || !input.itemId || !Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("Choose an item and enter a quantity greater than zero.");
  }
  const reason = input.reason.trim();
  if (!reason) throw new Error("Please provide a reason for the spoilage.");
  if (reason.length > 500) throw new Error("Reason must be 500 characters or fewer.");
  if (currentUser.role === "BRANCH_MANAGER" && currentUser.branchId !== input.branchId) {
    throw new Error("You can only log spoilage for your assigned branch.");
  }
  if (currentUser.role === "PRODUCTION_STAFF" && currentUser.branchId !== input.branchId) {
    throw new Error("You can only log spoilage for your assigned branch.");
  }
  if (!canAccessBranch(currentUser, input.branchId)) throw new Error("You cannot access this branch.");

  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findFirst({ where: { id: input.itemId, isActive: true } });
    if (!item) throw new Error("The selected item is unavailable.");
    if (currentUser.businessId && item.businessId !== currentUser.businessId) throw new Error("This item does not belong to your business.");
    const branch = await tx.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) throw new Error("Branch not found.");
    const stock = await tx.branchStock.findUnique({ where: { branchId_itemId: { branchId: input.branchId, itemId: input.itemId } } });
    const previousQuantity = stock?.quantity ?? 0;
    if (input.quantity > previousQuantity) throw new Error(`Cannot spoil ${input.quantity} ${item.unit}; only ${previousQuantity} ${item.unit} is in stock.`);
    const newQuantity = previousQuantity - input.quantity;
    const updated = await tx.branchStock.upsert({
      where: { branchId_itemId: { branchId: input.branchId, itemId: input.itemId } },
      update: { quantity: newQuantity },
      create: { branchId: input.branchId, itemId: input.itemId, quantity: newQuantity },
    });
    await tx.stockTransaction.create({
      data: { type: "SPOILAGE", quantityDelta: -input.quantity, previousQuantity, newQuantity: updated.quantity, reason, branchId: input.branchId, itemId: input.itemId, userId: currentUser.id },
    });
    await updateReorderAlert(tx, input.branchId, input.itemId, updated.quantity);
  });

  revalidatePath("/spoilage");
  revalidatePath("/inventory");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/production");
}
