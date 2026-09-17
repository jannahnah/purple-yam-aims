import { requireOwner } from "@/lib/auth/authorization";
import AppSidebar from "@/components/AppSidebar";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireOwner();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7fa]">
      {/* Fixed Sidebar */}
      <AppSidebar
        user={{
          username: user.username,
          name: user.name,
          role: user.role,
          branchName: user.branch?.name ?? null,
        }}
      />

      {/* Scrollable Main Content */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <UsersClient
          currentUser={{
            id: user.id,
            username: user.username,
            role: user.role,
            branchId: user.branchId,
          }}
        />
      </main>
    </div>
  );
}