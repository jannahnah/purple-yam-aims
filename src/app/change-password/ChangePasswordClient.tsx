"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userName: string | null;
};

export default function ChangePasswordClient({
  userName,
}: Props) {
  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (newPassword.length < 8) {
      setError(
        "New password must be at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/users/me/password",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to update your password."
        );
        return;
      }

      /*
       * The password flag is now cleared on the server.
       * Refreshing the route lets the server determine
       * the correct dashboard based on the user's role.
       */
      router.push("/change-password");
    } catch (error) {
      console.error(
        "First-login password change error:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7fa] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
          <div className="mb-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100">
              <span className="text-lg text-purple-700">
                🔐
              </span>
            </div>

            <h1 className="text-xl font-bold text-gray-900">
              Change Your Password
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {userName
                ? `Welcome, ${userName}.`
                : "Welcome."}{" "}
              For security, you need to create a new
              password before continuing.
            </p>
          </div>

          <div className="mb-5 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3">
            <p className="text-xs leading-5 text-purple-800">
              Your temporary password can only be used
              for your initial sign-in. Choose a new
              password that is at least 8 characters long.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                autoComplete="new-password"
                placeholder="At least 8 characters"
                disabled={loading}
                required
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Confirm New Password
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                disabled={loading}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-100"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Updating Password..."
                : "Set New Password"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Purple Yam Automated Inventory Management
          System
        </p>
      </div>
    </main>
  );
}