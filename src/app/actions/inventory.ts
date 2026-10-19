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
}: {
  branchId: string;
  itemId: string;
  quantity: number;
  type?: "ADJUSTMENT" | "STOCK_RECEIPT";
}) {
  // Zero quantities are never valid.
  if (quantity === 0) {
    throw new Error("Stock adjustment quantity cannot be zero.");
  }

  // Stock receipts must always increase stock.
  if (type === "STOCK_RECEIPT" && quantity < 0) {
    throw new Error("Stock receipt quantity must be greater than zero.");
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("You must be logged in.");
  }

  if (
    currentUser.role !== "OWNER" &&
    currentUser.role !== "BRANCH_MANAGER" &&
    currentUser.role !== "INVENTORY_MANAGER"
  ) {
    throw new Error("You do not have permission to adjust stock.");
  }

  if (!canAccessBranch(currentUser, branchId)) {
    throw new Error(
      "You do not have permission to modify stock for this branch."
    );
  }

  await prisma.$transaction(async (tx) => {
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
    const newQuantity = previousQuantity + quantity;

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
        quantityDelta: quantity,
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
}: {
  sourceBranchId: string;
  destinationBranchId: string;
  itemId: string;
  quantity: number;
}) {
  if (quantity <= 0) {
    throw new Error("Transfer quantity must be greater than zero.");
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
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function adjustStockBatch({
  branchId, entries,
}: {
  branchId: string;
  entries: Array<{ itemId: string; quantity: number; type: "ADJUSTMENT" | "STOCK_RECEIPT" }>;
}) {
  if (!branchId || !Array.isArray(entries) || entries.length === 0) throw new Error("Select a branch and add at least one item.");
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry.itemId || seen.has(entry.itemId)) throw new Error("Each item may only appear once in a batch.");
    seen.add(entry.itemId);
    if (!Number.isFinite(entry.quantity) || entry.quantity < 0) throw new Error("All quantities must be valid non-negative numbers.");
    if (entry.type === "STOCK_RECEIPT" && entry.quantity <= 0) throw new Error("Received quantities must be greater than zero.");
    if (entry.type !== "ADJUSTMENT" && entry.type !== "STOCK_RECEIPT") throw new Error("Invalid stock action type.");
  }
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be logged in.");
  if (currentUser.role !== "OWNER" && currentUser.role !== "BRANCH_MANAGER" && currentUser.role !== "INVENTORY_MANAGER") throw new Error("You do not have permission to adjust stock.");
  if (!canAccessBranch(currentUser, branchId)) throw new Error("You do not have permission to modify stock for this branch.");
  await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new Error("Branch not found.");
    for (const entry of entries) {
      const item = await tx.item.findUnique({ where: { id: entry.itemId } });
      if (!item || !item.isActive) throw new Error("One or more selected items are unavailable or inactive.");
      const existing = await tx.branchStock.findUnique({ where: { branchId_itemId: { branchId, itemId: entry.itemId } } });
      const previousQuantity = existing?.quantity ?? 0;
      const quantityDelta = entry.type === "ADJUSTMENT" ? entry.quantity - previousQuantity : entry.quantity;
      if (quantityDelta === 0) throw new Error("No change is needed for " + item.name + "; its quantity is unchanged.");
      const newQuantity = previousQuantity + quantityDelta;
      if (newQuantity < 0) throw new Error("Stock quantity cannot be negative for " + item.name + ".");
      const updated = await tx.branchStock.upsert({
        where: { branchId_itemId: { branchId, itemId: entry.itemId } },
        update: { quantity: newQuantity },
        create: { branchId, itemId: entry.itemId, quantity: newQuantity },
      });
      await tx.stockTransaction.create({ data: { type: entry.type, quantityDelta, previousQuantity, newQuantity: updated.quantity, branchId, itemId: entry.itemId, userId: currentUser.id } });
      await updateReorderAlert(tx, branchId, entry.itemId, updated.quantity);
    }
  });
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}
