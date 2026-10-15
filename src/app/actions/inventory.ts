"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessBranch } from "@/lib/auth/authorization";
import { updateReorderAlert } from "@/lib/reorder-alerts";

export async function adjustStock({
  branchId,
  itemId,
  quantity,
  type = "ADJUSTMENT",
  physicalCount,
  requestId,
  expectedUserId,
}: {
  branchId: string;
  itemId: string;
  quantity: number;
  type?: "ADJUSTMENT" | "STOCK_RECEIPT";
  physicalCount?: number;
  requestId?: string;
  expectedUserId?: string;
}) {
  if (!Number.isFinite(quantity)) {
    throw new Error("Stock quantity must be a finite number.");
  }

  // Zero quantities are never valid.
  if (physicalCount === undefined && quantity === 0) {
    throw new Error("Stock adjustment quantity cannot be zero.");
  }
  if (physicalCount !== undefined && (!Number.isFinite(physicalCount) || physicalCount < 0 || type !== "ADJUSTMENT")) {
    throw new Error("Physical count must be a non-negative quantity for an adjustment.");
  }
  if (requestId !== undefined && (requestId.length < 8 || requestId.length > 128)) {
    throw new Error("Invalid offline operation request ID.");
  }

  // Stock receipts must always increase stock.
  if (type === "STOCK_RECEIPT" && quantity < 0) {
    throw new Error("Stock receipt quantity must be greater than zero.");
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
    throw new Error("You do not have permission to adjust stock.");
  }

  if (!canAccessBranch(currentUser, branchId)) {
    throw new Error(
      "You do not have permission to modify stock for this branch."
    );
  }

  await prisma.$transaction(async (tx) => {
    const operationPayload = { branchId, itemId, type, quantity, physicalCount: physicalCount ?? null };
    if (requestId) {
      const existing = await tx.offlineOperation.findUnique({ where: { requestId } });
      if (existing) {
        const existingPayload = existing.payload as Record<string, unknown>;
        const payloadMismatch = Object.keys(operationPayload).some((key) => existingPayload[key] !== operationPayload[key]);
        if (existing.operationType !== type || existing.userId !== currentUser.id || payloadMismatch) {
          throw new Error("This request ID was already used for a different operation.");
        }
        return;
      }
    }
    const item = await tx.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error("Item not found.");
    }

    if (!item.isActive) {
      throw new Error("This item is deleted or inactive.");
    }

    const branch = await tx.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new Error("Branch not found.");
    }

    /*
     * Get the stock record BEFORE changing it.
     *
     * This value is the historical "Previous Quantity"
     * that will be stored with the transaction.
     */
    const existingStock = await tx.branchStock.findUnique({
      where: {
        branchId_itemId: {
          branchId,
          itemId,
        },
      },
    });

    const previousQuantity = existingStock?.quantity ?? 0;
    const effectiveQuantity = physicalCount !== undefined ? physicalCount - previousQuantity : quantity;
    if (effectiveQuantity === 0) {
      throw new Error("The physical quantity matches current stock. No adjustment is needed.");
    }
    const newQuantity = previousQuantity + effectiveQuantity;

    // Never allow stock to become negative.
    if (newQuantity < 0) {
      throw new Error("Stock quantity cannot be negative.");
    }

    /*
     * Update the actual branch inventory.
     */
    const updatedStock = await tx.branchStock.upsert({
      where: {
        branchId_itemId: {
          branchId,
          itemId,
        },
      },
      update: {
        quantity: newQuantity,
      },
      create: {
        branchId,
        itemId,
        quantity: newQuantity,
      },
    });

    /*
     * Record the complete inventory history:
     *
     * Previous Quantity → Change → New Quantity
     */
    await tx.stockTransaction.create({
      data: {
        type,
        quantityDelta: effectiveQuantity,
        previousQuantity,
        newQuantity: updatedStock.quantity,
        branch: {
          connect: {
            id: branchId,
          },
        },
        item: {
          connect: {
            id: itemId,
          },
        },
        user: {
          connect: {
            id: currentUser.id,
          },
        },
      },
    });

    await updateReorderAlert(
      tx,
      branchId,
      itemId,
      updatedStock.quantity
    );
    if (requestId) {
      await tx.offlineOperation.create({ data: { requestId, operationType: type, userId: currentUser.id, payload: operationPayload } });
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function transferStock({
  sourceBranchId,
  destinationBranchId,
  itemId,
  quantity,
  requestId,
  expectedUserId,
}: {
  sourceBranchId: string;
  destinationBranchId: string;
  itemId: string;
  quantity: number;
  requestId?: string;
  expectedUserId?: string;
}) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Transfer quantity must be a finite number greater than zero.");
  }
  if (requestId !== undefined && (requestId.length < 8 || requestId.length > 128)) {
    throw new Error("Invalid offline operation request ID.");
  }

  if (sourceBranchId === destinationBranchId) {
    throw new Error(
      "Source and destination branches must be different."
    );
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
    throw new Error("You do not have permission to transfer stock.");
  }

  /*
   * Owner can transfer between any branches.
   *
   * Branch Manager can only transfer FROM their
   * assigned branch.
   */
  if (
    currentUser.role !== "OWNER" &&
    currentUser.branchId !== sourceBranchId
  ) {
    throw new Error(
      "You can only transfer stock from your assigned branch."
    );
  }

  const transferId = crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    const operationPayload = { sourceBranchId, destinationBranchId, itemId, quantity };
    if (requestId) {
      const existing = await tx.offlineOperation.findUnique({ where: { requestId } });
      if (existing) {
        const existingPayload = existing.payload as Record<string, unknown>;
        const payloadMismatch = Object.keys(operationPayload).some((key) => existingPayload[key] !== operationPayload[key]);
        if (existing.operationType !== "TRANSFER" || existing.userId !== currentUser.id || payloadMismatch) {
          throw new Error("This request ID was already used for a different operation.");
        }
        return;
      }
    }
    const sourceBranch = await tx.branch.findUnique({
      where: { id: sourceBranchId },
    });

    if (!sourceBranch) {
      throw new Error("Source branch not found.");
    }

    const destinationBranch = await tx.branch.findUnique({
      where: { id: destinationBranchId },
    });

    if (!destinationBranch) {
      throw new Error("Destination branch not found.");
    }

    const item = await tx.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error("Item not found.");
    }
    if (!item.isActive) {
      throw new Error("This item is deleted or inactive.");
    }

    /*
     * Get SOURCE stock before changing it.
     *
     * This becomes the Previous Quantity for
     * the TRANSFER_OUT transaction.
     */
    const sourceStock = await tx.branchStock.findUnique({
      where: {
        branchId_itemId: {
          branchId: sourceBranchId,
          itemId,
        },
      },
    });

    if (!sourceStock || sourceStock.quantity < quantity) {
      throw new Error("Insufficient stock at source branch.");
    }

    const previousSourceQuantity = sourceStock.quantity;
    const newSourceQuantity =
      previousSourceQuantity - quantity;

    /*
     * Deduct stock from source branch.
     */
    const updatedSourceStock =
      await tx.branchStock.update({
        where: {
          id: sourceStock.id,
        },
        data: {
          quantity: newSourceQuantity,
        },
      });

    if (updatedSourceStock.quantity < 0) {
      throw new Error("Source stock cannot become negative.");
    }

    /*
     * Record TRANSFER_OUT history.
     *
     * Previous → Change → New
     */
    await tx.stockTransaction.create({
      data: {
        type: "TRANSFER_OUT",
        quantityDelta: -quantity,
        previousQuantity: previousSourceQuantity,
        newQuantity: updatedSourceStock.quantity,
        branchId: sourceBranchId,
        itemId,
        userId: currentUser.id,
        transferId,
        transferBranchId: destinationBranchId,
      },
    });

    await updateReorderAlert(
      tx,
      sourceBranchId,
      itemId,
      updatedSourceStock.quantity
    );

    /*
     * Get DESTINATION stock before changing it.
     *
     * If no stock record exists yet, its previous
     * quantity is considered 0.
     */
    const destinationStock =
      await tx.branchStock.findUnique({
        where: {
          branchId_itemId: {
            branchId: destinationBranchId,
            itemId,
          },
        },
      });

    const previousDestinationQuantity =
      destinationStock?.quantity ?? 0;

    const newDestinationQuantity =
      previousDestinationQuantity + quantity;

    /*
     * Add stock to destination branch.
     */
    const updatedDestinationStock =
      await tx.branchStock.upsert({
        where: {
          branchId_itemId: {
            branchId: destinationBranchId,
            itemId,
          },
        },
        update: {
          quantity: newDestinationQuantity,
        },
        create: {
          branchId: destinationBranchId,
          itemId,
          quantity: newDestinationQuantity,
        },
      });

    /*
     * Record TRANSFER_IN history.
     *
     * Previous → Change → New
     */
    await tx.stockTransaction.create({
      data: {
        type: "TRANSFER_IN",
        quantityDelta: quantity,
        previousQuantity: previousDestinationQuantity,
        newQuantity: updatedDestinationStock.quantity,
        branchId: destinationBranchId,
        itemId,
        userId: currentUser.id,
        transferId,
        transferBranchId: sourceBranchId,
      },
    });

    await updateReorderAlert(
      tx,
      destinationBranchId,
      itemId,
      updatedDestinationStock.quantity
    );
    if (requestId) {
      await tx.offlineOperation.create({ data: { requestId, operationType: "TRANSFER", userId: currentUser.id, payload: operationPayload } });
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}