"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function recordSale({
  branchId,
  finishedItemId,
  soldQuantity,
  userId,
}: {
  branchId: string;
  finishedItemId: string;
  soldQuantity: number;
  userId?: string;
}) {
  // Finished products are sold by whole pieces.
  if (!Number.isInteger(soldQuantity) || soldQuantity <= 0) {
    throw new Error("Sale quantity must be a whole number greater than zero.");
  }

  // Use supplied user, or fall back to the first user.
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
      throw new Error("The selected item is not a finished product.");
    }

    // 4. Check available finished-product stock
    const stock = await tx.branchStock.findUnique({
      where: {
        branchId_itemId: {
          branchId,
          itemId: finishedItemId,
        },
      },
    });

    if (!stock) {
      throw new Error(
        `No stock record exists for ${finishedItem.name}.`
      );
    }

    if (stock.quantity < soldQuantity) {
      throw new Error(
        `Insufficient stock for ${finishedItem.name}. ` +
          `Requested: ${soldQuantity} ${finishedItem.unit}, ` +
          `Available: ${stock.quantity} ${finishedItem.unit}.`
      );
    }

    // 5. Deduct sold quantity
    await tx.branchStock.update({
      where: {
        branchId_itemId: {
          branchId,
          itemId: finishedItemId,
        },
      },
      data: {
        quantity: {
          decrement: soldQuantity,
        },
      },
    });

    // 6. Record sale transaction
    const transaction = await tx.stockTransaction.create({
      data: {
        type: "SALE",
        quantityDelta: -soldQuantity,
        branchId,
        itemId: finishedItemId,
        userId: activeUserId,
      },
    });

    return {
      transactionId: transaction.id,
      item: {
        id: finishedItem.id,
        name: finishedItem.name,
        quantity: soldQuantity,
        unit: finishedItem.unit,
      },
      remainingStock: stock.quantity - soldQuantity,
    };
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}