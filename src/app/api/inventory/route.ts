import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const inventory = await prisma.branchStock.findMany({
      include: {
        branch: true,
        item: true,
      },
      orderBy: [
        {
          branch: {
            name: "asc",
          },
        },
        {
          item: {
            name: "asc",
          },
        },
      ],
    });

    const result = inventory.map((stock) => ({
      id: stock.id,
      branchId: stock.branchId,
      branch: stock.branch.name,
      itemId: stock.itemId,
      item: stock.item.name,
      sourceType: stock.item.sourceType,
      unit: stock.item.unit,
      quantity: stock.quantity,
      minThreshold: stock.item.minThreshold,
      lowStock: stock.quantity <= stock.item.minThreshold,
      updatedAt: stock.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      inventory: result,
    });
  } catch (error) {
    console.error("Inventory GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve inventory.",
      },
      { status: 500 }
    );
  }
}