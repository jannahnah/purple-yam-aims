import { requireRole } from "@/lib/auth/authorization";
import AppShell from "@/components/AppShell";
import ReorderAlertsClient from "./ReorderAlertsClient";

export const dynamic = "force-dynamic";

export default async function ReorderAlertsPage() {
  const user = await requireRole(
    "OWNER",
    "BRANCH_MANAGER"
  );

  return (
    <AppShell
      user={{
        username: user.username,
        name: user.name,
        role: user.role,
        branchName: user.branch?.name ?? null,
      }}
    >
      <ReorderAlertsClient
        currentUser={{
          id: user.id,
          username: user.username,
          role: user.role,
          branchId: user.branchId,
        }}
      />
    </AppShell>
  );
}