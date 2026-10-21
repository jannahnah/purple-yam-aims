"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessBranch } from "@/lib/auth/authorization";
import { updateReorderAlert } from "@/lib/reorder-alerts";

export async function logProductionRun({
  branchId,
  finishedItemId,
  producedQuantity,
}: {
  branchId: string;
  finishedItemId: string;
  producedQuantity: number;
}) {
  if (!Number.isInteger(producedQuantity) || producedQuantity <= 0) {
    throw new Error("Produced quantity must be a whole number greater than zero.");
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("You must be logged in.");
  }

  if (
    currentUser.role !== "OWNER" &&
    currentUser.role !== "BRANCH_MANAGER" &&
    currentUser.role !== "PRODUCTION_STAFF"
  ) {
    throw new Error("You do not have permission to record production.");
  }

  if (!canAccessBranch(currentUser, branchId)) {
    throw new Error("You do not have permission to record production for this branch.");
  }

  await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new Error("Branch not found.");

    const finishedItem = await tx.item.findUnique({ where: { id: finishedItemId } });
    if (!finishedItem) throw new Error("Finished-product item not found.");
    if (!finishedItem.isActive) throw new Error("The selected finished product is deleted or inactive.");
    if (finishedItem.sourceType !== "FINISHED_PRODUCT") {
      throw new Error("The selected item is not a finished product.");
    }

    const normalizedUnit = finishedItem.unit.trim().toLowerCase();
    if ((normalizedUnit === "pcs" || normalizedUnit === "cans") && !Number.isInteger(producedQuantity)) {
      throw new Error(`Production quantity must be a whole number for products measured in ${finishedItem.unit}.`);
    }

    const recipe = await tx.productionRecipe.findMany({
      where: { finishedItemId },
      include: { ingredientItem: true },
    });
    if (recipe.length === 0) throw new Error("No production recipe exists for the selected finished product.");

    const requirements = recipe.map((recipeItem) => ({
      itemId: recipeItem.ingredientItemId,
      itemName: recipeItem.ingredientItem.name,
      unit: recipeItem.ingredientItem.unit,
      requiredQuantity: recipeItem.requiredQuantity * producedQuantity,
    }));

    for (const requirement of requirements) {
      const ingredientItem = await tx.item.findUnique({
        where: { id: requirement.itemId },
        select: { isActive: true },
      });
      if (!ingredientItem?.isActive) {
        throw new Error(`Production ingredient ${requirement.itemName} is deleted or inactive.`);
      }

      const stock = await tx.branchStock.findUnique({
        where: { branchId_itemId: { branchId, itemId: requirement.itemId } },
      });
      if (!stock) throw new Error(`No stock record exists for ${requirement.itemName}.`);
      if (stock.quantity < requirement.requiredQuantity) {
        throw new Error(
          `Insufficient stock for ${requirement.itemName}. Required: ${requirement.requiredQuantity} ${requirement.unit}, Available: ${stock.quantity} ${requirement.unit}.`
        );
      }
    }

    for (const requirement of requirements) {
      const existingStock = await tx.branchStock.findUnique({
        where: { branchId_itemId: { branchId, itemId: requirement.itemId } },
      });
      if (!existingStock) throw new Error(`No stock record exists for ${requirement.itemName}.`);

      const previousQuantity = existingStock.quantity;
      const updatedStock = await tx.branchStock.update({
        where: { branchId_itemId: { branchId, itemId: requirement.itemId } },
        data: { quantity: { decrement: requirement.requiredQuantity } },
      });
      if (updatedStock.quantity < 0) throw new Error("Ingredient stock cannot become negative.");

      await updateReorderAlert(tx, branchId, requirement.itemId, updatedStock.quantity);
      await tx.stockTransaction.create({
        data: {
          type: "PRODUCTION",
          quantityDelta: -requirement.requiredQuantity,
          previousQuantity,
          newQuantity: updatedStock.quantity,
          branchId,
          itemId: requirement.itemId,
          userId: currentUser.id,
        },
      });
    }

    const existingFinishedStock = await tx.branchStock.findUnique({
      where: { branchId_itemId: { branchId, itemId: finishedItemId } },
    });
    const previousFinishedQuantity = existingFinishedStock?.quantity ?? 0;

    const updatedFinishedStock = await tx.branchStock.upsert({
      where: { branchId_itemId: { branchId, itemId: finishedItemId } },
      update: { quantity: { increment: producedQuantity } },
      create: { branchId, itemId: finishedItemId, quantity: producedQuantity },
    });

    await updateReorderAlert(tx, branchId, finishedItemId, updatedFinishedStock.quantity);
    await tx.stockTransaction.create({
      data: {
        type: "PRODUCTION",
        quantityDelta: producedQuantity,
        previousQuantity: previousFinishedQuantity,
        newQuantity: updatedFinishedStock.quantity,
        branchId,
        itemId: finishedItemId,
        userId: currentUser.id,
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/manager-dashboard");
  revalidatePath("/production-dashboard");
  revalidatePath("/transactions");
}
