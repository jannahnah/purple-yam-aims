"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "OWNER" | "BRANCH_MANAGER" | "CASHIER";
type UserStatus = "ACTIVE" | "INACTIVE";

type Branch = {
  id: string;
  name: string;
  location: string | null;
  isCommissary?: boolean;
};

type User = {
  id: string;
  username: string;
  name: string | null;
  email: string;
  role: Role;
  status: UserStatus;
  branchId: string | null;
  branch: Branch | null;
  createdAt: string;
  lastLoginAt: string | null;
};

type Props = Record<string, never>;

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  BRANCH_MANAGER: "Branch Manager",
  CASHIER: "Cashier",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function roleBadgeClass(role: Role) {
  switch (role) {
    case "BRANCH_MANAGER":
      return "bg-purple-100 text-purple-700";

    case "CASHIER":
      return "bg-blue-100 text-blue-700";

    case "OWNER":
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function statusBadgeClass(status: UserStatus) {
  return status === "ACTIVE"
    ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-600";
}

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [showResetModal, setShowResetModal] =
    useState(false);

  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  // Create form
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [role, setRole] =
    useState<"BRANCH_MANAGER" | "CASHIER">(
      "CASHIER"
    );

  // Branch is now entered by name.
  // The API will find an existing branch or create
  // a new branch automatically.
  const [branchName, setBranchName] = useState("");

  const [showBranchOptions, setShowBranchOptions] =
    useState(false);

  const [temporaryPassword, setTemporaryPassword] =
    useState("");

  // Reset password form
  const [newPassword, setNewPassword] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  async function fetchManagementData() {
    const [usersResponse, branchesResponse] =
      await Promise.all([
        fetch("/api/users", {
          cache: "no-store",
        }),
        fetch("/api/branches", {
          cache: "no-store",
        }),
      ]);

    const usersData = await usersResponse.json();
    const branchesData = await branchesResponse.json();

    if (!usersResponse.ok) {
      throw new Error(
        usersData.error || "Failed to load users."
      );
    }

    if (!branchesResponse.ok) {
      throw new Error(
        branchesData.error || "Failed to load branches."
      );
    }

    return {
      users: Array.isArray(usersData) ? usersData : [],
      branches: Array.isArray(branchesData) ? branchesData : [],
    };
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const data = await fetchManagementData();

      setUsers(data.users);
      setBranches(data.branches);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load user management data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    fetchManagementData()
      .then((data) => {
        if (!active) return;

        setUsers(data.users);
        setBranches(data.branches);
      })
      .catch((err) => {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load user management data."
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function resetCreateForm() {
    setFullName("");
    setUsername("");
    setEmail("");
    setRole("CASHIER");

    setBranchName("");
    setShowBranchOptions(false);

    setTemporaryPassword("");
  }

  function openCreateModal() {
    setError("");
    setSuccess("");
    resetCreateForm();
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (submitting) {
      return;
    }

    setShowCreateModal(false);
    resetCreateForm();
    setError("");
  }

  function openResetModal(user: User) {
    setSelectedUser(user);
    setNewPassword("");
    setError("");
    setSuccess("");
    setShowResetModal(true);
  }

  function closeResetModal() {
    if (submitting) {
      return;
    }

    setShowResetModal(false);
    setSelectedUser(null);
    setNewPassword("");
    setError("");
  }

  const filteredBranches = useMemo(() => {
    const search = branchName
      .trim()
      .toLowerCase();

    if (!search) {
      return branches;
    }

    return branches.filter((branch) =>
      `${branch.name} ${branch.location ?? ""}`
        .toLowerCase()
        .includes(search)
    );
  }, [branches, branchName]);

  const exactBranchMatch = useMemo(() => {
    const normalized =
      branchName
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

    if (!normalized) {
      return null;
    }

    return (
      branches.find(
        (branch) =>
          branch.name
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase() === normalized
      ) ?? null
    );
  }, [branches, branchName]);

  function handleBranchInput(
    value: string
  ) {
    setBranchName(value);
    setShowBranchOptions(true);
  }

  function selectBranch(branch: Branch) {
    setBranchName(branch.name);
    setShowBranchOptions(false);
  }

  async function handleCreateUser(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!branchName.trim()) {
      setError("Please enter a branch.");
      return;
    }

    if (temporaryPassword.length < 8) {
      setError(
        "Temporary password must be at least 8 characters."
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        "/api/users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: fullName.trim(),
            username: username.trim(),
            email: email.trim(),
            role,
            branchName: branchName
              .trim()
              .replace(/\s+/g, " "),
            temporaryPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create user."
        );
      }

      setShowCreateModal(false);
      resetCreateForm();

      setSuccess(
        `Account created successfully for ${fullName.trim()}.`
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create user."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError(
        "New password must be at least 8 characters."
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `/api/users/${selectedUser.id}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to reset password."
        );
      }

      const selectedUserName =
        selectedUser.name ||
        selectedUser.username;

      setShowResetModal(false);
      setSelectedUser(null);
      setNewPassword("");

      setSuccess(
        `Password reset successfully for ${selectedUserName}.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reset password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(
    user: User
  ) {
    setError("");
    setSuccess("");

    const nextStatus: UserStatus =
      user.status === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    try {
      const response = await fetch(
        `/api/users/${user.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update user status."
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                status: nextStatus,
              }
            : item
        )
      );

      setSuccess(
        `${user.name || user.username} has been ${
          nextStatus === "ACTIVE"
            ? "activated"
            : "deactivated"
        }.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update user status."
      );
    }
  }

  return (
    <div className="aims-page p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              User Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Create and manage staff accounts. Usernames
              and roles cannot be changed by staff.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800"
          >
            <span className="text-lg leading-none">
              +
            </span>

            Create Staff Account
          </button>
        </div>

        {/* Alerts */}
        {error &&
          !showCreateModal &&
          !showResetModal && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

        {success &&
          !showCreateModal &&
          !showResetModal && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

        {/* User Table */}
        <div className="aims-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="aims-table min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Full Name
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Username
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Role
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Branch
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Created
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-gray-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-gray-500"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-medium text-gray-900">
                          {user.name ||
                            user.username}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-mono text-sm text-gray-600">
                        {user.username}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(
                            user.role
                          )}`}
                        >
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {user.branch?.name ||
                          "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                            user.status
                          )}`}
                        >
                          {user.status ===
                          "ACTIVE"
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-mono text-sm text-gray-400">
                        {formatDate(
                          user.createdAt
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openResetModal(
                                user
                              )
                            }
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            Reset Pwd
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleStatus(
                                user
                              )
                            }
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                              user.status ===
                              "ACTIVE"
                                ? "bg-red-50 text-red-700 hover:bg-red-100"
                                : "bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {user.status ===
                            "ACTIVE"
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Staff Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="shrink-0 border-b border-gray-200 px-6 py-5">
              <h2 className="text-lg font-bold text-gray-900">
                Create Staff Account
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Create a Branch Manager or Cashier
                account.
              </p>
            </div>

            {/* Scrollable Form */}
            <form
              onSubmit={handleCreateUser}
              className="min-h-0 overflow-y-auto"
            >
              <div className="space-y-4 px-6 py-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    placeholder="Enter full name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Username
                  </label>

                  <input
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                      )
                    }
                    placeholder="Enter username"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />

                  <p className="mt-1 text-xs text-gray-400">
                    3–30 characters: letters,
                    numbers, and underscores only.
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="staff@purpleyam.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Role
                  </label>

                  <select
                    value={role}
                    onChange={(event) =>
                      setRole(
                        event.target.value as
                          | "BRANCH_MANAGER"
                          | "CASHIER"
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="CASHIER">
                      Cashier
                    </option>

                    <option value="BRANCH_MANAGER">
                      Branch Manager
                    </option>
                  </select>
                </div>

                {/* Branch */}
                <div className="relative">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Branch
                  </label>

                  <input
                    type="text"
                    value={branchName}
                    onChange={(event) =>
                      handleBranchInput(
                        event.target.value
                      )
                    }
                    onFocus={() =>
                      setShowBranchOptions(true)
                    }
                    onBlur={() =>
                      setTimeout(
                        () =>
                          setShowBranchOptions(
                            false
                          ),
                        150
                      )
                    }
                    placeholder="Enter or select branch name"
                    autoComplete="off"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />

                  {/* Existing branch suggestions */}
                  {showBranchOptions &&
                    filteredBranches.length >
                      0 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Existing Branches
                        </p>

                        {filteredBranches.map(
                          (branch) => (
                            <button
                              key={branch.id}
                              type="button"
                              onMouseDown={(
                                event
                              ) =>
                                event.preventDefault()
                              }
                              onClick={() =>
                                selectBranch(
                                  branch
                                )
                              }
                              className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-purple-50"
                            >
                              <span>
                                <span className="block text-sm font-medium text-gray-900">
                                  {branch.name}
                                </span>

                                {branch.location && (
                                  <span className="block text-xs text-gray-400">
                                    {branch.location}
                                  </span>
                                )}
                              </span>

                              {branch.isCommissary && (
                                <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                                  Commissary
                                </span>
                              )}
                            </button>
                          )
                        )}
                      </div>
                    )}

                  {/* Existing branch selected */}
                  {exactBranchMatch && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ Existing branch selected.
                    </p>
                  )}

                  {/* New branch notice */}
                  {branchName.trim() &&
                    !exactBranchMatch && (
                      <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
                        <p className="text-xs text-purple-700">
                          This branch is not currently
                          in the branch list.
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-purple-900">
                          "{branchName.trim()}"
                        </p>

                        <p className="mt-1 text-xs text-purple-700">
                          It will be created automatically
                          when you create the staff account.
                        </p>
                      </div>
                    )}

                  <p className="mt-1 text-xs text-gray-400">
                    Select an existing branch or type a
                    new branch name. New branches are
                    created automatically.
                  </p>
                </div>

                {/* Temporary Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Temporary Password
                  </label>

                  <input
                    type="password"
                    value={temporaryPassword}
                    onChange={(event) =>
                      setTemporaryPassword(
                        event.target.value
                      )
                    }
                    placeholder="At least 8 characters"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />

                  <p className="mt-1 text-xs text-gray-400">
                    The password will be stored securely
                    as a hash.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Creating..."
                    : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal &&
        selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="shrink-0 border-b border-gray-200 px-6 py-5">
                <h2 className="text-lg font-bold text-gray-900">
                  Reset Password
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Reset the password for{" "}
                  <span className="font-medium text-gray-700">
                    {selectedUser.name ||
                      selectedUser.username}
                  </span>
                  .
                </p>
              </div>

              <form
                onSubmit={handleResetPassword}
                className="min-h-0 overflow-y-auto"
              >
                <div className="space-y-4 p-6">
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      New Password
                    </label>

                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) =>
                        setNewPassword(
                          event.target.value
                        )
                      }
                      placeholder="At least 8 characters"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                    />

                    <p className="mt-1 text-xs text-gray-400">
                      The password will be stored securely
                      as a hash.
                    </p>
                  </div>
                </div>

                <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                  <button
                    type="button"
                    onClick={
                      closeResetModal
                    }
                    disabled={submitting}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? "Resetting..."
                      : "Reset Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}