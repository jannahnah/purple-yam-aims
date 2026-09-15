"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Role = "OWNER" | "BRANCH_MANAGER" | "CASHIER";

type SidebarUser = {
  username: string;
  name?: string | null;
  role: Role;
  branchName: string | null;
};

type AppSidebarProps = {
  user: SidebarUser;
};

function getRoleLabel(role: Role) {
  switch (role) {
    case "OWNER":
      return "Admin Owner";

    case "BRANCH_MANAGER":
      return "Branch Manager";

    case "CASHIER":
      return "Cashier";

    default:
      return role;
  }
}

export default function AppSidebar({
  user,
}: AppSidebarProps) {
  const pathname = usePathname();

  const isOwner = user.role === "OWNER";
  const isManager = user.role === "BRANCH_MANAGER";
  const isCashier = user.role === "CASHIER";

  const dashboardHref = isOwner
    ? "/dashboard"
    : isManager
      ? "/manager-dashboard"
      : "/cashier-dashboard";

  function isActive(href: string) {
    if (href === dashboardHref) {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  function getNavClass(href: string) {
    if (isActive(href)) {
      return "flex items-center rounded-lg bg-purple-800 px-4 py-3 text-sm font-semibold text-white shadow-sm";
    }

    return "flex items-center rounded-lg px-4 py-3 text-sm font-medium text-purple-100 transition hover:bg-purple-800";
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <aside className="hidden h-screen w-64 shrink-0 overflow-y-auto bg-purple-950 text-white lg:flex lg:flex-col">
      {/* Brand */}
      <div className="border-b border-purple-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-700 text-sm font-bold shadow-sm">
            PY
          </div>

          <div>
            <h1 className="text-base font-bold">
              Purple Yam
            </h1>

            <p className="text-xs text-purple-200">
              AIMS Prototype
            </p>
          </div>
        </div>
      </div>

      {/* Current User */}
      <div className="border-b border-purple-800 px-5 py-4">
        <p className="text-sm font-semibold">
          {getRoleLabel(user.role)}
        </p>

        <p className="mt-1 truncate text-xs text-purple-200">
          {user.name?.trim() || user.username}
          {" • "}
          {user.branchName ?? "Owner"}
        </p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {/* Dashboard */}
          <Link
            href={dashboardHref}
            className={getNavClass(dashboardHref)}
          >
            Dashboard
          </Link>

          {/* Cashier Navigation */}
          {isCashier && (
            <Link
              href="/sales"
              className={getNavClass("/sales")}
            >
              Sales
            </Link>
          )}

          {/* Owner / Manager Navigation */}
          {!isCashier && (
            <>
              <Link
                href="/inventory"
                className={getNavClass("/inventory")}
              >
                Inventory
              </Link>

              <Link
                href="/transactions"
                className={getNavClass("/transactions")}
              >
                Transactions
              </Link>

              {(isOwner || isManager) && (
                <>
                  <Link
                    href="/reorder-alerts"
                    className={getNavClass("/reorder-alerts")}
                  >
                    Reorder Alerts
                  </Link>

                  <Link
                    href="/reports"
                    className={getNavClass("/reports")}
                  >
                    Reports
                  </Link>
                </>
              )}

              {isOwner && (
                <Link
                  href="/users"
                  className={getNavClass("/users")}
                >
                  User Management
                </Link>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-purple-800 px-3 py-4">
        <Link
          href="/account-settings"
          className={getNavClass("/account-settings")}
        >
          Account Settings
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center rounded-lg px-4 py-3 text-left text-sm font-medium text-purple-100 transition hover:bg-purple-800"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}