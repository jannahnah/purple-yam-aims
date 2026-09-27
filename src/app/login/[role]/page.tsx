import { notFound } from "next/navigation";
import LoginByRoleClient from "./LoginByRoleClient";

const roleConfig = {
  owner: { role: "OWNER" as const, label: "Owner" },
  "branch-manager": { role: "BRANCH_MANAGER" as const, label: "Branch Manager" },
  cashier: { role: "CASHIER" as const, label: "Cashier" },
};

export default async function LoginRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const config = roleConfig[role as keyof typeof roleConfig];

  if (!config) notFound();

  return <LoginByRoleClient role={config.role} roleLabel={config.label} />;
}
