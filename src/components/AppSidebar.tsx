"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

  function getNavClass(href: string) {
    if (isActive(href)) {
      return "flex min-h-10 items-center rounded-lg bg-white/15 px-3 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10";
    }

    return "flex min-h-10 items-center rounded-lg px-3 py-2.5 text-sm font-medium text-purple-100 transition hover:bg-white/10 hover:text-white";
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
          Dashboard
        </Link>

        {isCashier && (
          <Link href="/sales" className={getNavClass("/sales")}>
            Sales
          </Link>
        )}

        {!isCashier && (
          <>
            <Link href="/inventory" className={getNavClass("/inventory")}>
              Inventory
            </Link>

            <Link href="/transactions" className={getNavClass("/transactions")}>
              Transactions
            </Link>

            {(isOwner || isManager) && (
              <>
                <Link href="/reorder-alerts" className={getNavClass("/reorder-alerts")}>
                  Reorder Alerts
                </Link>

                <Link href="/reports" className={getNavClass("/reports")}>
                  Reports
                </Link>
              </>
            )}

            {isOwner && (
              <>
                <Link href="/users" className={getNavClass("/users")}>
                  User Management
                </Link>

                <Link href="/item-master" className={getNavClass("/item-master")}>
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
        Account Settings
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-1 flex min-h-10 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-purple-100 transition hover:bg-white/10 hover:text-white"
      >
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
          className="mobile-menu-button"
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
        className={`mobile-drawer ${open ? "is-open" : ""}`}
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