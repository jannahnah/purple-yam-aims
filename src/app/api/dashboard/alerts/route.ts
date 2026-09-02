import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    /*
     * Get all branch stock records together with their item
     * and branch information.
     */
    const branchStocks = await prisma.branchStock.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        item: true,
        branch: true,
      },
    });

    /*
     * Synchronize reorder notifications with the current
     * inventory quantities.
     */
    await prisma.$transaction(async (tx) => {
      for (const stock of branchStocks) {
        const existingNotification = await tx.reorderAlert.findFirst({
          where: {
            branchId: stock.branchId,
            itemId: stock.itemId,
            status: "PENDING",
          },
        });

        if (stock.quantity <= stock.item.minThreshold) {
          /*
           * Stock is low or exactly at the minimum.
           * Create a notification only if one does not
           * already exist.
           */
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
        } else if (existingNotification) {
          /*
           * Stock is now above the minimum threshold.
           * Resolve the existing notification.
           */
          await tx.reorderAlert.update({
            where: {
              id: existingNotification.id,
            },
            data: {
              status: "RESOLVED",
            },
          });
        }
      }
    });

    /*
     * Fetch the current active notifications after
     * synchronization.
     */
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

    /*
     * Attach the current stock quantity to each notification.
     */
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
    console.error("Failed to synchronize stock notifications:", error);

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