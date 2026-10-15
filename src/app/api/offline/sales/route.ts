import { NextResponse } from "next/server";
import { recordSale } from "@/app/actions/sales";

/**
 * Sync endpoint for a sale saved in the browser's offline outbox.
 * The server action re-checks session, role, branch access, product status,
 * available stock, and requestId idempotency before changing inventory.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const branchId = typeof body.branchId === "string" ? body.branchId : "";
    const finishedItemId =
      typeof body.finishedItemId === "string" ? body.finishedItemId : "";
    const soldQuantity =
      typeof body.soldQuantity === "number" ? body.soldQuantity : Number.NaN;
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const userId = typeof body.userId === "string" ? body.userId : "";

    if (
      !branchId ||
      !finishedItemId ||
      !requestId ||
      !userId ||
      !Number.isInteger(soldQuantity) ||
      soldQuantity <= 0
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid queued sale data." },
        { status: 400 }
      );
    }

    await recordSale({
      branchId,
      finishedItemId,
      soldQuantity,
      requestId,
      expectedUserId: userId,
    });

    return NextResponse.json({
      success: true,
      requestId,
      message: "Sale synchronized successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to synchronize sale.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
