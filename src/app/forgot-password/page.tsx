"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PurpleYamLogo from "@/components/PurpleYamLogo";

type Step = "CODE" | "PASSWORD";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() || "";

  const [step, setStep] = useState<Step>("CODE");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      setError("Password recovery email is missing.");
    }
  }, [email]);

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to verify the code.");
        return;
      }

      setStep("PASSWORD");
      setNotice("Code verified. Create your new password.");
    } catch (requestError) {
      console.error("Reset code verification failed:", requestError);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to reset your password.");
        return;
      }

      router.replace("/dashboard");
    } catch (requestError) {
      console.error("Owner password reset failed:", requestError);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#16052b] px-4 py-8">
      <div className="w-full max-w-[430px]">
        <div className="mb-6 text-center">
          <PurpleYamLogo size="md" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70">
            Owner Account Recovery
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            {step === "CODE" ? "Verify Your Email" : "Create New Password"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-purple-100/60">
            {step === "CODE"
              ? `Enter the 6-digit verification code sent to ${email || "your registered email"}.`
              : "Your email has been verified. Create a new password to continue to the Owner dashboard."}
          </p>
        </div>

        <div className="rounded-3xl border border-purple-300/20 bg-[#24133b]/95 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
          {notice && (
            <div className="mb-4 rounded-xl border border-green-300/20 bg-green-500/10 px-3.5 py-2.5 text-xs text-green-200">
              {notice}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}

          {step === "CODE" ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label
                  htmlFor="verification-code"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200"
                >
                  Verification Code
                </label>
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  autoComplete="one-time-code"
                  placeholder="000000"
                  disabled={loading}
                  autoFocus
                  className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 px-4 text-center text-lg font-semibold tracking-[0.35em] text-white outline-none transition placeholder:text-purple-200/25 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/15 disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-purple-600 to-violet-700 text-sm font-bold uppercase tracking-wide text-white transition hover:from-purple-500 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login/owner")}
                disabled={loading}
                className="w-full text-xs font-semibold text-purple-300/70 hover:text-purple-100"
              >
                ← Back to Owner Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  disabled={loading}
                  autoFocus
                  className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 px-4 text-sm text-white outline-none transition placeholder:text-purple-200/35 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/15 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 px-4 text-sm text-white outline-none transition placeholder:text-purple-200/35 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/15 disabled:opacity-60"
                />
              </div>

              <p className="rounded-xl border border-purple-300/10 bg-purple-900/20 px-3 py-2.5 text-xs leading-5 text-purple-100/55">
                Your new password must be at least 8 characters and must be
                different from your old password.
              </p>

              <button
                type="submit"
                disabled={loading || !email}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-purple-600 to-violet-700 text-sm font-bold uppercase tracking-wide text-white transition hover:from-purple-500 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating..." : "Set New Password"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-purple-200/35">
          Purple Yam Automated Inventory Management System
        </p>
      </div>
    </main>
  );
}
