"use client";

type InventoryItem = {
  itemId: string;
  itemName: string;
  sourceType: string;
  unit: string;
  quantity: number;
  minThreshold: number;
};

type Alert = {
  id: string;
  itemName: string;
  threshold: number;
  currentStock: number;
  unit: string;
};

type Transaction = {
  id: string;
  type: "SALE" | "PRODUCTION" | "STOCK_RECEIPT" | "ADJUSTMENT";
  quantityDelta: number;
  createdAt: string;
  itemName: string;
  unit: string;
  username: string;
};

type Props = {
  user: {
    username: string;
    role: string;
    branch: {
      id: string;
      name: string;
      location: string;
    };
  };
  inventory: InventoryItem[];
  finishedProducts: InventoryItem[];
  alerts: Alert[];
  transactions: Transaction[];
  stats: {
    totalItems: number;
    lowStock: number;
    outOfStock: number;
    activeAlerts: number;
  };
};

function formatQuantity(quantity: number) {
  return Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(2).replace(/\.?0+$/, "");
}

function getStockStatus(
  quantity: number,
  minThreshold: number
) {
  if (quantity === 0) {
    return "OUT OF STOCK";
  }

  if (quantity <= minThreshold) {
    return "LOW STOCK";
  }

  return "IN STOCK";
}

function getStatusClass(status: string) {
  if (status === "OUT OF STOCK") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "LOW STOCK") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function formatTransactionType(
  type: Transaction["type"]
) {
  switch (type) {
    case "STOCK_RECEIPT":
      return "STOCK RECEIPT";

    case "ADJUSTMENT":
      return "ADJUSTMENT";

    case "PRODUCTION":
      return "PRODUCTION";

    case "SALE":
      return "SALE";

    default:
      return type;
  }
}

function getTransactionClass(
  type: Transaction["type"]
) {
  switch (type) {
    case "SALE":
      return "bg-red-50 text-red-700 border-red-200";

    case "PRODUCTION":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "STOCK_RECEIPT":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "ADJUSTMENT":
      return "bg-gray-50 text-gray-700 border-gray-200";

    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

export default function ManagerDashboard({
  user,
  inventory,
  finishedProducts,
  alerts,
  transactions,
  stats,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Branch Manager Dashboard
          </h1>

          <p className="mt-0.5 text-sm text-gray-500">
            {user.branch.name} — {today}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total Items
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {stats.totalItems}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Inventory entries
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Low Stock
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-600">
              {stats.lowStock}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              At or below threshold
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Out of Stock
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {stats.outOfStock}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Zero quantity
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Active Alerts
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                stats.activeAlerts > 0
                  ? "text-red-600"
                  : "text-gray-900"
              }`}
            >
              {stats.activeAlerts}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Pending review
            </p>
          </div>
        </div>

        {/* Alerts + Transactions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Reorder Alerts */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Reorder Alerts
              </h2>

              <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-mono text-red-600">
                {alerts.length} active
              </span>
            </div>

            {alerts.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                No active alerts for this branch.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">

                {alerts.map((alert) => {
                  const status =
                    alert.currentStock === 0
                      ? "OUT OF STOCK"
                      : "LOW STOCK";

                  return (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {alert.itemName}
                        </p>

                        <p className="text-xs text-gray-400">
                          Threshold:{" "}
                          {formatQuantity(alert.threshold)}{" "}
                          {alert.unit}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold text-red-700">
                          {formatQuantity(alert.currentStock)}{" "}
                          {alert.unit}
                        </p>

                        <span
                          className={`mt-1 inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${getStatusClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Transactions */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Recent Branch Activity
              </h2>
            </div>

            {transactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                No recent transactions.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">

                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-start gap-3 px-5 py-3"
                  >
                    <span
                      className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${getTransactionClass(
                        transaction.type
                      )}`}
                    >
                      {formatTransactionType(transaction.type)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-700">
                        {transaction.itemName}
                      </p>

                      <p className="text-xs text-gray-400">
                        {transaction.username}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={`font-mono text-xs font-semibold ${
                          transaction.quantityDelta > 0
                            ? "text-emerald-600"
                            : transaction.quantityDelta < 0
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        {transaction.quantityDelta > 0
                          ? "+"
                          : ""}
                        {formatQuantity(
                          transaction.quantityDelta
                        )}{" "}
                        {transaction.unit}
                      </p>

                      <p className="text-xs text-gray-400">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Current Inventory */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Current Inventory — {user.branch.name}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Item
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Stock
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Threshold
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {inventory.map((item) => {
                  const status = getStockStatus(
                    item.quantity,
                    item.minThreshold
                  );

                  return (
                    <tr
                      key={item.itemId}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.itemName}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500">
                        {item.sourceType.replaceAll("_", " ")}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">
                        {formatQuantity(item.quantity)}{" "}
                        <span className="text-xs font-normal text-gray-400">
                          {item.unit}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-gray-500">
                        {formatQuantity(item.minThreshold)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${getStatusClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Finished Products */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Finished Product Stock — {user.branch.name}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Product
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Available
                  </th>
                </tr>
              </thead>

              <tbody>
                {finishedProducts.map((product) => {
                  const quantity = product.quantity;

                  return (
                    <tr
                      key={product.itemId}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {product.itemName}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono font-semibold ${
                            quantity === 0
                              ? "text-red-600"
                              : quantity <= 3
                              ? "text-amber-600"
                              : "text-gray-800"
                          }`}
                        >
                          {formatQuantity(quantity)}{" "}
                          {product.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}