import { requireRole } from "@/lib/auth/authorization";
import ReorderAlertsClient from "./ReorderAlertsClient";

export default async function ReorderAlertsPage() {
  const user = await requireRole("OWNER", "BRANCH_MANAGER");

  return (
    <ReorderAlertsClient
      currentUser={{
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId,
      }}
    />
  );
}