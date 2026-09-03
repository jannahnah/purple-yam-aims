"use client";

import { useEffect, useState } from "react";

interface AlertItem {
  id: string;
  status: string;
  currentQuantity: number;
  item: {
    name: string;
    unit: string;
    minThreshold: number;
  };
  branch: {
    id: string;
    name: string;
  };
}

interface DashboardUser {
  id: string;
  username: string;
  role: string;
  branchId: string | null;
  branch: {
    id: string;
    name: string;
    location: string;
  } | null;
}

interface DashboardClientProps {
  user: DashboardUser;
}

export default function DashboardClient({
  user,
}: DashboardClientProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/dashboard/alerts");

        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } catch (error) {
        console.error("Failed to load stock notifications:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
{/* Dashboard Header */}
<div className="flex justify-between items-center border-b pb-4">
  <div>
    <h1 className="text-3xl font-bold text-purple-900">
      Owner Dashboard
    </h1>

    <p className="text-gray-500">
      Monitor inventory, branches, production, and stock notifications
    </p>

    <p className="text-sm text-gray-600 mt-2">
      Signed in as{" "}
      <span className="font-semibold">{user.username}</span>
    </p>
  </div>

  <div className="flex gap-3 items-center">
    <a
      href="/inventory"
      className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
    >
      Manage Inventory
    </a>

    <button
      type="button"
        onClick={async () => {
          try {
            const response = await fetch("/api/auth/logout", {
              method: "POST",
            });

            if (response.ok) {
              window.location.href = "/";
            }
          } catch (error) {
            console.error("Logout failed:", error);
          }
        }}
        className="border border-gray-300 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
        Sign Out
        </button>
      </div>
    </div>

      {/* Stock Notifications */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Stock Notifications
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Items that have reached or fallen below their minimum stock level.
            </p>
          </div>

          {!loading && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔔</span>

              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
                {alerts.length}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-gray-400">
            Loading stock notifications...
          </p>
        ) : alerts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-2xl mb-2">✓</p>

            <p className="font-medium text-gray-700">
              No stock notifications
            </p>

            <p className="text-sm text-gray-500 mt-1">
              No items currently require replenishment review.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((notification) => {
              const currentQuantity = notification.currentQuantity;

              return (
                <div
                  key={notification.id}
                  className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl">⚠️</div>

                    <div>
                      <p className="font-semibold text-amber-900">
                        {notification.item.name}
                      </p>

                      <p className="text-sm text-amber-800">
                        {notification.branch.name}
                      </p>

                      <div className="flex gap-4 mt-1 text-xs text-amber-700">
                        <span>
                          Current:{" "}
                          <strong>
                            {currentQuantity} {notification.item.unit}
                          </strong>
                        </span>

                        <span>
                          Minimum:{" "}
                          <strong>
                            {notification.item.minThreshold}{" "}
                            {notification.item.unit}
                          </strong>
                        </span>
                      </div>

                      <p className="text-xs text-amber-700 mt-1">
                        Stock requires replenishment review.
                      </p>
                    </div>
                  </div>

                  <a
                    href="/inventory"
                    className="shrink-0 bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-amber-700 transition"
                  >
                    Review Inventory
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}