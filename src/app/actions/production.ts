"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function logProductionRun({
  branchId,
  finishedItemId,
  producedQuantity,
  userId,
}: {
  branchId: string;
  finishedItemId: string;
  producedQuantity: number;
  userId?: string;
}) {
 if (
  !Number.isInteger(producedQuantity) ||
  producedQuantity <= 0
) {
    throw new Error("Produced quantity must be a whole number greater than zero.");
  }

  // Use the supplied user, or fall back to the first user.
  let activeUserId = userId;

  if (!activeUserId) {
    const defaultUser = await prisma.user.findFirst();

    if (!defaultUser) {
      throw new Error(
        "No user account found to attribute this transaction to."
      );
    }

    activeUserId = defaultUser.id;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Validate branch
    const branch = await tx.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new Error("Branch not found.");
    }

    // 2. Validate user
    const user = await tx.user.findUnique({
      where: { id: activeUserId },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    // 3. Validate finished product
    const finishedItem = await tx.item.findUnique({
      where: { id: finishedItemId },
    });

    if (!finishedItem) {
      throw new Error("Finished-product item not found.");
    }

    if (finishedItem.sourceType !== "FINISHED_PRODUCT") {
      throw new Error(
        "The selected item is not a finished product."
      );
    }

    const normalizedUnit = finishedItem.unit.trim().toLowerCase();

  if (
    (normalizedUnit === "pcs" || normalizedUnit === "cans") &&
    !Number.isInteger(producedQuantity)
  ) {
    throw new Error(
      `Production quantity must be a whole number for products measured in ${finishedItem.unit}.`
    );
  }

    // 4. Get the approved production recipe
    const recipe = await tx.productionRecipe.findMany({
      where: {
        finishedItemId,
      },
      include: {
        ingredientItem: true,
      },
    });

    if (recipe.length === 0) {
      throw new Error(
        "No production recipe exists for the selected finished product."
      );
    }

    // 5. Calculate all required ingredients
    const requirements = recipe.map((recipeItem) => ({
      itemId: recipeItem.ingredientItemId,
      itemName: recipeItem.ingredientItem.name,
      unit: recipeItem.ingredientItem.unit,
      requiredQuantity:
        recipeItem.requiredQuantity * producedQuantity,
    }));

    // 6. Validate all ingredient stock BEFORE changing anything
    for (const requirement of requirements) {
      const stock = await tx.branchStock.findUnique({
        where: {
          branchId_itemId: {
            branchId,
            itemId: requirement.itemId,
          },
        },
      });

      if (!stock) {
        throw new Error(
          `No stock record exists for ${requirement.itemName}.`
        );
      }

      if (stock.quantity < requirement.requiredQuantity) {
        throw new Error(
          `Insufficient stock for ${requirement.itemName}. ` +
            `Required: ${requirement.requiredQuantity} ${requirement.unit}, ` +
            `Available: ${stock.quantity} ${requirement.unit}.`
        );
      }
    }

    // 7. Deduct all ingredients
    for (const requirement of requirements) {
      await tx.branchStock.update({
        where: {
          branchId_itemId: {
            branchId,
            itemId: requirement.itemId,
          },
        },
        data: {
          quantity: {
            decrement: requirement.requiredQuantity,
          },
        },
      });

      await tx.stockTransaction.create({
        data: {
          type: "PRODUCTION",
          quantityDelta: -requirement.requiredQuantity,
          branchId,
          itemId: requirement.itemId,
          userId: activeUserId,
        },
      });
    }

    // 8. Add finished product stock
    await tx.branchStock.upsert({
      where: {
        branchId_itemId: {
          branchId,
          itemId: finishedItemId,
        },
      },
      update: {
        quantity: {
          increment: producedQuantity,
        },
      },
      create: {
        branchId,
        itemId: finishedItemId,
        quantity: producedQuantity,
      },
    });

    // 9. Record finished-product transaction
    const finishedTransaction = await tx.stockTransaction.create({
      data: {
        type: "PRODUCTION",
        quantityDelta: producedQuantity,
        branchId,
        itemId: finishedItemId,
        userId: activeUserId,
      },
    });

    return {
      transactionId: finishedTransaction.id,
      finishedProduct: {
        id: finishedItem.id,
        name: finishedItem.name,
        quantity: producedQuantity,
        unit: finishedItem.unit,
      },
      ingredients: requirements,
    };
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}