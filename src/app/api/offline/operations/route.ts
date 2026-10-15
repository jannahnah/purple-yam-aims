import { NextResponse } from "next/server";
import { adjustStock, transferStock } from "@/app/actions/inventory";
import { logProductionRun } from "@/app/actions/production";

type OperationBody = {
  requestId?: unknown;
  userId?: unknown;
  type?: unknown;
  payload?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OperationBody;
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const userId = typeof body.userId === "string" ? body.userId : "";
    const type = typeof body.type === "string" ? body.type : "";
    const payload =
      body.payload && typeof body.payload === "object"
        ? (body.payload as Record<string, unknown>)
        : null;

    if (!requestId || requestId.length < 8 || requestId.length > 128 || !userId || !payload) {
      return NextResponse.json({ success: false, error: "Invalid queued operation data." }, { status: 400 });
    }

    if (type === "ADJUSTMENT" || type === "STOCK_RECEIPT") {
      const branchId = typeof payload.branchId === "string" ? payload.branchId : "";
      const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
      const quantity = typeof payload.quantity === "number" ? payload.quantity : Number.NaN;
      const physicalCount = typeof payload.physicalCount === "number" ? payload.physicalCount : undefined;
      if (!branchId || !itemId || !Number.isFinite(quantity) || (physicalCount !== undefined && !Number.isFinite(physicalCount))) {
        return NextResponse.json({ success: false, error: "Invalid queued stock adjustment." }, { status: 400 });
      }
      await adjustStock({
        branchId,
        itemId,
        quantity,
        type,
        physicalCount,
        requestId,
        expectedUserId: userId,
      });
    } else if (type === "TRANSFER") {
      const sourceBranchId = typeof payload.sourceBranchId === "string" ? payload.sourceBranchId : "";
      const destinationBranchId = typeof payload.destinationBranchId === "string" ? payload.destinationBranchId : "";
      const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
      const quantity = typeof payload.quantity === "number" ? payload.quantity : Number.NaN;
      if (!sourceBranchId || !destinationBranchId || !itemId || !Number.isFinite(quantity)) {
        return NextResponse.json({ success: false, error: "Invalid queued stock transfer." }, { status: 400 });
      }
      await transferStock({ sourceBranchId, destinationBranchId, itemId, quantity, requestId, expectedUserId: userId });
    } else if (type === "PRODUCTION") {
      const branchId = typeof payload.branchId === "string" ? payload.branchId : "";
      const finishedItemId = typeof payload.finishedItemId === "string" ? payload.finishedItemId : "";
      const producedQuantity = typeof payload.producedQuantity === "number" ? payload.producedQuantity : Number.NaN;
      if (!branchId || !finishedItemId || !Number.isInteger(producedQuantity) || producedQuantity <= 0) {
        return NextResponse.json({ success: false, error: "Invalid queued production run." }, { status: 400 });
      }
      await logProductionRun({ branchId, finishedItemId, producedQuantity, requestId, expectedUserId: userId });
    } else {
      return NextResponse.json({ success: false, error: "Unsupported queued operation type." }, { status: 400 });
    }

    return NextResponse.json({ success: true, requestId, message: "Operation synchronized successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to synchronize operation.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
