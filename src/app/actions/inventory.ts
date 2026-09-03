"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getCurrentUser,
} from "@/lib/auth/current-user";
import {
  canAccessBranch,
} from "@/lib/auth/authorization";

/**
 * Create or resolve a pending reorder alert based on
 * the item's minimum stock threshold.
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
}: {
  branchId: string;
  itemId: string;
  quantity: number;
  type?: "ADJUSTMENT" | "STOCK_RECEIPT";
}) {
  if (quantity === 0) {
    throw new Error("Stock adjustment quantity cannot be zero.");
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("You must be logged in.");
  }

  if (
    currentUser.role !== "OWNER" &&
    currentUser.role !== "BRANCH_MANAGER"
  ) {
    throw new Error(
      "You do not have permission to adjust stock."
    );
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
  if (quantity <= 0) {
    throw new Error(
      "Transfer quantity must be greater than zero."
    );
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
    throw new Error(
      "You do not have permission to transfer stock."
    );
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
      throw new Error(
        "Insufficient stock at source branch."
      );
    }

    const updatedSourceStock =
      await tx.branchStock.update({
        where: {
          id: sourceStock.id,
        },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      });

    if (updatedSourceStock.quantity < 0) {
      throw new Error(
        "Source stock cannot become negative."
      );
    }

    await tx.stockTransaction.create({
      data: {
        type: "ADJUSTMENT",
        quantityDelta: -quantity,
        branchId: sourceBranchId,
        itemId,
        userId: currentUser.id,
      },
    });

    await updateReorderAlert(
      tx,
      sourceBranchId,
      itemId,
      updatedSourceStock.quantity
    );

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

    await tx.stockTransaction.create({
      data: {
        type: "STOCK_RECEIPT",
        quantityDelta: quantity,
        branchId: destinationBranchId,
        itemId,
        userId: currentUser.id,
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