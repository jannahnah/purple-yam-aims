import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (
      currentUser.role !== "OWNER" &&
      currentUser.role !== "BRANCH_MANAGER" &&
      currentUser.role !== "PRODUCTION_STAFF"
    ) {
      return NextResponse.json({ error: "You do not have permission to view production recipes." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const finishedItemId = searchParams.get("finishedItemId");
    const requestedBranchId = searchParams.get("branchId");

    const branchId = currentUser.role === "OWNER" ? requestedBranchId : currentUser.branchId;
    if (!branchId && currentUser.role !== "OWNER") {
      return NextResponse.json({ error: "Your account is not assigned to a branch." }, { status: 403 });
    }
    if (currentUser.role === "OWNER" && !branchId) {
      return NextResponse.json({ error: "branchId is required." }, { status: 400 });
    }
    if (!finishedItemId) {
      return NextResponse.json({ error: "finishedItemId is required." }, { status: 400 });
    }

    const finishedItem = await prisma.item.findFirst({
      where: {
        id: finishedItemId,
        isActive: true,
        sourceType: "FINISHED_PRODUCT",
        ...(currentUser.businessId ? { businessId: currentUser.businessId } : {}),
      },
      select: { id: true, name: true, unit: true, sourceType: true, size: true },
    });

    if (!finishedItem) {
      return NextResponse.json({ error: "Finished product not found." }, { status: 404 });
    }

    const recipe = await prisma.productionRecipe.findMany({
      where: { finishedItemId },
      include: {
        ingredientItem: { select: { id: true, name: true, unit: true } },
      },
    });

    if (recipe.length === 0) {
      return NextResponse.json({
        finishedItem,
        ingredients: [],
        message: "No production recipe exists for this product.",
      });
    }

    const stocks = await prisma.branchStock.findMany({
      where: {
        branchId: branchId!,
        itemId: { in: recipe.map((row) => row.ingredientItemId) },
      },
      select: { itemId: true, quantity: true },
    });
    const stockMap = new Map(stocks.map((stock) => [stock.itemId, stock.quantity]));

    return NextResponse.json({
      finishedItem,
      ingredients: recipe.map((row) => ({
        itemId: row.ingredientItem.id,
        name: row.ingredientItem.name,
        unit: row.ingredientItem.unit,
        requiredPerUnit: row.requiredQuantity,
        availableQuantity: stockMap.has(row.ingredientItemId) ? stockMap.get(row.ingredientItemId) : null,
      })),
    });
  } catch (error) {
    console.error("GET /api/inventory/production-recipe error:", error);
    return NextResponse.json({ error: "Failed to load production recipe." }, { status: 500 });
  }
}
