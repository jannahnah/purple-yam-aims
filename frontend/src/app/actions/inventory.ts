"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
  let activeUserId = userId;
  if (!activeUserId) {
    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      throw new Error("No user account found to attribute this transaction to.");
    }
    activeUserId = defaultUser.id;
  }

  await prisma.$transaction(async (tx) => {
    await tx.branchStock.upsert({
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

    await tx.stockTransaction.create({
      data: {
        type,
        quantityDelta: quantity,
        branch: { connect: { id: branchId } },
        item: { connect: { id: itemId } },
        user: { connect: { id: activeUserId } },
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
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
      throw new Error("No user account found to attribute this transaction to.");
    }
    activeUserId = defaultUser.id;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Check source stock
    const sourceStock = await tx.branchStock.findUnique({
      where: {
        branchId_itemId: { branchId: sourceBranchId, itemId },
      },
    });

    if (!sourceStock || sourceStock.quantity < quantity) {
      throw new Error("Insufficient stock at source branch.");
    }

    // 2. Deduct from source branch
    await tx.branchStock.update({
      where: { id: sourceStock.id },
      data: { quantity: { decrement: quantity } },
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

    // 3. Add to destination branch
    await tx.branchStock.upsert({
      where: {
        branchId_itemId: { branchId: destinationBranchId, itemId },
      },
      update: { quantity: { increment: quantity } },
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
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}