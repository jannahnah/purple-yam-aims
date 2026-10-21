import AppSidebar from "@/components/AppSidebar";
import { ReactNode } from "react";

type Role = "OWNER" | "BRANCH_MANAGER" | "CASHIER" | "INVENTORY_MANAGER";

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

export default function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="aims-shell flex h-screen min-h-0 overflow-x-hidden overflow-y-hidden bg-[#f7f7fa]">
      <AppSidebar user={user} />

      <main className="aims-main min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  );
}