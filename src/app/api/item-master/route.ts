import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

const SOURCE_TYPES = [
  "COMMISSARY_SUPPLIED",
  "BRANCH_SOURCED",
  "FINISHED_PRODUCT",
] as const;

const CATEGORIES = ["RAW_MATERIAL", "PACKAGING"] as const;

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseThreshold(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

async function requireOwner() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      ),
    };
  }

  if (currentUser.role !== "OWNER") {
    return {
      response: NextResponse.json(
        { error: "Only the Owner can manage the Item Master." },
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

export async function GET() {
  try {
    const auth = await requireOwner();
    if ("response" in auth) return auth.response;

    const items = await prisma.item.findMany({
      where: { businessId: auth.currentUser.businessId! },
      include: {
        recipeAsFinished: {
          include: {
            ingredientItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                sourceType: true,
                category: true,
              },
            },
          },
          orderBy: { ingredientItem: { name: "asc" } },
        },
        _count: {
          select: {
            branchStocks: true,
            stockTransactions: true,
          },
        },
      },
      orderBy: [
        { sourceType: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/item-master error:", error);
    return NextResponse.json(
      { error: "Failed to load the Item Master." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireOwner();
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const name = cleanString(body.name);
    const sourceType = cleanString(body.sourceType);
    const category = cleanString(body.category);
    const unit = cleanString(body.unit);
    const threshold = parseThreshold(body.minThreshold);

    if (!name || !unit) {
      return NextResponse.json(
        { error: "Item name and unit are required." },
        { status: 400 }
      );
    }

    if (!SOURCE_TYPES.includes(sourceType as (typeof SOURCE_TYPES)[number])) {
      return NextResponse.json(
        { error: "Invalid source type." },
        { status: 400 }
      );
    }

    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return NextResponse.json(
        { error: "Invalid item category." },
        { status: 400 }
      );
    }

    if (threshold === null) {
      return NextResponse.json(
        { error: "Minimum threshold must be a number greater than or equal to zero." },
        { status: 400 }
      );
    }

    const existing = await prisma.item.findFirst({
      where: {
        businessId: auth.currentUser.businessId!,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An item with this name already exists." },
        { status: 409 }
      );
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.item.create({
        data: {
          name,
          unit,
          sourceType: sourceType as (typeof SOURCE_TYPES)[number],
          category:
            sourceType === "FINISHED_PRODUCT"
              ? "RAW_MATERIAL"
              : category as (typeof CATEGORIES)[number],
          minThreshold: threshold,
          businessId: auth.currentUser.businessId!,
        },
      });

      await tx.itemAuditLog.create({
        data: {
          itemId: created.id,
          performedById: auth.currentUser.id,
          action: "CREATE",
          field: "item",
          currentValue: created.name,
        },
      });

      return created;
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("POST /api/item-master error:", error);
    return NextResponse.json(
      { error: "Failed to create item." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireOwner();
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const id = cleanString(body.id);
    const name = cleanString(body.name);
    const sourceType = cleanString(body.sourceType);
    const category = cleanString(body.category);
    const unit = cleanString(body.unit);
    const threshold = parseThreshold(body.minThreshold);

    if (!id || !name || !unit) {
      return NextResponse.json(
        { error: "Item ID, name, and unit are required." },
        { status: 400 }
      );
    }

    if (!SOURCE_TYPES.includes(sourceType as (typeof SOURCE_TYPES)[number])) {
      return NextResponse.json(
        { error: "Invalid source type." },
        { status: 400 }
      );
    }

    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return NextResponse.json(
        { error: "Invalid item category." },
        { status: 400 }
      );
    }

    if (threshold === null) {
      return NextResponse.json(
        { error: "Minimum threshold must be a number greater than or equal to zero." },
        { status: 400 }
      );
    }

    const item = await prisma.item.findFirst({
      where: {
        id,
        businessId: auth.currentUser.businessId!,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found." },
        { status: 404 }
      );
    }

    const duplicate = await prisma.item.findFirst({
      where: {
        businessId: auth.currentUser.businessId!,
        name: {
          equals: name,
          mode: "insensitive",
        },
        NOT: { id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Another item already uses that name." },
        { status: 409 }
      );
    }

    const hasHistory = await prisma.stockTransaction.count({
      where: { itemId: id },
    });

    if (hasHistory && (unit !== item.unit || sourceType !== item.sourceType)) {
      return NextResponse.json(
        {
          error:
            "Unit and source type cannot be changed after the item has transaction history. Edit the name or threshold instead.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.item.update({
        where: { id },
        data: {
          name,
          unit,
          sourceType: sourceType as (typeof SOURCE_TYPES)[number],
          category:
            sourceType === "FINISHED_PRODUCT"
              ? "RAW_MATERIAL"
              : category as (typeof CATEGORIES)[number],
          minThreshold: threshold,
        },
      });

      const auditRows: Array<{
        itemId: string;
        performedById: string;
        action: string;
        field: string;
        previousValue: string;
        currentValue: string;
      }> = [];

      if (item.name !== saved.name) {
        auditRows.push({
          itemId: id,
          performedById: auth.currentUser.id,
          action: "UPDATE",
          field: "name",
          previousValue: item.name,
          currentValue: saved.name,
        });
      }

      if (item.category !== saved.category) {
        auditRows.push({
          itemId: id,
          performedById: auth.currentUser.id,
          action: "UPDATE",
          field: "category",
          previousValue: item.category,
          currentValue: saved.category,
        });
      }

      if (item.minThreshold !== saved.minThreshold) {
        auditRows.push({
          itemId: id,
          performedById: auth.currentUser.id,
          action: "UPDATE",
          field: "minThreshold",
          previousValue: String(item.minThreshold),
          currentValue: String(saved.minThreshold),
        });
      }

      if (auditRows.length) {
        await tx.itemAuditLog.createMany({
          data: auditRows,
        });
      }

      return saved;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/item-master error:", error);
    return NextResponse.json(
      { error: "Failed to update item." },
      { status: 500 }
    );
  }
}
