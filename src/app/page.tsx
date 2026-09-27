import { useRouter } from "next/navigation";
import PurpleYamLogo from "@/components/PurpleYamLogo";

export default function Home() {
  const router = useRouter();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#16052b] px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-purple-700/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-800/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[460px] text-center">
        <div className="mb-7">
          <PurpleYamLogo size="lg" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Purple Yam</h1>
          <p className="mt-2 text-sm text-purple-200/75">Automated Inventory Management System</p>
        </div>

        <div className="rounded-3xl border border-purple-300/20 bg-[#24133b]/95 p-7 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70">Secure System Access</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Welcome</h2>
            <p className="mt-2 text-sm leading-6 text-purple-100/60">Choose how you would like to access the Purple Yam AIMS.</p>
          </div>
          <div className="space-y-3">
            <button type="button" onClick={() => router.push("/login")} className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-purple-600 to-violet-700 text-sm font-bold uppercase tracking-wide text-white shadow-[0_8px_22px_rgba(124,58,237,0.25)] transition hover:from-purple-500 hover:via-purple-600 hover:to-violet-600">Log In</button>
            <button type="button" onClick={() => router.push("/signup")} className="flex h-12 w-full items-center justify-center rounded-xl border border-purple-300/25 bg-purple-900/30 text-sm font-bold uppercase tracking-wide text-purple-100 transition hover:border-purple-300/40 hover:bg-purple-900/50">Sign Up</button>
          </div>
          <p className="mt-6 text-[10px] tracking-wide text-purple-300/35">Authorized personnel only</p>
        </div>
      </div>
    </main>
  );
}