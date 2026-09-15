import { requireUser } from "@/lib/auth/authorization";
import AppSidebar from "@/components/AppSidebar";
import AccountSettingsClient from "./AccountSettingsClient";

export default async function AccountSettingsPage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-[#f7f7fa]">
      <AppSidebar
        user={{
          username: user.username,
          name: user.name,
          role: user.role,
          branchName: user.branch?.name ?? null,
        }}
      />

      <main className="min-w-0 flex-1">
        <AccountSettingsClient />
      </main>
    </div>
  );
}