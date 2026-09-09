import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/users/[id]/audit-log
// Owner only
export async function GET(
  _request: Request,
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
        {
          error:
            "Only the Owner can view user audit logs.",
        },
        { status: 403 }
      );
    }

    if (!currentUser.businessId) {
      return NextResponse.json(
        {
          error:
            "Your account is not associated with a business.",
        },
        { status: 400 }
      );
    }

    const { id } = await context.params;

    // Verify the affected user belongs to the Owner's business.
    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        businessId: currentUser.businessId,
      },
      select: {
        id: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const auditLogs = await prisma.userAuditLog.findMany({
      where: {
        userId: id,
        user: {
          businessId: currentUser.businessId,
        },
      },
      select: {
        id: true,
        action: true,
        field: true,
        previousValue: true,
        currentValue: true,
        createdAt: true,

        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(auditLogs);
  } catch (error) {
    console.error(
      "GET /api/users/[id]/audit-log error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to fetch audit logs." },
      { status: 500 }
    );
  }
}