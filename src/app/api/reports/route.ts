import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    // Reports are management-level functionality.
    if (
      currentUser.role !== "OWNER" &&
      currentUser.role !== "BRANCH_MANAGER"
    ) {
      return NextResponse.json(
        { error: "You do not have permission to access reports." },
        { status: 403 }
      );
    }

    const branchWhere =
      currentUser.role === "OWNER"
        ? {}
        : {
            branchId: currentUser.branchId ?? "__NO_BRANCH__",
          };

    /*
     * Inventory
     *
     * Uses the real BranchStock + Item + Branch records.
     */
    const inventory = await prisma.branchStock.findMany({
      where: branchWhere,
      include: {
        item: true,
        branch: true,
      },
      orderBy: [
        {
          branch: {
            name: "asc",
          },
        },
        {
          item: {
            name: "asc",
          },
        },
      ],
    });

    /*
     * Transactions
     *
     * Uses the real StockTransaction audit trail.
     */
    const transactions = await prisma.stockTransaction.findMany({
      where: branchWhere,
      include: {
        item: true,
        branch: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    /*
     * Sales
     *
     * A sale is represented by a SALE StockTransaction.
     */
    const sales = transactions.filter(
      (transaction) => transaction.type === "SALE"
    );

    /*
     * Production
     *
     * Production creates:
     * - negative ingredient transactions
     * - positive finished-product transactions
     *
     * For the Production Summary, only the positive finished-product
     * transaction is treated as production output.
     */
    const production = transactions.filter(
      (transaction) =>
        transaction.type === "PRODUCTION" &&
        transaction.item.sourceType === "FINISHED_PRODUCT" &&
        transaction.quantityDelta > 0
    );

    return NextResponse.json(
      {
        inventory: inventory.map((stock) => ({
          id: stock.id,
          branch: {
            id: stock.branch.id,
            name: stock.branch.name,
          },
          item: {
            id: stock.item.id,
            name: stock.item.name,
            sourceType: stock.item.sourceType,
            unit: stock.item.unit,
            minThreshold: stock.item.minThreshold,
          },
          quantity: stock.quantity,
        })),

        sales: sales.map((transaction) => ({
          id: transaction.id,
          createdAt: transaction.createdAt.toISOString(),
          branch: {
            id: transaction.branch.id,
            name: transaction.branch.name,
          },
          item: {
            id: transaction.item.id,
            name: transaction.item.name,
            unit: transaction.item.unit,
          },
          quantity: Math.abs(transaction.quantityDelta),
          recordedBy: transaction.user.username,
        })),

        production: production.map((transaction) => ({
          id: transaction.id,
          createdAt: transaction.createdAt.toISOString(),
          branch: {
            id: transaction.branch.id,
            name: transaction.branch.name,
          },
          item: {
            id: transaction.item.id,
            name: transaction.item.name,
            unit: transaction.item.unit,
          },
          quantity: transaction.quantityDelta,
          recordedBy: transaction.user.username,
        })),

        transactions: transactions.map((transaction) => ({
          id: transaction.id,
          type: transaction.type,
          quantityDelta: transaction.quantityDelta,
          createdAt: transaction.createdAt.toISOString(),
          branch: {
            id: transaction.branch.id,
            name: transaction.branch.name,
          },
          item: {
            id: transaction.item.id,
            name: transaction.item.name,
            unit: transaction.item.unit,
            sourceType: transaction.item.sourceType,
          },
          user: {
            username: transaction.user.username,
            role: transaction.user.role,
          },
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load reports:", error);

    return NextResponse.json(
      { error: "Failed to load reports." },
      { status: 500 }
    );
  }
}