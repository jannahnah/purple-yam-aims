import AppSidebar from "@/components/AppSidebar";
import { ReactNode } from "react";

type Role = "OWNER" | "BRANCH_MANAGER" | "CASHIER";

type AppShellUser = {
  username: string;
  name?: string | null;
  role: Role;
  branchName: string | null;
};

type AppShellProps = {
  user: AppShellUser;
  children: ReactNode;
};

export default function AppShell({
  user,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7fa]">
      <AppSidebar user={user} />

      <main className="min-w-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}