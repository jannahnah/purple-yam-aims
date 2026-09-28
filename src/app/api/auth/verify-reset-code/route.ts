import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashResetCode, isResetCodeExpired } from "@/lib/auth/reset-code";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : "";

    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter the 6-digit verification code." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        status: true,
        passwordResetCodeHash: true,
        passwordResetExpiresAt: true,
        passwordResetAttempts: true,
      },
    });

    if (
      !user ||
      user.role !== "OWNER" ||
      user.status !== "ACTIVE" ||
      !user.passwordResetCodeHash ||
      isResetCodeExpired(user.passwordResetExpiresAt)
    ) {
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    if (user.passwordResetAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many attempts. Request a new verification code." },
        { status: 429 }
      );
    }

    const expectedHash = user.passwordResetCodeHash;
    const providedHash = hashResetCode(code);

    if (expectedHash !== providedHash) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetAttempts: { increment: 1 },
        },
      });

      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
        passwordResetAttempts: 0,
      },
    });

    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    console.error("POST /api/auth/verify-reset-code error:", error);

    return NextResponse.json(
      { error: "Unable to verify the code." },
      { status: 500 }
    );
  }
}
