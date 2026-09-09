import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";
import { NextResponse } from "next/server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function generateUsername(email: string) {
  const base =
    email
      .split("@")[0]
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .slice(0, 30) || "user";

  let username = base;
  let counter = 1;

  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}_${counter}`;
    counter++;
  }

  return username;
}

// GET /api/users
// Owner: list users with optional filters
// Manager/Cashier: own profile only
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Non-Owners may only retrieve themselves.
    if (currentUser.role !== "OWNER") {
      const user = await prisma.user.findUnique({
        where: {
          id: currentUser.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          branchId: true,
          branch: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
          createdAt: true,
          lastLoginAt: true,
        },
      });

      return NextResponse.json(user ? [user] : []);
    }

    if (!currentUser.businessId) {
      return NextResponse.json(
        { error: "Your account is not associated with a business." },
        { status: 400 }
      );
    }

    const branchId = searchParams.get("branchId");
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const users = await prisma.user.findMany({
      where: {
        businessId: currentUser.businessId,
        ...(branchId ? { branchId } : {}),
        ...(role &&
        ["OWNER", "BRANCH_MANAGER", "CASHIER"].includes(role)
          ? {
              role: role as "OWNER" | "BRANCH_MANAGER" | "CASHIER",
            }
          : {}),
        ...(status &&
        ["ACTIVE", "INACTIVE"].includes(status)
          ? {
              status: status as "ACTIVE" | "INACTIVE",
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users error:", error);

    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 }
    );
  }
}

// POST /api/users
// Owner only
export async function POST(request: Request) {
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
        { error: "Only the Owner can create users." },
        { status: 403 }
      );
    }

    if (!currentUser.businessId) {
      return NextResponse.json(
        { error: "Your account is not associated with a business." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? normalizeEmail(body.email)
        : "";

    const role =
      typeof body.role === "string"
        ? body.role
        : "";

    const branchId =
      typeof body.branchId === "string"
        ? body.branchId
        : null;

    if (!name) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const validRoles = [
      "OWNER",
      "BRANCH_MANAGER",
      "CASHIER",
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid user role." },
        { status: 400 }
      );
    }

    // Owner does not require a branch.
    // Branch Manager and Cashier must have one.
    if (role !== "OWNER" && !branchId) {
      return NextResponse.json(
        {
          error:
            "A branch assignment is required for Branch Manager and Cashier users.",
        },
        { status: 400 }
      );
    }

    // If a branch is supplied, make sure it belongs to this business.
    if (branchId) {
      const branch = await prisma.branch.findFirst({
        where: {
          id: branchId,
          businessId: currentUser.businessId,
        },
      });

      if (!branch) {
        return NextResponse.json(
          { error: "Selected branch was not found." },
          { status: 404 }
        );
      }
    }

    const existingEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    const username = await generateUsername(email);

    /*
     * Temporary development password.
     *
     * The final PRD calls for an invite/temporary-password
     * email and first-login password change.
     *
     * Email delivery will be implemented separately.
     */
    const temporaryPassword =
      typeof body.temporaryPassword === "string" &&
      body.temporaryPassword.length >= 8
        ? body.temporaryPassword
        : "Temp1234!";

    const password = await hashPassword(temporaryPassword);

    const newUser = await prisma.user.create({
      data: {
        username,
        name,
        email,
        password,
        role: role as "OWNER" | "BRANCH_MANAGER" | "CASHIER",
        status: "ACTIVE",
        branchId,
        businessId: currentUser.businessId,
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
      },
    });

    /*
     * Do not store the temporary password in the database
     * or audit log.
     *
     * For development testing, return whether a temporary
     * password was generated.
     */
    return NextResponse.json(
      {
        user: newUser,
        temporaryPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/users error:", error);

    return NextResponse.json(
      { error: "Failed to create user." },
      { status: 500 }
    );
  }
}