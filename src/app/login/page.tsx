"use client";

import { useRouter } from "next/navigation";
import PurpleYamLogo from "@/components/PurpleYamLogo";

const roles = [
  { key: "owner", title: "Owner", description: "Business-wide access and user management" },
  { key: "branch-manager", title: "Branch Manager", description: "Manage your assigned branch operations" },
  { key: "cashier", title: "Cashier", description: "Record sales and view branch transactions" },
];

export default function LoginRolePage() {
  const router = useRouter();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#16052b] px-4 py-8">
      <div className="pointer-events-none absolute inset-0"><div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-purple-700/15 blur-3xl" /><div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" /></div>
      <div className="relative z-10 w-full max-w-[500px]">
        <div className="mb-6 text-center"><PurpleYamLogo size="md" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70">Purple Yam AIMS</p><h1 className="mt-2 text-3xl font-bold text-white">Log In</h1><p className="mt-2 text-sm text-purple-100/60">Select your account role to continue.</p></div>
        <div className="space-y-3">{roles.map((role) => <button key={role.key} type="button" onClick={() => router.push("/login/" + role.key)} className="w-full rounded-2xl border border-purple-300/20 bg-[#24133b]/95 p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition hover:border-purple-300/40 hover:bg-[#2b1745]"><div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-bold text-white">{role.title}</h2><p className="mt-1 text-sm text-purple-100/55">{role.description}</p></div><span className="text-lg text-purple-300">→</span></div></button>)}</div>
        <button type="button" onClick={() => router.push("/")} className="mx-auto mt-5 block text-sm font-medium text-purple-300/70 transition hover:text-purple-200">← Back</button>
      </div>
    </main>
  );
}