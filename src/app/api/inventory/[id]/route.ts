import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type AdjustmentInput = {
  quantityDelta: number;
  userId: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as AdjustmentInput;

    const { quantityDelta, userId } = body;

    if (
      !Number.isFinite(quantityDelta) ||
      quantityDelta === 0 ||
      !userId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A non-zero quantityDelta and userId are required.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const stock = await tx.branchStock.findUnique({
        where: {
          id,
        },
      });

      if (!stock) {
        throw new Error("Inventory record not found.");
      }

      const user = await tx.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        throw new Error("User not found.");
      }

      const newQuantity = stock.quantity + quantityDelta;

      if (newQuantity < 0) {
        throw new Error("Insufficient stock.");
      }

      const updatedStock = await tx.branchStock.update({
        where: {
          id,
        },
        data: {
          quantity: newQuantity,
        },
      });

      const transaction = await tx.stockTransaction.create({
        data: {
          type: "ADJUSTMENT",
          quantityDelta,
          branchId: stock.branchId,
          itemId: stock.itemId,
          userId,
        },
      });

      return {
        stock: updatedStock,
        transaction,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Inventory adjusted successfully.",
      inventory: result.stock,
      transaction: result.transaction,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Inventory adjustment failed.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}