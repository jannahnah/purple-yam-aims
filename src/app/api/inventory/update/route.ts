import { NextResponse } from "next/server";
import { updateBranchStockAndAlerts } from "@/lib/stockAlertHelper";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { branchId, itemId, quantity } = body;

    if (!branchId || !itemId || quantity === undefined) {
      return NextResponse.json(
        { error: "Missing branchId, itemId, or quantity" },
        { status: 400 }
      );
    }

    const result = await updateBranchStockAndAlerts(
      branchId,
      itemId,
      Number(quantity)
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update stock and alerts" },
      { status: 500 }
    );
  }
}