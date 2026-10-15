"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessBranch } from "@/lib/auth/authorization";
import { updateReorderAlert } from "@/lib/reorder-alerts";

export async function recordSale({
  branchId,
  finishedItemId,
  soldQuantity,
  requestId,
  expectedUserId,
}: {
  branchId: string;
  finishedItemId: string;
  soldQuantity: number;
  requestId?: string;
  expectedUserId?: string;
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

  if (expectedUserId && currentUser.id !== expectedUserId) {
    throw new Error("This queued sale belongs to a different user. Sign in with the original account to synchronize it.");
  }

  if (!canAccessBranch(currentUser, branchId)) {
    throw new Error(
      "You can only record sales for your assigned branch."
    );
  }

  if (requestId !== undefined && (requestId.length < 8 || requestId.length > 128)) {
    throw new Error("Invalid sale request ID.");
  }

  await prisma.$transaction(async (tx) => {
    // Replays of a queued offline sale must not decrement stock twice.
    if (requestId) {
      const existingTransaction = await tx.stockTransaction.findUnique({
        where: { requestId },
      });

      if (existingTransaction) {
        const sameSale =
          existingTransaction.type === "SALE" &&
          existingTransaction.branchId === branchId &&
          existingTransaction.itemId === finishedItemId &&
          existingTransaction.quantityDelta === -soldQuantity &&
          existingTransaction.userId === currentUser.id;

        if (!sameSale) {
          throw new Error("This sale request ID was already used for a different transaction.");
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

    if (!finishedItem.isActive) {
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

    /*
     * Capture the stock BEFORE the sale.
     */
    const previousQuantity = stock.quantity;

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

    await updateReorderAlert(
      tx,
      branchId,
      finishedItemId,
      updatedStock.quantity
    );

    /*
     * Record complete sale history:
     *
     * Previous -> Change -> New
     */
    await tx.stockTransaction.create({
      data: {
        type: "SALE",
        quantityDelta: -soldQuantity,
        previousQuantity,
        newQuantity: updatedStock.quantity,
        branchId,
        itemId: finishedItemId,
        userId: currentUser.id,
        ...(requestId ? { requestId } : {}),
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}