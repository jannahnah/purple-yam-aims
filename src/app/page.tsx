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
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
        <div className="text-center text-white mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/70 bg-purple-950 text-4xl shadow-lg">
            🍠
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Purple Yam</h1>
          <p className="mt-2 text-sm text-purple-100">Automated Inventory Management System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-purple-100 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-100 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-md transition-all mt-4"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}