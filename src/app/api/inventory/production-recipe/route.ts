import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const finishedItemId = searchParams.get("finishedItemId");
    const branchId = searchParams.get("branchId");

    if (!finishedItemId) {
      return NextResponse.json(
        { error: "finishedItemId is required." },
        { status: 400 }
      );
    }

    const finishedItem = await prisma.item.findUnique({
      where: {
        id: finishedItemId,
      },
      select: {
        id: true,
        name: true,
        unit: true,
        sourceType: true,
      },
    });

    if (!finishedItem) {
      return NextResponse.json(
        { error: "Finished product not found." },
        { status: 404 }
      );
    }

    if (finishedItem.sourceType !== "FINISHED_PRODUCT") {
      return NextResponse.json(
        { error: "Selected item is not a finished product." },
        { status: 400 }
      );
    }

    const recipe = await prisma.productionRecipe.findMany({
      where: {
        finishedItemId,
      },
      include: {
        ingredientItem: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
      },
    });

    if (recipe.length === 0) {
      return NextResponse.json(
        {
          finishedItem,
          ingredients: [],
          message: "No production recipe exists for this product.",
        },
        { status: 200 }
      );
    }

    let stockMap = new Map<string, number>();

    if (branchId) {
      const stocks = await prisma.branchStock.findMany({
        where: {
          branchId,
          itemId: {
            in: recipe.map((recipeItem) => recipeItem.ingredientItemId),
          },
        },
        select: {
          itemId: true,
          quantity: true,
        },
      });

      stockMap = new Map(
        stocks.map((stock) => [stock.itemId, stock.quantity])
      );
    }

    const ingredients = recipe.map((recipeItem) => ({
      itemId: recipeItem.ingredientItem.id,
      name: recipeItem.ingredientItem.name,
      unit: recipeItem.ingredientItem.unit,
      requiredPerUnit: recipeItem.requiredQuantity,
      availableQuantity: stockMap.has(recipeItem.ingredientItemId)
        ? stockMap.get(recipeItem.ingredientItemId)
        : null,
    }));

    return NextResponse.json({
      finishedItem,
      ingredients,
    });
  } catch (error) {
    console.error("Production recipe API error:", error);

    return NextResponse.json(
      { error: "Failed to load production recipe." },
      { status: 500 }
    );
  }
}