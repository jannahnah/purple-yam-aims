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
    const item = await tx.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error("Item not found.");
    }

    const branch = await tx.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new Error("Branch not found.");
    }

    const updatedStock = await tx.branchStock.upsert({
      where: {
        branchId_itemId: {
          branchId,
          itemId,
        },
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
      create: {
        branchId,
        itemId,
        quantity,
      },
    });

    // Never allow stock to become negative.
    if (updatedStock.quantity < 0) {
      throw new Error("Stock quantity cannot be negative.");
    }

    await tx.stockTransaction.create({
      data: {
        type,
        quantityDelta: quantity,
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
  // Transfer quantities must always be positive.
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

  /*
   * Both transaction records use the same transferId.
   * This allows TRANSFER_OUT and TRANSFER_IN to be
   * identified as one transfer event in Records.
   */
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

    /*
     * Deduct stock from source branch.
     */
    const updatedSourceStock = await tx.branchStock.update({
      where: {
        id: sourceStock.id,
      },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });

    // Never allow source stock to become negative.
    if (updatedSourceStock.quantity < 0) {
      throw new Error("Source stock cannot become negative.");
    }

    /*
     * Record the source side of the transfer.
     *
     * This is intentionally TRANSFER_OUT rather than
     * ADJUSTMENT because this is a stock transfer.
     */
    await tx.stockTransaction.create({
      data: {
        type: "TRANSFER_OUT",
        quantityDelta: -quantity,
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
          quantity: {
            increment: quantity,
          },
        },
        create: {
          branchId: destinationBranchId,
          itemId,
          quantity,
        },
      });

    /*
     * Record the destination side of the transfer.
     *
     * This is intentionally TRANSFER_IN rather than
     * STOCK_RECEIPT because this stock came from another
     * branch, not from a normal stock receipt.
     */
    await tx.stockTransaction.create({
      data: {
        type: "TRANSFER_IN",
        quantityDelta: quantity,
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