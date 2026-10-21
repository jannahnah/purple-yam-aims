import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessBranch } from "@/lib/auth/authorization";
import { logProductionRun } from "@/app/actions/production";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (
      currentUser.role !== "OWNER" &&
      currentUser.role !== "BRANCH_MANAGER" &&
      currentUser.role !== "PRODUCTION_STAFF"
    ) {
      return NextResponse.json({ error: "You do not have permission to record production." }, { status: 403 });
    }

    const body = await request.json();
    const requestedBranchId = typeof body.branchId === "string" ? body.branchId : "";
    const branchId = currentUser.role === "PRODUCTION_STAFF"
      ? currentUser.branchId ?? ""
      : requestedBranchId;
    const finishedProductItemId = typeof body.finishedProductItemId === "string" ? body.finishedProductItemId : "";
    const finishedProductQuantity = typeof body.finishedProductQuantity === "number" ? body.finishedProductQuantity : Number.NaN;

    if (
      !branchId ||
      !finishedProductItemId ||
      !Number.isFinite(finishedProductQuantity) ||
      finishedProductQuantity <= 0 ||
      !Number.isInteger(finishedProductQuantity)
    ) {
      return NextResponse.json({ error: "Invalid production data." }, { status: 400 });
    }

    // Staff branch is resolved from the server session, never trusted from the request.
    const effectiveBranchId = currentUser.role === "PRODUCTION_STAFF" ? currentUser.branchId : branchId;
    if (!effectiveBranchId) {
      return NextResponse.json({ error: "Your account is not assigned to a branch." }, { status: 403 });
    }

    if (!canAccessBranch(currentUser, effectiveBranchId)) {
      return NextResponse.json({ error: "You cannot record production for this branch." }, { status: 403 });
    }

    await logProductionRun({
      branchId: effectiveBranchId,
      finishedItemId: finishedProductItemId,
      producedQuantity: finishedProductQuantity,
    });

    return NextResponse.json({ success: true, message: "Production recorded successfully." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Production failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
