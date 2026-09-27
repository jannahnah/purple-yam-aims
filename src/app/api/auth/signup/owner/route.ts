import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createUsernameBase(email: string) {
  const localPart = email.split("@")[0] || "owner";
  const normalized = localPart.replace(/[^a-zA-Z0-9_]/g, "");
  return normalized.slice(0, 30) || "owner";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password =
      typeof body.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    if (!name) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid business email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const business = await prisma.business.findUnique({
      where: { id: "purple-yam" },
      select: { id: true },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business setup is incomplete. Please contact the system administrator." },
        { status: 500 }
      );
    }

    const ownerExists = await prisma.user.count({
      where: { businessId: business.id, role: "OWNER" },
    });

    if (ownerExists > 0) {
      return NextResponse.json(
        {
          error:
            "An Owner account already exists. Please ask the current Owner to create your account.",
        },
        { status: 409 }
      );
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const usernameBase = createUsernameBase(email);

    const result = await prisma.$transaction(async (tx) => {
      let username = usernameBase;
      let suffix = 1;

      while (await tx.user.findUnique({ where: { username } })) {
        const suffixText = String(suffix);
        username =
          usernameBase.slice(0, Math.max(1, 30 - suffixText.length)) +
          suffixText;
        suffix += 1;
      }

      const user = await tx.user.create({
        data: {
          username,
          name,
          email,
          password: passwordHash,
          role: "OWNER",
          status: "ACTIVE",
          mustChangePassword: false,
          branchId: null,
          businessId: business.id,
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
        },
      });

      await tx.userAuditLog.create({
        data: {
          userId: user.id,
          performedById: user.id,
          action: "SELF_REGISTER",
          field: "user",
          previousValue: null,
          currentValue: user.username,
        },
      });

      return user;
    });

    return NextResponse.json(
      { success: true, user: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/signup/owner error:", error);

    return NextResponse.json(
      { error: "Unable to create the Owner account." },
      { status: 500 }
    );
  }
}
