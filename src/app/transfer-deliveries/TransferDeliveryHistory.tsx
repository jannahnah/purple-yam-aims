"use client";

import { useMemo, useState } from "react";

type T = {
  id: string;
  transferId: string | null;
  type: "TRANSFER_IN" | "TRANSFER_OUT";
  quantityDelta: number;
  previousQuantity: number | null;
  newQuantity: number | null;
  createdAt: string;
  item: { name: string; unit: string; sourceType: string };
  branch: { id: string; name: string };
  transferBranchName: string | null;
  user: { username: string; role: string };
};

type Props = {
  transactions: T[];
  currentUser: { role: "OWNER" | "BRANCH_MANAGER"; branchName: string | null };
};

function qty(n: number | null) {
  return n === null ? "—" : Number(n.toFixed(2)).toString();
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function source(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TransferDeliveryHistory({
  transactions,
  currentUser,
}: Props) {
  const [branch, setBranch] = useState("ALL");
  const [item, setItem] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const records = useMemo(() => {
    const groups = new Map<string, T[]>();

    for (const tx of transactions) {
      const key = tx.transferId ?? tx.id;
      groups.set(key, [...(groups.get(key) ?? []), tx]);
    }

    return [...groups.entries()]
      .map(([key, group]) => {
        const out = group.find((x) => x.type === "TRANSFER_OUT");
        const incoming = group.find((x) => x.type === "TRANSFER_IN");
        const primary = out ?? incoming ?? group[0];
        if (!primary) return null;

        const from = out?.branch.name ?? primary.transferBranchName ?? "Unknown";
        const to =
          incoming?.branch.name ??
          (out ? out.transferBranchName : primary.branch.name) ??
          "Unknown";

        return {
          key,
          transferId: primary.transferId,
          createdAt: group.reduce(
            (latest, x) =>
              new Date(x.createdAt) > new Date(latest)
                ? x.createdAt
                : latest,
            primary.createdAt
          ),
          item: primary.item.name,
          unit: primary.item.unit,
          sourceType: primary.item.sourceType,
          quantity: Math.abs(primary.quantityDelta),
          from,
          to,
          recordedBy:
            out?.user.username ?? incoming?.user.username ?? primary.user.username,
          status: primary.transferId ? "COMPLETED" : "RECORDED",
          out: out ?? null,
          incoming: incoming ?? null,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b!.createdAt).getTime() -
          new Date(a!.createdAt).getTime()
      );
  }, [transactions]);

  const branches = useMemo(
    () => [...new Set(records.flatMap((r) => [r!.from, r!.to]))].sort(),
    [records]
  );

  const items = useMemo(
    () => [...new Set(records.map((r) => r!.item))].sort(),
    [records]
  );

  const filtered = records.filter(
    (r) =>
      r &&
      (currentUser.role !== "OWNER" ||
        branch === "ALL" ||
        r.from === branch ||
        r.to === branch) &&
      (item === "ALL" || r.item === item)
  );

  return (
    <main className="min-h-full bg-[#f7f7fa]">
      <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600">Inventory Management</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              Transfer & Delivery History
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              One record for each branch-to-branch movement of raw materials,
              packaging materials, or finished products.
            </p>
            <span className="mt-3 inline-flex rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
              {currentUser.role === "OWNER"
                ? "OWNER • ALL BRANCHES"
                : `${currentUser.role.replace("_", " ")} • ${currentUser.branchName ?? "NO BRANCH"}`}
            </span>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Showing</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{filtered.length}</p>
            <p className="text-xs text-gray-500">of {records.length} transfer records</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div
            className={`grid gap-4 ${
              currentUser.role === "OWNER" ? "md:grid-cols-2" : "md:grid-cols-1"
            }`}
          >
            {currentUser.role === "OWNER" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Branch
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Item
              </label>
              <select
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                <option value="ALL">All Items</option>
                {items.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-base font-bold text-gray-900">Transfer & Delivery Records</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {currentUser.role === "OWNER"
                ? "All branch-to-branch movements are shown. Use the filters to narrow the list."
                : `Only movements involving ${currentUser.branchName ?? "your branch"} are shown.`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5">Item</th>
                  <th className="px-5 py-3.5">Quantity</th>
                  <th className="px-5 py-3.5">From</th>
                  <th className="px-5 py-3.5">To</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Recorded By</th>
                  <th className="px-5 py-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <p className="font-semibold text-gray-800">
                        No transfer or delivery records found
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Try changing your item filter.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    if (!r) return null;
                    const open = expanded === r.key;
                    return (
                      <tr key={r.key} className="align-top hover:bg-purple-50/40">
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                          {dateTime(r.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{r.item}</p>
                          <p className="mt-1 text-xs text-gray-500">{source(r.sourceType)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900">{qty(r.quantity)}</p>
                          <p className="text-xs text-gray-500">{r.unit}</p>
                        </td>
                        <td className="px-5 py-4 font-medium text-gray-800">{r.from}</td>
                        <td className="px-5 py-4 font-medium text-gray-800">{r.to}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-medium text-gray-900">{r.recordedBy}</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setExpanded(open ? null : r.key)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            {open ? "Hide Details" : "View Details"}
                          </button>
                          {open && (
                            <div className="mt-3 w-[350px] rounded-xl border border-purple-100 bg-purple-50 p-4 text-xs text-gray-700">
                              <p className="font-semibold text-purple-900">Transfer Details</p>
                              <div className="mt-3 space-y-2">
                                <p>
                                  <span className="font-semibold">Transfer ID:</span>{" "}
                                  {r.transferId ?? "—"}
                                </p>
                                <p>
                                  <span className="font-semibold">Movement:</span>{" "}
                                  {r.from} → {r.to}
                                </p>
                                <p>
                                  <span className="font-semibold">Quantity:</span>{" "}
                                  {qty(r.quantity)} {r.unit}
                                </p>
                                <div className="border-t border-purple-100 pt-2">
                                  <p className="font-semibold text-gray-800">Inventory Effect</p>
                                  {r.out && (
                                    <p className="mt-1">
                                      {r.from}: {qty(r.out.previousQuantity)} →{" "}
                                      {qty(r.out.newQuantity)}
                                    </p>
                                  )}
                                  {r.incoming && (
                                    <p className="mt-1">
                                      {r.to}: {qty(r.incoming.previousQuantity)} →{" "}
                                      {qty(r.incoming.newQuantity)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
