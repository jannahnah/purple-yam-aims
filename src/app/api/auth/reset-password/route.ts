import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_MAX_AGE } from "@/lib/auth/session";
import {
  hashResetToken,
  isResetTokenExpired,
} from "@/lib/auth/reset-code";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";
    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";
    const resetToken =
      typeof body.resetToken === "string"
        ? body.resetToken.trim()
        : "";

    if (!email || !resetToken) {
      return NextResponse.json(
        { error: "Password recovery session is invalid." },
        { status: 400 }
      );
    }

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation are required." },
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

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        businessId: true,
        passwordResetTokenHash: true,
        passwordResetTokenExpiresAt: true,
      },
    });

    if (!user || user.role !== "OWNER" || user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Password recovery session is invalid." },
        { status: 400 }
      );
    }

    if (
      !user.passwordResetTokenHash ||
      isResetTokenExpired(user.passwordResetTokenExpiresAt) ||
      user.passwordResetTokenHash !== hashResetToken(resetToken)
    ) {
      return NextResponse.json(
        { error: "Password recovery session is invalid or expired." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: passwordHash,
          mustChangePassword: false,
          passwordResetCodeHash: null,
          passwordResetExpiresAt: null,
          passwordResetAttempts: 0,
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAt: null,
        },
      });

      await tx.userAuditLog.create({
        data: {
          userId: user.id,
          performedById: user.id,
          action: "FORGOT_PASSWORD_RESET",
          field: "password",
          previousValue: "[PROTECTED]",
          currentValue: "[PROTECTED]",
        },
      });
    });

    const sessionToken = createSessionToken(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set("purple_yam_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error);

    return NextResponse.json(
      { error: "Unable to reset password." },
      { status: 500 }
    );
  }
}
