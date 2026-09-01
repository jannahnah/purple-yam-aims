"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface IngredientUsage {
  itemId: string;
  quantity: number;
}

export async function logProductionRun({
  branchId,
  finishedItemId,
  producedQuantity,
  ingredients,
  userId,
}: {
  branchId: string;
  finishedItemId: string;
  producedQuantity: number;
  ingredients: IngredientUsage[];
  userId?: string;
}) {
  if (producedQuantity <= 0) {
    throw new Error("Produced quantity must be greater than zero.");
  }

  // Fallback to the first active user if userId is omitted
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
    // 1. Deduct raw materials used in production
    for (const ingredient of ingredients) {
      const stock = await tx.branchStock.findUnique({
        where: {
          branchId_itemId: {
            branchId,
            itemId: ingredient.itemId,
          },
        },
      });

      if (!stock || stock.quantity < ingredient.quantity) {
        throw new Error(
          `Insufficient stock for raw material ID: ${ingredient.itemId}`
        );
      }

      await tx.branchStock.update({
        where: {
          id: stock.id,
        },
        data: {
          quantity: {
            decrement: ingredient.quantity,
          },
        },
      });

      await tx.stockTransaction.create({
        data: {
          type: "PRODUCTION",
          quantityDelta: -ingredient.quantity,
          branch: {
            connect: {
              id: branchId,
            },
          },
          item: {
            connect: {
              id: ingredient.itemId,
            },
          },
          user: {
            connect: {
              id: activeUserId,
            },
          },
        },
      });
    }

    // 2. Increment finished-product stock
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

    await tx.stockTransaction.create({
      data: {
        type: "PRODUCTION",
        quantityDelta: producedQuantity,
        branch: {
          connect: {
            id: branchId,
          },
        },
        item: {
          connect: {
            id: finishedItemId,
          },
        },
        user: {
          connect: {
            id: activeUserId,
          },
        },
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}