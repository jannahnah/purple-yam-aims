"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Create a pending reorder alert when stock is at/below
 * the item's minimum threshold.
 *
 * If stock is above the threshold, any existing pending
 * alert for that branch/item is resolved.
 */
async function updateReorderAlert(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  branchId: string,
  itemId: string,
  quantity: number
) {
  const item = await tx.item.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new Error("Item not found.");
  }

  const existingAlert = await tx.reorderAlert.findFirst({
    where: {
      branchId,
      itemId,
      status: "PENDING",
    },
  });

  if (quantity <= item.minThreshold) {
    // Do not create duplicate pending alerts.
    if (!existingAlert) {
      await tx.reorderAlert.create({
        data: {
          branch: { connect: { id: branchId } },
          item: { connect: { id: itemId } },
          status: "PENDING",
        },
      });
    }
  } else if (existingAlert) {
    // Stock has recovered above the threshold.
    await tx.reorderAlert.update({
      where: { id: existingAlert.id },
      data: {
        status: "RESOLVED",
      },
    });
  }
}

export async function adjustStock({
  branchId,
  itemId,
  quantity,
  type = "ADJUSTMENT",
  userId,
}: {
  branchId: string;
  itemId: string;
  quantity: number;
  type?: "ADJUSTMENT" | "STOCK_RECEIPT" | "SALE" | "PRODUCTION";
  userId?: string;
}) {
  if (quantity === 0) {
    throw new Error("Stock adjustment quantity cannot be zero.");
  }

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
    const updatedStock = await tx.branchStock.upsert({
      where: {
        branchId_itemId: { branchId, itemId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        branchId,
        itemId,
        quantity,
      },
    });

    // Protect against negative inventory.
    if (updatedStock.quantity < 0) {
      throw new Error("Stock quantity cannot be negative.");
    }

    await tx.stockTransaction.create({
      data: {
        type,
        quantityDelta: quantity,
        branch: { connect: { id: branchId } },
        item: { connect: { id: itemId } },
        user: { connect: { id: activeUserId } },
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
  userId,
}: {
  sourceBranchId: string;
  destinationBranchId: string;
  itemId: string;
  quantity: number;
  userId?: string;
}) {
  if (quantity <= 0) {
    throw new Error("Transfer quantity must be greater than zero.");
  }

  if (sourceBranchId === destinationBranchId) {
    throw new Error("Source and destination branches must be different.");
  }

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
    // 1. Check source stock
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

    // 2. Deduct from source branch
    const updatedSourceStock = await tx.branchStock.update({
      where: { id: sourceStock.id },
      data: {
        quantity: { decrement: quantity },
      },
    });

    await tx.stockTransaction.create({
      data: {
        type: "ADJUSTMENT",
        quantityDelta: -quantity,
        branch: { connect: { id: sourceBranchId } },
        item: { connect: { id: itemId } },
        user: { connect: { id: activeUserId } },
      },
    });

    // Check whether source branch now needs replenishment.
    await updateReorderAlert(
      tx,
      sourceBranchId,
      itemId,
      updatedSourceStock.quantity
    );

    // 3. Add to destination branch
    const updatedDestinationStock = await tx.branchStock.upsert({
      where: {
        branchId_itemId: {
          branchId: destinationBranchId,
          itemId,
        },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        branchId: destinationBranchId,
        itemId,
        quantity,
      },
    });

    await tx.stockTransaction.create({
      data: {
        type: "STOCK_RECEIPT",
        quantityDelta: quantity,
        branch: { connect: { id: destinationBranchId } },
        item: { connect: { id: itemId } },
        user: { connect: { id: activeUserId } },
      },
    });

    // Destination may have recovered from a previous low-stock state.
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