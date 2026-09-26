import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessBranch } from "@/lib/auth/authorization";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedBranchId = searchParams.get("branchId");

    let branchId: string | null = requestedBranchId;

    if (currentUser.role !== "OWNER") {
      if (!currentUser.branchId) {
        return NextResponse.json(
          { error: "You are not assigned to a branch." },
          { status: 403 }
        );
      }

      if (
        requestedBranchId &&
        !canAccessBranch(currentUser, requestedBranchId)
      ) {
        return NextResponse.json(
          { error: "You cannot access alerts for this branch." },
          { status: 403 }
        );
      }

      branchId = currentUser.branchId;
    }

    const branchStocks = await prisma.branchStock.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        item: true,
        branch: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      for (const stock of branchStocks) {
        const existingNotification =
          await tx.reorderAlert.findFirst({
            where: {
              branchId: stock.branchId,
              itemId: stock.itemId,
              status: "PENDING",
            },
          });

        if (stock.quantity <= stock.item.minThreshold) {
          if (!existingNotification) {
            await tx.reorderAlert.create({
              data: {
                branch: {
                  connect: {
                    id: stock.branchId,
                  },
                },
                item: {
                  connect: {
                    id: stock.itemId,
                  },
                },
                status: "PENDING",
              },
            });
          }
      }
    });

    const alerts = await prisma.reorderAlert.findMany({
      where: {
        status: "PENDING",
        ...(branchId ? { branchId } : {}),
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            unit: true,
            minThreshold: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const notifications = await Promise.all(
      alerts.map(async (alert) => {
        const stock = await prisma.branchStock.findUnique({
          where: {
            branchId_itemId: {
              branchId: alert.branchId,
              itemId: alert.itemId,
            },
          },
          select: {
            quantity: true,
          },
        });

        return {
          ...alert,
          currentQuantity: stock?.quantity ?? 0,
        };
      })
    );

    return NextResponse.json(notifications, {
      status: 200,
    });
  } catch (error) {
    console.error(
      "Failed to synchronize stock notifications:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load stock notifications",
      },
      {
        status: 500,
      }
    );
  }
}