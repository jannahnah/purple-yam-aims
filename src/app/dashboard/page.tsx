"use client";

import { useEffect, useState } from "react";

interface AlertItem {
  id: string;
  status: string;
  item: {
    name: string;
    unit: string;
  };
  branch: {
    name: string;
  };
}

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/dashboard/alerts");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } catch (err) {
        console.error("Failed to load alerts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-900">Owner Dashboard</h1>
          <p className="text-gray-500">Manage stock alerts and branch inventory</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/inventory"
            className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Manage Inventory
          </a>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Pending Stock Reorder Alerts
        </h2>

        {loading ? (
          <p className="text-gray-400">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p className="text-gray-500">No pending alerts at the moment.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-amber-900">
                    {alert.item?.name || "Item"}
                  </p>
                  <p className="text-xs text-amber-700">
                    Branch: {alert.branch?.name || "N/A"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href="/inventory"
                    className="bg-amber-600 text-white px-3 py-1.5 rounded text-xs hover:bg-amber-700 transition"
                  >
                    Adjust Stock
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}