import { prisma } from "@/lib/prisma";

/**
 * Synchronizes a branch item's reorder alert with its current stock.
 *
 * LOW / OUT OF STOCK:
 * quantity <= item's minimum threshold
 *
 * NORMAL:
 * quantity > item's minimum threshold
 */
export async function updateReorderAlert(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  branchId: string,
  itemId: string,
  quantity: number
) {
  const item = await tx.item.findUnique({
    where: {
      id: itemId,
    },
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
          status: "PENDING",
        },
      });
    }
  } else if (existingAlert) {
    await tx.reorderAlert.update({
      where: {
        id: existingAlert.id,
      },
      data: {
        status: "RESOLVED",
      },
    });
  }
}