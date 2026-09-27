import { notFound } from "next/navigation";
import SignupRoleClient from "./SignupRoleClient";

const validRoles = new Set(["owner", "branch-manager", "cashier"]);

export default async function SignupRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;

  if (!validRoles.has(role)) notFound();

  return (
    <SignupRoleClient
      role={role as "owner" | "branch-manager" | "cashier"}
    />
  );
}
