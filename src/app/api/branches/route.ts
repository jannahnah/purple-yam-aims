import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";

// GET /api/branches
// Owner: all branches
// Manager/Cashier: assigned branch only
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (currentUser.role === "PRODUCTION_STAFF") {
      return NextResponse.json(
        { error: "Production Staff may only access the production logging workspace." },
        { status: 403 }
      );
    }

    const branches = await prisma.branch.findMany({
      where:
        currentUser.role === "OWNER"
          ? {
              businessId: currentUser.businessId,
            }
          : {
              businessId: currentUser.businessId,
              id: currentUser.branchId ?? undefined,
            },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(branches);
  } catch (error) {
    console.error("GET /api/branches error:", error);

    return NextResponse.json(
      { error: "Failed to fetch branches." },
      { status: 500 }
    );
  }
}

// POST /api/branches
// Owner only
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (currentUser.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the Owner can create branches." },
        { status: 403 }
      );
    }

    if (!currentUser.businessId) {
      return NextResponse.json(
        { error: "Your account is not associated with a business." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const location =
      typeof body.location === "string"
        ? body.location.trim()
        : "";

    const isCommissary =
      typeof body.isCommissary === "boolean"
        ? body.isCommissary
        : false;

    if (!name) {
      return NextResponse.json(
        { error: "Branch name is required." },
        { status: 400 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { error: "Branch location is required." },
        { status: 400 }
      );
    }

    const existingBranch = await prisma.branch.findFirst({
      where: {
        businessId: currentUser.businessId,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existingBranch) {
      return NextResponse.json(
        { error: "A branch with this name already exists." },
        { status: 409 }
      );
    }

    // Only one branch should be designated as the commissary.
    if (isCommissary) {
      await prisma.branch.updateMany({
        where: {
          businessId: currentUser.businessId,
          isCommissary: true,
        },
        data: {
          isCommissary: false,
        },
      });
    }

    const newBranch = await prisma.branch.create({
      data: {
        name,
        location,
        isCommissary,
        businessId: currentUser.businessId,
      },
    });

    return NextResponse.json(newBranch, { status: 201 });
  } catch (error) {
    console.error("POST /api/branches error:", error);

    return NextResponse.json(
      { error: "Failed to create branch." },
      { status: 500 }
    );
  }
}