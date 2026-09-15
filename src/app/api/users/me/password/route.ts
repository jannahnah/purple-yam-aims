import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const currentPassword =
      typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match." },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          error:
            "New password must be different from your current password.",
        },
        { status: 400 }
      );
    }

    // Retrieve the password hash only on the server.
    const user = await prisma.user.findFirst({
      where: {
        id: currentUser.id,
        businessId: currentUser.businessId,
      },
      select: {
        id: true,
        password: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This account is inactive." },
        { status: 403 }
      );
    }

    const passwordIsValid = await verifyPassword(
      currentPassword,
      user.password
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: newPasswordHash,
        },
      });

      await tx.userAuditLog.create({
        data: {
          userId: user.id,
          performedById: currentUser.id,
          action: "CHANGE_PASSWORD",
          field: "password",
          previousValue: "[PROTECTED]",
          currentValue: "[PROTECTED]",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error(
      "PUT /api/users/me/password error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to update password." },
      { status: 500 }
    );
  }
}