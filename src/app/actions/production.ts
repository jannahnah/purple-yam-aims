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
  requestId,
  expectedUserId,
}: {
  branchId: string;
  finishedItemId: string;
  producedQuantity: number;
  requestId?: string;
  expectedUserId?: string;
}) {
  if (
    !Number.isInteger(producedQuantity) ||
    producedQuantity <= 0
  ) {
    throw new Error(
      "Produced quantity must be a whole number greater than zero."
    );
  }

  if (requestId !== undefined && (requestId.length < 8 || requestId.length > 128)) {
    throw new Error("Invalid offline operation request ID.");
  }
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("You must be logged in.");
  }
  if (expectedUserId && currentUser.id !== expectedUserId) {
    throw new Error("This queued operation belongs to a different user. Sign in with the original account to synchronize it.");
  }

  if (
    currentUser.role !== "OWNER" &&
    currentUser.role !== "BRANCH_MANAGER"
  ) {
    throw new Error(
      "You do not have permission to record production."
    );
  }

  if (!canAccessBranch(currentUser, branchId)) {
    throw new Error(
      "You do not have permission to record production for this branch."
    );
  }

  await prisma.$transaction(async (tx) => {
    const operationPayload = { branchId, finishedItemId, producedQuantity };
    if (requestId) {
      const existing = await tx.offlineOperation.findUnique({ where: { requestId } });
      if (existing) {
        const existingPayload = existing.payload as Record<string, unknown>;
        const payloadMismatch = Object.keys(operationPayload).some((key) => existingPayload[key] !== operationPayload[key]);
        if (existing.operationType !== "PRODUCTION" || existing.userId !== currentUser.id || payloadMismatch) {
          throw new Error("This request ID was already used for a different operation.");
        }
        return;
      }
    }
    const branch = await tx.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new Error("Branch not found.");
    }

    const finishedItem = await tx.item.findUnique({
      where: { id: finishedItemId },
    });

    if (!finishedItem) {
      throw new Error(
        "Finished-product item not found."
      );
    }

    if (
      !finishedItem.isActive
    ) {
      throw new Error("The selected finished product is deleted or inactive.");
    }

    if (
      finishedItem.sourceType !==
      "FINISHED_PRODUCT"
    ) {
      throw new Error(
        "The selected item is not a finished product."
      );
    }

    const normalizedUnit =
      finishedItem.unit.trim().toLowerCase();

    if (
      (normalizedUnit === "pcs" ||
        normalizedUnit === "cans") &&
      !Number.isInteger(producedQuantity)
    ) {
      throw new Error(
        `Production quantity must be a whole number for products measured in ${finishedItem.unit}.`
      );
    }

    const recipe =
      await tx.productionRecipe.findMany({
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

    const requirements = recipe.map(
      (recipeItem) => ({
        itemId: recipeItem.ingredientItemId,
        itemName: recipeItem.ingredientItem.name,
        unit: recipeItem.ingredientItem.unit,
        requiredQuantity:
          recipeItem.requiredQuantity *
          producedQuantity,
      })
    );

    // Check every ingredient before changing anything.
    for (const requirement of requirements) {
      const ingredientItem = await tx.item.findUnique({
        where: { id: requirement.itemId },
        select: { isActive: true },
      });

      if (!ingredientItem?.isActive) {
        throw new Error(
          `Production ingredient ${requirement.itemName} is deleted or inactive.`
        );
      }

      const stock =
        await tx.branchStock.findUnique({
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

      if (
        stock.quantity <
        requirement.requiredQuantity
      ) {
        throw new Error(
          `Insufficient stock for ${requirement.itemName}. ` +
            `Required: ${requirement.requiredQuantity} ${requirement.unit}, ` +
            `Available: ${stock.quantity} ${requirement.unit}.`
        );
      }
    }

    // Deduct ingredients.
    for (const requirement of requirements) {
      /*
       * Capture the stock BEFORE the production deduction.
       */
      const existingStock =
        await tx.branchStock.findUnique({
          where: {
            branchId_itemId: {
              branchId,
              itemId: requirement.itemId,
            },
          },
        });

      if (!existingStock) {
        throw new Error(
          `No stock record exists for ${requirement.itemName}.`
        );
      }

      const previousQuantity =
        existingStock.quantity;

      const updatedStock =
        await tx.branchStock.update({
          where: {
            branchId_itemId: {
              branchId,
              itemId: requirement.itemId,
            },
          },
          data: {
            quantity: {
              decrement:
                requirement.requiredQuantity,
            },
          },
        });

      if (updatedStock.quantity < 0) {
        throw new Error(
          "Ingredient stock cannot become negative."
        );
      }

      /*
       * Synchronize the ingredient's reorder alert
       * using the new stock quantity.
       */
      await updateReorderAlert(
        tx,
        branchId,
        requirement.itemId,
        updatedStock.quantity
      );

      /*
       * Record complete production history:
       *
       * Previous -> Change -> New
       */
      await tx.stockTransaction.create({
        data: {
          type: "PRODUCTION",
          quantityDelta:
            -requirement.requiredQuantity,
          previousQuantity,
          newQuantity: updatedStock.quantity,
          branchId,
          itemId: requirement.itemId,
          userId: currentUser.id,
        },
      });
    }

    /*
     * Get the existing finished-product stock BEFORE
     * adding the newly produced quantity.
     *
     * If no stock exists yet, the previous quantity
     * is treated as zero.
     */
    const existingFinishedStock =
      await tx.branchStock.findUnique({
        where: {
          branchId_itemId: {
            branchId,
            itemId: finishedItemId,
          },
        },
      });

    const previousFinishedQuantity =
      existingFinishedStock?.quantity ?? 0;

    // Add finished product.
    const updatedFinishedStock =
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

    /*
     * Synchronize the finished product's reorder alert
     * using the new stock quantity.
     */
    await updateReorderAlert(
      tx,
      branchId,
      finishedItemId,
      updatedFinishedStock.quantity
    );

    /*
     * Record complete production history:
     *
     * Previous -> Change -> New
     */
    await tx.stockTransaction.create({
      data: {
        type: "PRODUCTION",
        quantityDelta: producedQuantity,
        previousQuantity:
          previousFinishedQuantity,
        newQuantity:
          updatedFinishedStock.quantity,
        branchId,
        itemId: finishedItemId,
        userId: currentUser.id,
      },
    });
    if (requestId) {
      await tx.offlineOperation.create({ data: { requestId, operationType: "PRODUCTION", userId: currentUser.id, payload: operationPayload } });
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}