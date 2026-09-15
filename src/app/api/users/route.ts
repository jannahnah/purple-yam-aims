import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";
import { NextResponse } from "next/server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string) {
  return username.trim();
}

function normalizeBranchName(branchName: string) {
  return branchName.trim().replace(/\s+/g, " ");
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
          username: true,
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
        {
          error: "Your account is not associated with a business.",
        },
        { status: 400 }
      );
    }

    const branchId = searchParams.get("branchId");
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const users = await prisma.user.findMany({
      where: {
        businessId: currentUser.businessId,

        ...(branchId
          ? {
              branchId,
            }
          : {}),

        ...(role &&
        ["OWNER", "BRANCH_MANAGER", "CASHIER"].includes(role)
          ? {
              role: role as
                | "OWNER"
                | "BRANCH_MANAGER"
                | "CASHIER",
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
        username: true,
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
      {
        error: "Failed to fetch users.",
      },
      { status: 500 }
    );
  }
}

// POST /api/users
// Owner only
//
// Creates a Branch Manager or Cashier account.
// The Owner provides a branch name.
// If the branch already exists for the Owner's business,
// the existing branch is used.
// If it does not exist, a new branch is created.
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
        {
          error: "Only the Owner can create users.",
        },
        { status: 403 }
      );
    }

    if (!currentUser.businessId) {
      return NextResponse.json(
        {
          error: "Your account is not associated with a business.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const username =
      typeof body.username === "string"
        ? normalizeUsername(body.username)
        : "";

    const email =
      typeof body.email === "string"
        ? normalizeEmail(body.email)
        : "";

    const role =
      typeof body.role === "string"
        ? body.role
        : "";

    const branchName =
      typeof body.branchName === "string"
        ? normalizeBranchName(body.branchName)
        : "";

    const temporaryPassword =
      typeof body.temporaryPassword === "string"
        ? body.temporaryPassword
        : "";

    // -----------------------------
    // Validation
    // -----------------------------

    if (!name) {
      return NextResponse.json(
        {
          error: "Full name is required.",
        },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        {
          error: "Username is required.",
        },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-30 characters and may only contain letters, numbers, and underscores.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error: "Email is required.",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          error: "Please enter a valid email address.",
        },
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
        {
          error: "Invalid user role.",
        },
        { status: 400 }
      );
    }

    // This Create Staff Account screen is intended
    // for Branch Manager and Cashier accounts.
    if (role !== "OWNER" && !branchName) {
      return NextResponse.json(
        {
          error:
            "A branch assignment is required for Branch Manager and Cashier users.",
        },
        { status: 400 }
      );
    }

    // Owner accounts should not be assigned to branches.
    if (role === "OWNER" && branchName) {
      return NextResponse.json(
        {
          error:
            "Owner accounts cannot be assigned to a branch.",
        },
        { status: 400 }
      );
    }

    if (temporaryPassword.length < 8) {
      return NextResponse.json(
        {
          error:
            "Temporary password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // Duplicate checks
    // -----------------------------

    const existingEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingEmail) {
      return NextResponse.json(
        {
          error:
            "A user with this email already exists.",
        },
        { status: 409 }
      );
    }

    const existingUsername = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (existingUsername) {
      return NextResponse.json(
        {
          error:
            "A user with this username already exists.",
        },
        { status: 409 }
      );
    }

    // -----------------------------
    // Hash password
    // -----------------------------

    const password = await hashPassword(
      temporaryPassword
    );

    // -----------------------------
    // Create user + branch + audit log
    // -----------------------------

    const result = await prisma.$transaction(
      async (tx) => {
        let resolvedBranchId: string | null = null;

        // Branch Manager and Cashier must belong to a branch.
        if (role !== "OWNER") {
          // Look for an existing branch belonging to
          // the Owner's business.
          const existingBranch =
            await tx.branch.findFirst({
              where: {
                businessId: currentUser.businessId,
                name: {
                  equals: branchName,
                  mode: "insensitive",
                },
              },
              select: {
                id: true,
              },
            });

          if (existingBranch) {
            // Use the existing branch.
            resolvedBranchId = existingBranch.id;
          } else {
            // Create the branch if it does not exist.
            const newBranch =
              await tx.branch.create({
                data: {
                  name: branchName,
                  location: null,
                  isCommissary: false,
                  businessId: currentUser.businessId,
                },
                select: {
                  id: true,
                },
              });

            resolvedBranchId = newBranch.id;
          }
        }

        const newUser = await tx.user.create({
          data: {
            username,
            name,
            email,
            password,
            role: role as
              | "OWNER"
              | "BRANCH_MANAGER"
              | "CASHIER",
            status: "ACTIVE",
            branchId: resolvedBranchId,
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

            branch: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        });

        await tx.userAuditLog.create({
          data: {
            userId: newUser.id,
            performedById: currentUser.id,
            action: "CREATE",
            field: "user",
            previousValue: null,
            currentValue: username,
          },
        });

        return newUser;
      }
    );

    return NextResponse.json(
      {
        user: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/users error:", error);

    return NextResponse.json(
      {
        error: "Failed to create user.",
      },
      { status: 500 }
    );
  }
}