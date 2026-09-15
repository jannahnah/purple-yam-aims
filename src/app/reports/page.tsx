import { requireRole } from "@/lib/auth/authorization";
import AppShell from "@/components/AppShell";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
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
      <ReportsClient
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