import { requireOwner } from "@/lib/auth/authorization";
import AppSidebar from "@/components/AppSidebar";
import ItemMasterClient from "./ItemMasterClient";

export const dynamic = "force-dynamic";

export default async function ItemMasterPage() {
  const user = await requireOwner();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7fa]">
      <AppSidebar
        user={{
          username: user.username,
          name: user.name,
          role: user.role,
          branchName: user.branch?.name ?? null,
        }}
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <ItemMasterClient />
      </main>
    </div>
  );
}
