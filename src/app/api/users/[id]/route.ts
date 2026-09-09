import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/users/[id]
// Owner: may view any user in the business
// Manager/Cashier: may view only their own profile
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

    const { id } = await context.params;

    if (currentUser.role !== "OWNER" && currentUser.id !== id) {
      return NextResponse.json(
        { error: "You are not authorized to view this user." },
        { status: 403 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
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
        updatedAt: true,
        lastLoginAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to fetch user." },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id]
// Owner: may edit name, email, role, and branch
// User: may edit own name/email only
export async function PUT(
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
    const body = await request.json();

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

    const isOwner = currentUser.role === "OWNER";
    const isSelf = currentUser.id === id;

    if (!isOwner && !isSelf) {
      return NextResponse.json(
        { error: "You are not authorized to edit this user." },
        { status: 403 }
      );
    }

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : targetUser.name;

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : targetUser.email;

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

    // Check duplicate email.
    if (email !== targetUser.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          NOT: {
            id,
          },
          businessId: currentUser.businessId,
        },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: "A user with this email already exists." },
          { status: 409 }
        );
      }
    }

    // Non-Owners can only change their own name/email.
    if (!isOwner) {
      const updatedUser = await prisma.user.update({
        where: {
          id,
        },
        data: {
          name,
          email,
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
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      return NextResponse.json(updatedUser);
    }

    // Owner-controlled fields.
    const role =
      typeof body.role === "string"
        ? body.role
        : targetUser.role;

    const branchId =
      body.branchId === null
        ? null
        : typeof body.branchId === "string"
          ? body.branchId
          : targetUser.branchId;

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

    // Owner must have no branch.
    if (role === "OWNER" && branchId !== null) {
      return NextResponse.json(
        {
          error:
            "Owner accounts cannot be assigned to a branch.",
        },
        { status: 400 }
      );
    }

    // Manager/Cashier must have a branch.
    if (role !== "OWNER" && !branchId) {
      return NextResponse.json(
        {
          error:
            "A branch assignment is required for Branch Manager and Cashier users.",
        },
        { status: 400 }
      );
    }

    // Verify branch belongs to the same business.
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

    const roleChanged = targetUser.role !== role;
    const branchChanged = targetUser.branchId !== branchId;
    const nameChanged = targetUser.name !== name;
    const emailChanged = targetUser.email !== email;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id,
        },
        data: {
          name,
          email,
          role: role as "OWNER" | "BRANCH_MANAGER" | "CASHIER",
          branchId,
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
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      if (nameChanged) {
        await tx.userAuditLog.create({
          data: {
            userId: id,
            performedById: currentUser.id,
            action: "UPDATE",
            field: "name",
            previousValue: targetUser.name ?? "",
            currentValue: name,
          },
        });
      }

      if (emailChanged) {
        await tx.userAuditLog.create({
          data: {
            userId: id,
            performedById: currentUser.id,
            action: "UPDATE",
            field: "email",
            previousValue: targetUser.email,
            currentValue: email,
          },
        });
      }

      if (roleChanged) {
        await tx.userAuditLog.create({
          data: {
            userId: id,
            performedById: currentUser.id,
            action: "UPDATE",
            field: "role",
            previousValue: targetUser.role,
            currentValue: role,
          },
        });
      }

      if (branchChanged) {
        await tx.userAuditLog.create({
          data: {
            userId: id,
            performedById: currentUser.id,
            action: "UPDATE",
            field: "branchId",
            previousValue: targetUser.branchId ?? "",
            currentValue: branchId ?? "",
          },
        });
      }

      return user;
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("PUT /api/users/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to update user." },
      { status: 500 }
    );
  }
}