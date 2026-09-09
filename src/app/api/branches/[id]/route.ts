import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// PUT /api/branches/{id}
// Owner only
export async function PUT(
  request: Request,
  context: RouteContext
) {
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
        { error: "Only the Owner can edit branches." },
        { status: 403 }
      );
    }

    if (!currentUser.businessId) {
      return NextResponse.json(
        { error: "Your account is not associated with a business." },
        { status: 400 }
      );
    }

    const { id } = await context.params;
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
        id,
        businessId: currentUser.businessId,
      },
    });

    if (!existingBranch) {
      return NextResponse.json(
        { error: "Branch not found." },
        { status: 404 }
      );
    }

    const duplicateName = await prisma.branch.findFirst({
      where: {
        businessId: currentUser.businessId,
        name: {
          equals: name,
          mode: "insensitive",
        },
        NOT: {
          id,
        },
      },
    });

    if (duplicateName) {
      return NextResponse.json(
        { error: "A branch with this name already exists." },
        { status: 409 }
      );
    }

    // If this branch becomes the commissary,
    // remove the commissary designation from the previous one.
    if (isCommissary && !existingBranch.isCommissary) {
      await prisma.branch.updateMany({
        where: {
          businessId: currentUser.businessId,
          isCommissary: true,
          NOT: {
            id,
          },
        },
        data: {
          isCommissary: false,
        },
      });
    }

    const updatedBranch = await prisma.branch.update({
      where: {
        id,
      },
      data: {
        name,
        location,
        isCommissary,
      },
    });

    return NextResponse.json(updatedBranch);
  } catch (error) {
    console.error("PUT /api/branches/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to update branch." },
      { status: 500 }
    );
  }
}