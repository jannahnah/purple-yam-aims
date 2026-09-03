"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessBranch } from "@/lib/auth/authorization";

export async function recordSale({
  branchId,
  finishedItemId,
  soldQuantity,
}: {
  branchId: string;
  finishedItemId: string;
  soldQuantity: number;
}) {
  if (
    !Number.isInteger(soldQuantity) ||
    soldQuantity <= 0
  ) {
    throw new Error(
      "Sale quantity must be a whole number greater than zero."
    );
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("You must be logged in.");
  }

  if (
    currentUser.role !== "OWNER" &&
    currentUser.role !== "BRANCH_MANAGER" &&
    currentUser.role !== "CASHIER"
  ) {
    throw new Error(
      "You do not have permission to record sales."
    );
  }

  if (!canAccessBranch(currentUser, branchId)) {
    throw new Error(
      "You can only record sales for your assigned branch."
    );
  }

  await prisma.$transaction(async (tx) => {
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
      finishedItem.sourceType !==
      "FINISHED_PRODUCT"
    ) {
      throw new Error(
        "The selected item is not a finished product."
      );
    }

    const stock =
      await tx.branchStock.findUnique({
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

    const updatedStock =
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

    if (updatedStock.quantity < 0) {
      throw new Error(
        "Stock quantity cannot be negative."
      );
    }

    await tx.stockTransaction.create({
      data: {
        type: "SALE",
        quantityDelta: -soldQuantity,
        branchId,
        itemId: finishedItemId,
        userId: currentUser.id,
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}