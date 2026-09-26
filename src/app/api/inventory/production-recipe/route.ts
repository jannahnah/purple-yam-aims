import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessBranch } from "@/lib/auth/authorization";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (
      currentUser.role !== "OWNER" &&
      currentUser.role !== "BRANCH_MANAGER"
    ) {
      return NextResponse.json(
        { error: "You do not have permission to view production recipes." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const finishedItemId = searchParams.get("finishedItemId");
    const requestedBranchId = searchParams.get("branchId");
    const branchId =
      currentUser.role === "OWNER"
        ? requestedBranchId
        : currentUser.branchId;

    if (
      currentUser.role === "BRANCH_MANAGER" &&
      requestedBranchId &&
      !canAccessBranch(currentUser, requestedBranchId)
    ) {
      return NextResponse.json(
        { error: "You cannot access production data for this branch." },
        { status: 403 }
      );
    }

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

type RecipeInput = {
  itemId: string;
  requiredQuantity: number;
};

async function requireOwnerForRecipe() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  if (currentUser.role !== "OWNER") {
    return {
      response: NextResponse.json(
        { error: "Only the Owner can edit production recipes." },
        { status: 403 }
      ),
    };
  }

  if (!currentUser.businessId) {
    return {
      response: NextResponse.json(
        { error: "Your account is not associated with a business." },
        { status: 400 }
      ),
    };
  }

  return { currentUser };
}

function normalizeRecipe(body: unknown): RecipeInput[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { ingredients?: unknown }).ingredients)) {
    return null;
  }

  const seen = new Set<string>();
  const result: RecipeInput[] = [];

  for (const raw of (body as { ingredients: unknown[] }).ingredients) {
    if (!raw || typeof raw !== "object") return null;

    const itemId = typeof (raw as { itemId?: unknown }).itemId === "string"
      ? (raw as { itemId: string }).itemId.trim()
      : "";

    const requiredQuantity = Number(
      (raw as { requiredQuantity?: unknown }).requiredQuantity
    );

    if (!itemId || !Number.isFinite(requiredQuantity) || requiredQuantity <= 0 || seen.has(itemId)) {
      return null;
    }

    seen.add(itemId);
    result.push({ itemId, requiredQuantity });
  }

  return result.length ? result : null;
}

async function validateRecipe(
  finishedItemId: string,
  ingredients: RecipeInput[],
  businessId: string
) {
  const finishedItem = await prisma.item.findFirst({
    where: {
      id: finishedItemId,
      businessId,
      sourceType: "FINISHED_PRODUCT",
    },
  });

  if (!finishedItem) {
    return { error: "Finished product not found." as const };
  }

  const ingredientIds = ingredients.map((ingredient) => ingredient.itemId);

  const ingredientItems = await prisma.item.findMany({
    where: {
      id: { in: ingredientIds },
      businessId,
    },
    select: {
      id: true,
      name: true,
      unit: true,
      sourceType: true,
      category: true,
    },
  });

  if (ingredientItems.length !== ingredientIds.length) {
    return { error: "One or more recipe items do not exist in the Item Master." as const };
  }

  if (ingredientItems.some((item) => item.id === finishedItemId)) {
    return { error: "A finished product cannot be its own ingredient." as const };
  }

  return { finishedItem, ingredientItems };
}

export async function POST(request: Request) {
  try {
    const auth = await requireOwnerForRecipe();
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const finishedItemId = typeof body.finishedItemId === "string"
      ? body.finishedItemId.trim()
      : "";
    const ingredients = normalizeRecipe(body);

    if (!finishedItemId || !ingredients) {
      return NextResponse.json(
        { error: "A finished product and at least one valid ingredient are required." },
        { status: 400 }
      );
    }

    const validated = await validateRecipe(
      finishedItemId,
      ingredients,
      auth.currentUser.businessId!
    );

    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const previousRecipe = await tx.productionRecipe.findMany({
        where: { finishedItemId },
        orderBy: { ingredientItemId: "asc" },
        select: {
          ingredientItemId: true,
          requiredQuantity: true,
        },
      });

      await tx.productionRecipe.deleteMany({
        where: { finishedItemId },
      });

      await tx.productionRecipe.createMany({
        data: ingredients.map((ingredient) => ({
          finishedItemId,
          ingredientItemId: ingredient.itemId,
          requiredQuantity: ingredient.requiredQuantity,
        })),
      });

      await tx.itemAuditLog.create({
        data: {
          itemId: finishedItemId,
          performedById: auth.currentUser.id,
          action: "RECIPE_UPDATE",
          field: "recipe",
          previousValue: JSON.stringify(previousRecipe),
          currentValue: JSON.stringify(ingredients),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/inventory/production-recipe error:", error);
    return NextResponse.json(
      { error: "Failed to save the production recipe." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireOwnerForRecipe();
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(request.url);
    const finishedItemId = searchParams.get("finishedItemId")?.trim();

    if (!finishedItemId) {
      return NextResponse.json(
        { error: "finishedItemId is required." },
        { status: 400 }
      );
    }

    const finishedItem = await prisma.item.findFirst({
      where: {
        id: finishedItemId,
        businessId: auth.currentUser.businessId!,
        sourceType: "FINISHED_PRODUCT",
      },
      select: { id: true },
    });

    if (!finishedItem) {
      return NextResponse.json(
        { error: "Finished product not found." },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const previousRecipe = await tx.productionRecipe.findMany({
        where: { finishedItemId },
        orderBy: { ingredientItemId: "asc" },
        select: {
          ingredientItemId: true,
          requiredQuantity: true,
        },
      });

      await tx.productionRecipe.deleteMany({
        where: { finishedItemId },
      });

      await tx.itemAuditLog.create({
        data: {
          itemId: finishedItemId,
          performedById: auth.currentUser.id,
          action: "RECIPE_CLEAR",
          field: "recipe",
          previousValue: JSON.stringify(previousRecipe),
          currentValue: null,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/inventory/production-recipe error:", error);
    return NextResponse.json(
      { error: "Failed to clear the production recipe." },
      { status: 500 }
    );
  }
}
