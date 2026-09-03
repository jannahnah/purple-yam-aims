import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export type UserRole =
  | "OWNER"
  | "BRANCH_MANAGER"
  | "CASHIER";

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return user;
}

export async function requireRole(
  ...allowedRoles: UserRole[]
) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role as UserRole)) {
    redirect("/unauthorized");
  }

  return user;
}

export async function requireOwner() {
  return requireRole("OWNER");
}

export async function requireManagerOrOwner() {
  return requireRole("OWNER", "BRANCH_MANAGER");
}

export async function requireOperationalUser() {
  return requireRole(
    "OWNER",
    "BRANCH_MANAGER",
    "CASHIER"
  );
}

export function canAccessBranch(
  user: {
    role: string;
    branchId: string | null;
  },
  branchId: string
) {
  if (user.role === "OWNER") {
    return true;
  }

  return user.branchId === branchId;
}