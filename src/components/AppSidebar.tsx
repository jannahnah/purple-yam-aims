"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Role = "OWNER" | "BRANCH_MANAGER" | "CASHIER";
type NavIconName =
  | "dashboard"
  | "inventory"
  | "transactions"
  | "alerts"
  | "reports"
  | "users"
  | "items"
  | "settings"
  | "logout"
  | "sales";

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

export default function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

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

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function NavIcon({ name }: { name: NavIconName }) {
    const paths: Record<NavIconName, string> = {
        dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
        inventory: "M4 7h16M6 4h12v16H6V4Zm3 7h6m-6 4h4",
        transactions: "M5 5h14v14H5V5Zm3 4h8m-8 4h8m-8 4h5",
        alerts: "M12 4 3 20h18L12 4Zm0 5v5m0 3h.01",
        reports: "M4 19V5m0 14h16M8 16v-3m4 3V8m4 8v-6",
        users: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m7-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-3a3 3 0 0 1 0 6m3 6v-1a4 4 0 0 0-3-3",
        items: "M4 6h16M4 12h16M4 18h16m-7-14v4m-5 4v4m9 0v4",
        settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.01-6.01-1.42 1.42M5.91 17.09l-1.42 1.42m14.02 0-1.42-1.42M5.91 6.91 4.49 5.49",
        logout: "M10 5H5v14h5m5-4 4-3-4-3m4 3H9",
        sales: "M6 3h12v18H6V3Zm3 4h6m-6 4h6m-6 4h4",
    };

    return (
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={paths[name]} />
      </svg>
    );
  }

  function getNavClass(href: string) {
    if (isActive(href)) {
      return "flex min-h-10 items-center gap-2 rounded-lg bg-white/15 px-3 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10";
    }

    return "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-purple-100 transition hover:bg-white/10 hover:text-white";
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.push("/");
    }
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const navigation = (
    <>
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300">
        Workspace
      </p>

      <div className="space-y-1">
        <Link href={dashboardHref} className={getNavClass(dashboardHref)}>
          <NavIcon name="dashboard" />
          Dashboard
        </Link>

        {isCashier && (
          <Link href="/sales" className={getNavClass("/sales")}>
            <NavIcon name="sales" />
            Sales
          </Link>
        )}

        {!isCashier && (
          <>
            <Link href="/inventory" className={getNavClass("/inventory")}>
              <NavIcon name="inventory" />
              Inventory
            </Link>

            <Link href="/transactions" className={getNavClass("/transactions")}>
              <NavIcon name="transactions" />
              Transactions
            </Link>

            {(isOwner || isManager) && (
              <>
                <Link href="/reorder-alerts" className={getNavClass("/reorder-alerts")}>
                  <NavIcon name="alerts" />
                  Reorder Alerts
                </Link>

                <Link href="/reports" className={getNavClass("/reports")}>
                  <NavIcon name="reports" />
                  Reports
                </Link>
              </>
            )}

            {isOwner && (
              <>
                <Link href="/users" className={getNavClass("/users")}>
                  <NavIcon name="users" />
                  User Management
                </Link>

                <Link href="/item-master" className={getNavClass("/item-master")}>
                  <NavIcon name="items" />
                  Item Master
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </>
  );

  const account = (
    <div className="border-t border-white/10 px-3 py-4">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300">
        Account
      </p>

      <Link href="/account-settings" className={getNavClass("/account-settings")}>
        <NavIcon name="settings" />
        Account Settings
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-1 flex min-h-10 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-purple-100 transition hover:bg-white/10 hover:text-white"
      >
        <NavIcon name="logout" />
        Logout
      </button>
    </div>
  );

  return (
    <>
      <aside className="hidden h-dvh w-64 shrink-0 overflow-hidden bg-gradient-to-b from-purple-950 via-purple-950 to-indigo-950 text-white shadow-xl lg:flex lg:flex-col">
        <div className="shrink-0 px-4 py-4">
          <Brand />
        </div>
        <UserCard user={user} />
        <nav className="flex-1 overflow-y-auto px-3 py-4">{navigation}</nav>
        {account}
      </aside>

      <div className="mobile-shell-header">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="mobile-menu-button min-h-11 min-w-11"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="mobile-brand">
          <div className="mobile-brand-logo">
            <Image
              src="/purple-yam-logo.jpg"
              alt=""
              width={32}
              height={32}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-zinc-900">Purple Yam</p>
            <p className="truncate text-[11px] text-zinc-500">Automated Inventory Management System</p>
          </div>
        </div>

        <span className="mobile-role-pill">{getRoleLabel(user.role)}</span>
      </div>

      <div
        className={`mobile-drawer-backdrop ${open ? "is-open" : ""}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />

      <aside
        id="mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!open}
        className={`mobile-drawer ${open ? "is-open" : "invisible -translate-x-full shadow-none"}`}
      >
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <Brand />
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="mobile-drawer-close"
            >
              <span />
              <span />
            </button>
          </div>
        </div>

        <UserCard user={user} />

        <nav className="flex-1 overflow-y-auto px-3 py-4">{navigation}</nav>

        {account}
      </aside>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 shadow-lg shadow-purple-950/30 ring-1 ring-white/10">
        <Image
          src="/purple-yam-logo.jpg"
          alt="Purple Yam"
          width={48}
          height={48}
          priority
          className="h-full w-full object-cover"
        />
      </div>

      <div>
        <h1 className="text-base font-bold text-white">Purple Yam</h1>
        <p className="text-xs text-purple-200">Inventory Management</p>
      </div>
    </div>
  );
}

function UserCard({ user }: { user: SidebarUser }) {
  return (
    <div className="border-b border-white/10 bg-white/5 px-4 py-3 text-white">
      <p className="text-sm font-semibold">{getRoleLabel(user.role)}</p>
      <p className="mt-1 truncate text-xs text-purple-200">
        {user.name?.trim() || user.username}
        {" • "}
        {user.branchName ?? "Owner"}
      </p>
    </div>
  );
}