"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (username === "owner" && password === "owner123") {
      window.location.href = "/dashboard";
      return;
    }

    setError("Invalid username or password.");
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
            PROTOTYPE • MOCK DATA
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

          {/* Demo Credentials */}
          <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <p className="mb-2 text-xs font-semibold text-purple-700">
              Demo Credentials (Prototype)
            </p>

            <div className="space-y-1 text-xs text-purple-700">
              <p>
                <span className="font-semibold">owner</span> / owner123 —
                Owner
              </p>

              <p>
                <span className="font-semibold">mgr.main</span> / mgr123 —
                Branch Manager
              </p>

              <p>
                <span className="font-semibold">cashier1</span> / cash123 —
                Cashier
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
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
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
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
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
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 py-3 font-semibold text-white shadow-md transition hover:from-purple-700 hover:to-purple-900"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}