import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessBranch } from "@/lib/auth/authorization";
import { logProductionRun } from "@/app/actions/production";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (
      currentUser.role !== "OWNER" &&
      currentUser.role !== "BRANCH_MANAGER"
    ) {
      return NextResponse.json(
        { error: "You do not have permission to record production." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const branchId =
      typeof body.branchId === "string"
        ? body.branchId
        : "";

    const finishedProductItemId =
      typeof body.finishedProductItemId === "string"
        ? body.finishedProductItemId
        : "";

    const finishedProductQuantity =
      typeof body.finishedProductQuantity === "number"
        ? body.finishedProductQuantity
        : Number.NaN;

    if (
      !branchId ||
      !finishedProductItemId ||
      !Number.isFinite(finishedProductQuantity) ||
      finishedProductQuantity <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid production data." },
        { status: 400 }
      );
    }

    if (!canAccessBranch(currentUser, branchId)) {
      return NextResponse.json(
        { error: "You cannot record production for this branch." },
        { status: 403 }
      );
    }

    /*
     * Production is recipe-driven. The authenticated server action
     * resolves the recipe, validates stock, updates both sides of
     * inventory atomically, records before/change/after history,
     * and synchronizes reorder alerts.
     *
     * The legacy rawMaterials payload is intentionally ignored so
     * clients cannot override approved recipe quantities.
     */
    await logProductionRun({
      branchId,
      finishedItemId: finishedProductItemId,
      producedQuantity: finishedProductQuantity,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Production recorded successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Production failed.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
