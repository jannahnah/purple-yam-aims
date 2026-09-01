import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ProductionInput = {
  branchId: string;
  userId: string;
  finishedProductItemId: string;
  finishedProductQuantity: number;
  rawMaterials: {
    itemId: string;
    quantity: number;
  }[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProductionInput;

    const {
      branchId,
      userId,
      finishedProductItemId,
      finishedProductQuantity,
      rawMaterials,
    } = body;

    if (
      !branchId ||
      !userId ||
      !finishedProductItemId ||
      !Number.isFinite(finishedProductQuantity) ||
      finishedProductQuantity <= 0 ||
      !Array.isArray(rawMaterials) ||
      rawMaterials.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid production data." },
        { status: 400 }
      );
    }

    for (const material of rawMaterials) {
      if (
        !material.itemId ||
        !Number.isFinite(material.quantity) ||
        material.quantity <= 0
      ) {
        return NextResponse.json(
          { error: "Invalid raw-material quantity." },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(
  async (tx: Prisma.TransactionClient) => {
      const branch = await tx.branch.findUnique({
        where: { id: branchId },
      });

      if (!branch) {
        throw new Error("Branch not found.");
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found.");
      }

      const finishedProduct = await tx.item.findUnique({
        where: { id: finishedProductItemId },
      });

      if (!finishedProduct) {
        throw new Error("Finished-product item not found.");
      }

      if (finishedProduct.sourceType !== "FINISHED_PRODUCT") {
        throw new Error(
          "The selected finished-product item is not a finished product."
        );
      }

      const materialIds = rawMaterials.map((material) => material.itemId);

      const materials = await tx.item.findMany({
        where: {
          id: {
            in: materialIds,
          },
        },
      });

      if (materials.length !== materialIds.length) {
        throw new Error("One or more raw-material items were not found.");
      }

      for (const material of rawMaterials) {
        const stock = await tx.branchStock.findUnique({
          where: {
            branchId_itemId: {
              branchId,
              itemId: material.itemId,
            },
          },
        });

        if (!stock) {
          throw new Error(
            `No stock record exists for raw material ${material.itemId}.`
          );
        }

        if (stock.quantity < material.quantity) {
          throw new Error(
            `Insufficient stock for raw material ${material.itemId}.`
          );
        }
      }

      for (const material of rawMaterials) {
        await tx.branchStock.update({
          where: {
            branchId_itemId: {
              branchId,
              itemId: material.itemId,
            },
          },
          data: {
            quantity: {
              decrement: material.quantity,
            },
          },
        });

        await tx.stockTransaction.create({
          data: {
            type: "PRODUCTION",
            quantityDelta: -material.quantity,
            branchId,
            itemId: material.itemId,
            userId,
          },
        });
      }

      await tx.branchStock.upsert({
        where: {
          branchId_itemId: {
            branchId,
            itemId: finishedProductItemId,
          },
        },
        update: {
          quantity: {
            increment: finishedProductQuantity,
          },
        },
        create: {
          branchId,
          itemId: finishedProductItemId,
          quantity: finishedProductQuantity,
        },
      });

      const finishedTransaction = await tx.stockTransaction.create({
        data: {
          type: "PRODUCTION",
          quantityDelta: finishedProductQuantity,
          branchId,
          itemId: finishedProductItemId,
          userId,
        },
      });

      return {
        transactionId: finishedTransaction.id,
        finishedProductItemId,
        finishedProductQuantity,
        rawMaterials,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Production recorded successfully.",
        production: result,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Production failed.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
