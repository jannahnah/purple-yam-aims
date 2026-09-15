"use client";

import { FormEvent, useEffect, useState } from "react";

type UserProfile = {
  id: string;
  username: string;
  name: string | null;
  email: string;
  role: "OWNER" | "BRANCH_MANAGER" | "CASHIER";
  status: "ACTIVE" | "INACTIVE";
  branchId: string | null;
  businessId: string | null;
  branch: {
    id: string;
    name: string;
    location: string;
  } | null;
};

type OpenSection = "name" | "password" | null;

const ROLE_LABELS: Record<UserProfile["role"], string> = {
  OWNER: "Owner",
  BRANCH_MANAGER: "Branch Manager",
  CASHIER: "Cashier / Staff",
};

export default function AccountSettingsClient() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Accordion
  const [openSection, setOpenSection] =
    useState<OpenSection>(null);

  // Display name
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [passwordLoading, setPasswordLoading] =
    useState(false);
  const [passwordError, setPasswordError] =
    useState("");
  const [passwordSuccess, setPasswordSuccess] =
    useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load account.");
        }

        const data = await response.json();

        setUser(data.user);
        setName(data.user.name ?? "");
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function toggleSection(section: OpenSection) {
    setOpenSection((current) =>
      current === section ? null : section
    );

    // Clear old messages when switching sections
    setNameError("");
    setPasswordError("");
    setNameSuccess(false);
    setPasswordSuccess(false);
  }

async function handleSaveName(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  setNameError("");
  setNameSuccess(false);

  const trimmedName = name.trim();

  if (!trimmedName) {
    setNameError("Full name is required.");
    return;
  }

  if (!user) {
    return;
  }

  setNameLoading(true);

  try {
    const response = await fetch(
      `/api/users/${user.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setNameError(
        data.error ||
          "Failed to update your name."
      );
      return;
    }

    /*
     * Re-fetch the authenticated profile from the server.
     * This confirms that the value was persisted in the database.
     */
    const profileResponse = await fetch(
      "/api/auth/me",
      {
        cache: "no-store",
      }
    );

    if (!profileResponse.ok) {
      throw new Error(
        "Name was updated, but the profile could not be refreshed."
      );
    }

    const profileData =
      await profileResponse.json();

    setUser(profileData.user);
    setName(profileData.user.name ?? "");

    setNameSuccess(true);

    setTimeout(() => {
      setNameSuccess(false);
      setOpenSection(null);
    }, 1200);
  } catch (error) {
    console.error(
      "Display name update error:",
      error
    );

    setNameError(
      error instanceof Error
        ? error.message
        : "Unable to connect to the server. Please try again."
    );
  } finally {
    setNameLoading(false);
  }
}

  async function handleChangePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError(
        "New password must be at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "New passwords do not match."
      );
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch(
        "/api/users/me/password",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(
          data.error ||
            "Failed to update your password."
        );
        return;
      }

      setPasswordSuccess(true);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Close after successful password change
      setTimeout(() => {
        setPasswordSuccess(false);
        setOpenSection(null);
      }, 1500);
    } catch (error) {
      console.error(error);

      setPasswordError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-gray-500">
            Loading account settings...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-100 bg-white p-6">
          <p className="text-sm text-red-600">
            Unable to load your account information.
          </p>
        </div>
      </main>
    );
  }

  const branchLabel =
    user.role === "OWNER"
      ? "All Branches"
      : user.branch?.name ?? "Not assigned";

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            Account Settings
          </h1>

          <p className="mt-0.5 text-sm text-gray-500">
            Manage your profile and password.
          </p>
        </div>

        {/* Account Information */}
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">
            Account Information
          </h2>

          <div className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2">

            {/* Username */}
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-gray-400">
                Username
              </p>

              <p className="font-mono font-medium text-gray-800">
                {user.username}
              </p>

              <p className="mt-0.5 text-xs text-gray-400">
                Cannot be changed
              </p>
            </div>

            {/* Role */}
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-gray-400">
                Role
              </p>

              <p className="font-medium text-gray-800">
                {ROLE_LABELS[user.role]}
              </p>
            </div>

            {/* Branch */}
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-gray-400">
                Branch
              </p>

              <p className="font-medium text-gray-800">
                {branchLabel}
              </p>
            </div>

            {/* Status */}
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-gray-400">
                Account Status
              </p>

              <span
                className={
                  user.status === "ACTIVE"
                    ? "inline-flex items-center gap-1.5 font-medium text-emerald-700"
                    : "inline-flex items-center gap-1.5 font-medium text-red-700"
                }
              >
                <span
                  className={
                    user.status === "ACTIVE"
                      ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                      : "h-1.5 w-1.5 rounded-full bg-red-500"
                  }
                />

                {user.status === "ACTIVE"
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>

          </div>
        </section>

        {/* Display Name Accordion */}
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection("name")}
            className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-gray-50"
            aria-expanded={openSection === "name"}
          >
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Display Name
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Update the name displayed on your account.
              </p>
            </div>

            <span
              className={`ml-4 text-lg text-gray-400 transition-transform duration-200 ${
                openSection === "name"
                  ? "rotate-90"
                  : ""
              }`}
            >
              ›
            </span>
          </button>

          {openSection === "name" && (
            <div className="border-t border-gray-100 px-6 pb-6 pt-5">
              <form
                onSubmit={handleSaveName}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="full-name"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="full-name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    disabled={nameLoading}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-100"
                  />
                </div>

                {nameError && (
                  <p className="text-sm text-red-600">
                    {nameError}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={nameLoading}
                    className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {nameLoading
                      ? "Saving..."
                      : "Save Name"}
                  </button>

                  {nameSuccess && (
                    <span className="text-sm text-emerald-600">
                      ✓ Saved
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}
        </section>

        {/* Change Password Accordion */}
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() =>
              toggleSection("password")
            }
            className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-gray-50"
            aria-expanded={
              openSection === "password"
            }
          >
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Change Password
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Update your account password.
              </p>
            </div>

            <span
              className={`ml-4 text-lg text-gray-400 transition-transform duration-200 ${
                openSection === "password"
                  ? "rotate-90"
                  : ""
              }`}
            >
              ›
            </span>
          </button>

          {openSection === "password" && (
            <div className="border-t border-gray-100 px-6 pb-6 pt-5">
              <form
                onSubmit={handleChangePassword}
                className="space-y-4"
              >
                {/* Current Password */}
                <div>
                  <label
                    htmlFor="current-password"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Current Password
                  </label>

                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(
                        event.target.value
                      )
                    }
                    autoComplete="current-password"
                    disabled={passwordLoading}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-100"
                  />
                </div>

                {/* New Password */}
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
                      setNewPassword(
                        event.target.value
                      )
                    }
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    disabled={passwordLoading}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-100"
                  />
                </div>

                {/* Confirm Password */}
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
                    disabled={passwordLoading}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-100"
                  />
                </div>

                {passwordError && (
                  <p className="text-sm text-red-600">
                    {passwordError}
                  </p>
                )}

                {passwordSuccess && (
                  <p className="text-sm text-emerald-600">
                    ✓ Password updated successfully.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passwordLoading
                    ? "Updating..."
                    : "Update Password"}
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Information Note */}
        <p className="pt-2 text-center text-xs text-gray-400">
          Username, role, and assigned branch can only
          be changed by the Owner. Contact your
          administrator for those changes.
        </p>

      </div>
    </main>
  );
}