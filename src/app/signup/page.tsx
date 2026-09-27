"use client";

import { useRouter } from "next/navigation";
import PurpleYamLogo from "@/components/PurpleYamLogo";

const roles = [
  { key: "owner", title: "Owner", description: "Create the primary business owner account" },
  { key: "branch-manager", title: "Branch Manager", description: "Contact your Owner for an account" },
  { key: "cashier", title: "Cashier", description: "Contact your Owner for an account" },
];

export default function SignupRolePage() {
  const router = useRouter();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#16052b] px-4 py-8">
      <div className="relative z-10 w-full max-w-[500px]">
        <div className="mb-6 text-center"><PurpleYamLogo size="md" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70">Purple Yam AIMS</p><h1 className="mt-2 text-3xl font-bold text-white">Sign Up</h1><p className="mt-2 text-sm text-purple-100/60">Select your role to see the available account setup process.</p></div>
        <div className="space-y-3">{roles.map((role) => <button key={role.key} type="button" onClick={() => router.push("/signup/" + role.key)} className="w-full rounded-2xl border border-purple-300/20 bg-[#24133b]/95 p-5 text-left transition hover:border-purple-300/40 hover:bg-[#2b1745]"><h2 className="text-base font-bold text-white">{role.title}</h2><p className="mt-1 text-sm text-purple-100/55">{role.description}</p></button>)}</div>
        <button type="button" onClick={() => router.push("/")} className="mx-auto mt-5 block text-sm font-medium text-purple-300/70 transition hover:text-purple-200">← Back</button>
      </div>
    </main>
  );
}