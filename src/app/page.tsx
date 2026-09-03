"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid username or password.");
        return;
      }

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login request failed:", error);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#3b0a78] via-[#4c1494] to-[#5d20a8] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center text-white mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/70 bg-purple-950 text-4xl shadow-lg">
            🍠
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Purple Yam
          </h1>

          <p className="mt-2 text-sm text-purple-100">
            Automated Inventory Management System
          </p>

          <span className="mt-3 inline-block rounded-md bg-purple-900/60 px-3 py-1 text-xs font-medium text-purple-200">
            SECURE SYSTEM ACCESS
          </span>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-7 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Sign in
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Enter your credentials to access the system.
            </p>
          </div>

          {/* Development Credentials */}
          <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <p className="mb-2 text-xs font-semibold text-purple-700">
              Development Credentials
            </p>

            <div className="space-y-1 text-xs text-purple-700">
              <p>
                <span className="font-semibold">owner</span> / owner123 — Owner
              </p>

              <p>
                <span className="font-semibold">manager_b1</span> / manager123
                — Branch Manager
              </p>

              <p>
                <span className="font-semibold">cashier_b1</span> / cashier123
                — Cashier
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Username
              </label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200 disabled:bg-gray-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200 disabled:bg-gray-100"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 py-3 font-semibold text-white shadow-md transition hover:from-purple-700 hover:to-purple-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}