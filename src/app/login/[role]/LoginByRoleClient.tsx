"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PurpleYamLogo from "@/components/PurpleYamLogo";

type LoginRole = "OWNER" | "BRANCH_MANAGER" | "CASHIER";

type Props = {
  role: LoginRole;
  roleLabel: string;
};

export default function LoginByRoleClient({ role, roleLabel }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("registered=1")) {
      setNotice("Owner account created successfully. You can now sign in.");
    }
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to sign in.");
        return;
      }

      if (data.user.mustChangePassword) {
        router.push("/change-password");
        return;
      }

      if (data.user.role === "OWNER") {
        router.push("/dashboard");
      } else if (data.user.role === "BRANCH_MANAGER") {
        router.push("/manager-dashboard");
      } else {
        router.push("/cashier-dashboard");
      }
    } catch (requestError) {
      console.error("Login request failed:", requestError);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#16052b] px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-purple-700/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[430px]">
        <div className="mb-6 text-center"><PurpleYamLogo size="md" />
          <div className="mt-4"></div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70">
            Sign In As
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">{roleLabel}</h1>
          <p className="mt-2 text-sm text-purple-100/60">
            Enter the email and password assigned to this account.
          </p>
        </div>

        <div className="rounded-3xl border border-purple-300/20 bg-[#24133b]/95 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
          {notice && (
            <div className="mb-4 rounded-xl border border-green-300/20 bg-green-500/10 px-3.5 py-2.5 text-xs text-green-200">
              {notice}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={loading}
                placeholder="Enter your email"
                className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 px-4 text-sm text-white outline-none transition placeholder:text-purple-200/35 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 px-4 pr-16 text-sm text-white outline-none transition placeholder:text-purple-200/35 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/15 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-purple-300/70 hover:text-purple-100"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-purple-600 to-violet-700 text-sm font-bold uppercase tracking-wide text-white transition hover:from-purple-500 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {role !== "OWNER" && (
            <p className="mt-4 rounded-xl border border-purple-300/10 bg-purple-900/20 px-3 py-2.5 text-xs leading-5 text-purple-100/55">
              New {roleLabel} accounts are created by the Owner. Use the temporary
              credentials provided to you, then change your password before
              entering the dashboard.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mx-auto mt-5 block text-sm font-medium text-purple-300/70 transition hover:text-purple-200"
        >
          ← Choose another role
        </button>
      </div>
    </main>
  );
}
