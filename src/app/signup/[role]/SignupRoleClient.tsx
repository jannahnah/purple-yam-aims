"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import PurpleYamLogo from "@/components/PurpleYamLogo";

type SignupRole = "owner" | "branch-manager" | "cashier";

type Props = { role: SignupRole };

const roleLabels: Record<SignupRole, string> = {
  owner: "Owner",
  "branch-manager": "Branch Manager",
  cashier: "Cashier",
};

export default function SignupRoleClient({ role }: Props) {
  const router = useRouter();
  const roleLabel = roleLabels[role];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (role !== "owner") {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#16052b] px-4 py-8">
        <div className="relative z-10 w-full max-w-[480px]">
          
          <div className="mb-6 text-center"><PurpleYamLogo size="md" /></div>
          <div className="rounded-3xl border border-purple-300/20 bg-[#24133b]/95 p-7 text-center shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70">
              {roleLabel} Account
            </p>
            <h1 className="mt-3 text-2xl font-bold text-white">
              Contact Your Owner
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-purple-100/60">
              New {roleLabel} accounts are created by the Owner and assigned
              to the appropriate branch. Please contact your Owner for your
              account credentials.
            </p>

            <div className="mt-6 rounded-2xl border border-purple-300/10 bg-purple-900/20 px-4 py-4 text-left text-xs leading-5 text-purple-100/55">
              After the Owner creates your account, sign in using the temporary
              credentials provided to you. You will be required to change your
              password before accessing your dashboard.
            </div>

            <button
              type="button"
              onClick={() => router.push("/login/" + role)}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-purple-600 to-violet-700 text-sm font-bold uppercase tracking-wide text-white transition hover:from-purple-500 hover:to-violet-600"
            >
              Log In
            </button>

            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="mx-auto mt-4 block text-sm font-medium text-purple-300/70 transition hover:text-purple-200"
            >
              ← Choose another role
            </button>
          </div>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create the Owner account.");
        return;
      }

      router.push("/login/owner?registered=1");
    } catch (requestError) {
      console.error("Owner signup request failed:", requestError);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#16052b] px-4 py-8">
      <div className="relative z-10 w-full max-w-[430px]">
        <div className="mb-6 text-center"><PurpleYamLogo size="md" />
          <div className="mt-4"></div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70">
            Owner Registration
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Create Owner Account
          </h1>
          <p className="mt-2 text-sm leading-6 text-purple-100/60">
            Use the client&apos;s business email for the primary Owner account.
          </p>
        </div>

        <div className="rounded-3xl border border-purple-300/20 bg-[#24133b]/95 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.45)] sm:p-7">
          <div className="mb-5 rounded-xl border border-amber-300/15 bg-amber-500/10 px-3.5 py-3 text-xs leading-5 text-amber-100/75">
            Owner registration is available only during initial account setup.
            Once an Owner account exists, additional users must be created by
            the Owner.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="owner-name" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200">
                Full Name
              </label>
              <input
                id="owner-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={loading}
                placeholder="Enter owner name"
                className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 px-4 text-sm text-white outline-none transition placeholder:text-purple-200/35 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="owner-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200">
                Business Email
              </label>
              <input
                id="owner-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
                placeholder="owner@yourcompany.com"
                autoComplete="email"
                className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 px-4 text-sm text-white outline-none transition placeholder:text-purple-200/35 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="owner-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200">
                Password
              </label>
              <input
                id="owner-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 px-4 text-sm text-white outline-none transition placeholder:text-purple-200/35 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="owner-confirm-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200">
                Confirm Password
              </label>
              <input
                id="owner-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={loading}
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 px-4 text-sm text-white outline-none transition placeholder:text-purple-200/35 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/15 disabled:opacity-60"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-purple-600 to-violet-700 text-sm font-bold uppercase tracking-wide text-white transition hover:from-purple-500 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating Account..." : "Create Owner Account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="mx-auto mt-5 block text-sm font-medium text-purple-300/70 transition hover:text-purple-200"
          >
            ← Choose another role
          </button>
        </div>
      </div>
    </main>
  );
}
