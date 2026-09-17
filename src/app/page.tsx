"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid email or password.");
        return;
      }

      if (data.user.role === "OWNER") {
        window.location.href = "/dashboard";
      } else if (data.user.role === "BRANCH_MANAGER") {
        window.location.href = "/manager-dashboard";
      } else if (data.user.role === "CASHIER") {
        window.location.href = "/cashier-dashboard";
      }
    } catch (error) {
      console.error("Login request failed:", error);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#16052b] px-4 py-4 sm:px-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-purple-700/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-800/10 blur-3xl" />
      </div>

      {/* Main Login Area */}
      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center">
        {/* Brand */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-[68px] w-[68px] items-center justify-center rounded-full border border-purple-300/50 bg-purple-950/80 shadow-[0_0_30px_rgba(168,85,247,0.25)]">
            <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-purple-400/70 bg-[#26103f] text-[28px]">
              🍠
            </div>
          </div>

          <h1 className="text-[28px] font-bold tracking-tight text-white sm:text-3xl">
            Purple Yam
          </h1>

          <p className="mt-1 text-xs text-purple-200/75 sm:text-sm">
            Automated Inventory Management System
          </p>

          <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-purple-400/20 bg-purple-900/30 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]" />

            <span className="text-[9px] font-semibold tracking-[0.16em] text-purple-200">
              SECURE SYSTEM ACCESS
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full rounded-3xl border border-purple-300/20 bg-[#24133b]/95 px-6 py-6 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-7 sm:py-7">
          {/* Header */}
          <div className="mb-5">
            <h2 className="text-[22px] font-bold text-white">
              Welcome Back
            </h2>

            <p className="mt-1 text-xs text-purple-200/60 sm:text-sm">
              Sign in to your account to access the system.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200"
              >
                Email
              </label>

              <div className="relative">
                {/* User Icon */}
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-300/65">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="7" r="4" />
                    <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
                  </svg>
                </div>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  disabled={isLoading}
                  required
                  className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-purple-200/35 hover:border-purple-300/30 focus:border-purple-400/70 focus:bg-purple-900/45 focus:ring-2 focus:ring-purple-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-purple-200"
              >
                Password
              </label>

              <div className="relative">
                {/* Lock Icon */}
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-300/65">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2"
                    />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  required
                  className="h-12 w-full rounded-xl border border-purple-300/20 bg-purple-900/35 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-purple-200/35 hover:border-purple-300/30 focus:border-purple-400/70 focus:bg-purple-900/45 focus:ring-2 focus:ring-purple-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                />

                {/* Show / Hide Password */}
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isLoading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-purple-300/60 transition hover:bg-purple-500/10 hover:text-purple-200 disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                      <path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5 0 8.5 4 9.5 6a17.7 17.7 0 0 1-3.1 3.9" />
                      <path d="M6.2 6.2C4.4 7.3 3.2 9 2.5 10c1 2 4.5 6 9.5 6 1 0 1.9-.2 2.8-.5" />
                    </svg>
                  ) : (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
              >
                <svg
                  className="mt-0.5 shrink-0"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>

                <span>{error}</span>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-purple-600 to-violet-700 text-sm font-bold uppercase tracking-wide text-white shadow-[0_8px_22px_rgba(124,58,237,0.25)] transition hover:from-purple-500 hover:via-purple-600 hover:to-violet-600 hover:shadow-[0_10px_28px_rgba(124,58,237,0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="40 20"
                    />
                  </svg>

                  Signing In...
                </>
              ) : (
                <>
                  Sign In

                  <svg
                    className="transition-transform duration-200 group-hover:translate-x-1"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h13" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-5 border-t border-purple-300/10 pt-4">
            <div className="flex items-center justify-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-purple-300/20 bg-purple-900/50 text-[11px]">
                🍠
              </div>

              <p className="text-[10px] font-medium text-purple-300/60">
                Purple Yam Automated Inventory Management
              </p>
            </div>
          </div>
        </div>

        {/* Authorization Notice */}
        <p className="mt-3 text-center text-[9px] tracking-wide text-purple-300/30">
          Authorized personnel only
        </p>
      </div>
    </main>
  );
}