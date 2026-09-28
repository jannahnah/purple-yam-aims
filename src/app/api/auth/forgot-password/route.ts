import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createResetCode } from "@/lib/auth/reset-code";
import { sendPasswordResetCodeEmail } from "@/lib/auth/email";

const GENERIC_RESPONSE = {
  success: true,
  message: "If the registered Owner email is valid, a verification code has been sent.",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        { error: "Owner email is required." },
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
      },
    });

    if (!user || user.role !== "OWNER" || user.status !== "ACTIVE") {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const { code, codeHash, expiresAt } = createResetCode();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: expiresAt,
        passwordResetAttempts: 0,
      },
    });

    try {
      await sendPasswordResetCodeEmail({
        to: user.email,
        code,
      });
    } catch (emailError) {
      console.error("Owner password reset email failed:", emailError);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetCodeHash: null,
          passwordResetExpiresAt: null,
          passwordResetAttempts: 0,
        },
      });

      return NextResponse.json(
        {
          error:
            "Password recovery email is not available right now. Please contact the system administrator.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);

    return NextResponse.json(
      { error: "Unable to start password recovery." },
      { status: 500 }
    );
  }
}
