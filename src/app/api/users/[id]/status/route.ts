import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// PATCH /api/users/[id]/status
// Owner only
// Used to activate/deactivate accounts.
// Users are never hard-deleted.
export async function PATCH(
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
        { error: "Only the Owner can change user status." },
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

    const status =
      typeof body.status === "string"
        ? body.status
        : "";

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid status. Use ACTIVE or INACTIVE.",
        },
        { status: 400 }
      );
    }

    // Prevent the Owner from accidentally deactivating
    // their own account.
    if (id === currentUser.id && status === "INACTIVE") {
      return NextResponse.json(
        {
          error:
            "You cannot deactivate your own account.",
        },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        businessId: currentUser.businessId,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (targetUser.status === status) {
      return NextResponse.json(
        {
          error: `User is already ${status.toLowerCase()}.`,
        },
        { status: 409 }
      );
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id,
        },
        data: {
          status: status as "ACTIVE" | "INACTIVE",
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          status: true,
          branchId: true,
          businessId: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      await tx.userAuditLog.create({
        data: {
          userId: id,
          performedById: currentUser.id,
          action:
            status === "ACTIVE"
              ? "ACTIVATE"
              : "DEACTIVATE",
          field: "status",
          previousValue: targetUser.status,
          currentValue: status,
        },
      });

      return user;
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(
      "PATCH /api/users/[id]/status error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to update user status." },
      { status: 500 }
    );
  }
}