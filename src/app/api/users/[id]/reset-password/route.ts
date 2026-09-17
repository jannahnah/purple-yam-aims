import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// POST /api/users/[id]/reset-password
//
// Owner: may reset any user
// Manager/Cashier: may reset only their own password
export async function POST(
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

    const { id } = await context.params;

    const isOwner = currentUser.role === "OWNER";
    const isSelf = currentUser.id === id;

    if (!isOwner && !isSelf) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to reset this user's password.",
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

    const body = await request.json();

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    if (!newPassword) {
      return NextResponse.json(
        { error: "New password is required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters long.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id,
        },
        data: {
          password: passwordHash,
          mustChangePassword: true,
        },
      });

      await tx.userAuditLog.create({
        data: {
          userId: id,
          performedById: currentUser.id,
          action: "RESET_PASSWORD",
          field: "password",
          previousValue: "[PROTECTED]",
          currentValue: "[PROTECTED]",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error(
      "POST /api/users/[id]/reset-password error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to reset password." },
      { status: 500 }
    );
  }
}