import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessBranch } from "@/lib/auth/authorization";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedBranchId =
      searchParams.get("branchId");

    /*
     * Owners can view reorder alerts for all branches.
     *
     * Managers and Cashiers can only view alerts
     * for their assigned branch.
     */
    let branchId: string | null = requestedBranchId;

    if (currentUser.role !== "OWNER") {
      if (!currentUser.branchId) {
        return NextResponse.json(
          {
            error: "You are not assigned to a branch.",
          },
          {
            status: 403,
          }
        );
      }

      if (
        requestedBranchId &&
        !canAccessBranch(
          currentUser,
          requestedBranchId
        )
      ) {
        return NextResponse.json(
          {
            error:
              "You cannot access alerts for this branch.",
          },
          {
            status: 403,
          }
        );
      }

      branchId = currentUser.branchId;
    }

    /*
     * Synchronize current stock with pending alerts.
     *
     * This protects against alerts becoming stale if
     * stock changed through a path that did not directly
     * synchronize the alert.
     */
    const branchStocks =
      await prisma.branchStock.findMany({
        where: branchId
          ? {
              branchId,
            }
          : undefined,
        include: {
          item: true,
        },
      });

    await prisma.$transaction(async (tx) => {
      for (const stock of branchStocks) {
        const existingAlert =
          await tx.reorderAlert.findFirst({
            where: {
              branchId: stock.branchId,
              itemId: stock.itemId,
              status: "PENDING",
            },
          });

        if (
          stock.quantity <=
          stock.item.minThreshold
        ) {
          if (!existingAlert) {
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
        } else if (existingAlert) {
          await tx.reorderAlert.update({
            where: {
              id: existingAlert.id,
            },
            data: {
              status: "RESOLVED",
            },
          });
        }
      }
    });

    /*
     * Return both active and resolved alerts.
     */
    const alerts =
      await prisma.reorderAlert.findMany({
        where: branchId
          ? {
              branchId,
            }
          : undefined,
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

    /*
     * Add the current stock quantity to every alert.
     */
    const alertsWithStock = await Promise.all(
      alerts.map(async (alert) => {
        const stock =
          await prisma.branchStock.findUnique({
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
          id: alert.id,
          status: alert.status,
          createdAt: alert.createdAt,
          branch: alert.branch,
          item: alert.item,
          currentQuantity:
            stock?.quantity ?? 0,
        };
      })
    );

    return NextResponse.json(
      alertsWithStock,
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Failed to load reorder alerts:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load reorder alerts.",
      },
      {
        status: 500,
      }
    );
  }
}