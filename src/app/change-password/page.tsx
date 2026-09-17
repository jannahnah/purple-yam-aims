import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";
import ChangePasswordClient from "./ChangePasswordClient";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });

  if (!user.mustChangePassword) {
    if (user.role === "OWNER") {
      redirect("/dashboard");
    }

    if (user.role === "BRANCH_MANAGER") {
      redirect("/manager-dashboard");
    }

    redirect("/cashier-dashboard");
  }

  return <ChangePasswordClient userName={user.name} />;
}