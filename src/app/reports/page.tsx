import { requireRole } from "@/lib/auth/authorization";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const user = await requireRole("OWNER", "BRANCH_MANAGER");

  return (
    <ReportsClient
      currentUser={{
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId,
      }}
    />
  );
}