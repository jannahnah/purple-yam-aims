import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_MAX_AGE } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();

  const email =
      typeof body.email === "string" ? body.email.trim() : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
    { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        status: true,
        branchId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This account is inactive." },
        { status: 403 }
      );
    }

    const passwordValid = await verifyPassword(
      password,
      user.password
    );

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const sessionToken = createSessionToken(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
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
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "Unable to process login." },
      { status: 500 }
    );
  }
}