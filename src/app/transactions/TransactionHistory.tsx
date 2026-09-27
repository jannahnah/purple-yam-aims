"use client";

import { useMemo, useState } from "react";
import { formatItemLabel } from "@/lib/item-label";

type Transaction = {
  id: string;
  type:
    | "SALE"
    | "PRODUCTION"
    | "STOCK_RECEIPT"
    | "ADJUSTMENT"
    | "TRANSFER_IN"
    | "TRANSFER_OUT";
  transferId: string | null;
  transferBranchId: string | null;
  transferBranchName: string | null;
  previousQuantity: number | null;
  quantityDelta: number;
  newQuantity: number | null;
  createdAt: string;
  item: {
    name: string;
    size?: "SMALL" | "ROUND" | "MEDIUM" | "LARGE" | null;
    unit: string;
    sourceType: string;
  };
  branch: { name: string };
  user: { username: string; role: string };
};

type CurrentUser = {
  role: "OWNER" | "BRANCH_MANAGER" | "CASHIER";
  branchName: string | null;
};

type ViewMode = "DAY" | "WEEK" | "MONTH" | "CUSTOM";

const TZ = "Asia/Manila";

function dateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function monthKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  }).format(value);
}

function displayDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function displayTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function number(value: number) {
  return Number(value.toFixed(2));
}

function formatNumber(value: number) {
  return number(value).toLocaleString("en-PH");
}

function formatType(type: Transaction["type"]) {
  return type.replaceAll("_", " ");
}

function transactionTone(type: Transaction["type"]) {
  if (type === "SALE") return "text-red-600 bg-red-50";
  if (type === "PRODUCTION") return "text-purple-700 bg-purple-50";
  if (type === "STOCK_RECEIPT") return "text-green-700 bg-green-50";
  if (type === "ADJUSTMENT") return "text-amber-700 bg-amber-50";
  return "text-blue-700 bg-blue-50";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  return startOfDay(addDays(date, -day));
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function transactionDateInRange(
  transaction: Transaction,
  from: Date,
  to: Date
) {
  const key = dateKey(transaction.createdAt);
  const fromKey = inputDate(from);
  const toKey = inputDate(to);
  return key >= fromKey && key <= toKey;
}

export default function TransactionHistory({
  transactions,
  currentUser,
}: {
  transactions: Transaction[];
  currentUser: CurrentUser;
}) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("DAY");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [itemFilter, setItemFilter] = useState("ALL");
  const [customFrom, setCustomFrom] = useState(() => inputDate(addDays(new Date(), -6)));
  const [customTo, setCustomTo] = useState(() => inputDate(new Date()));

  const branches = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.branch.name))).sort(),
    [transactions]
  );

  const items = useMemo(
    () =>
      Array.from(
        new Set(transactions.map((t) => formatItemLabel(t.item)))
      ).sort(),
    [transactions]
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const matchesBranch =
          branchFilter === "ALL" || transaction.branch.name === branchFilter;
        const matchesType =
          typeFilter === "ALL" || transaction.type === typeFilter;
        const matchesItem =
          itemFilter === "ALL" ||
          formatItemLabel(transaction.item) === itemFilter;

        return matchesBranch && matchesType && matchesItem;
      }),
    [transactions, branchFilter, typeFilter, itemFilter]
  );

  const calendarDays = useMemo(() => {
    const first = startOfMonth(calendarMonth);
    const gridStart = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [calendarMonth]);

  const transactionDays = useMemo(() => {
    const counts = new Map<string, number>();
    filteredTransactions.forEach((transaction) => {
      const key = dateKey(transaction.createdAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [filteredTransactions]);

  const period = useMemo(() => {
    if (viewMode === "DAY") {
      return { from: selectedDate, to: selectedDate };
    }

    if (viewMode === "WEEK") {
      return { from: startOfWeek(selectedDate), to: endOfWeek(selectedDate) };
    }

    if (viewMode === "MONTH") {
      return { from: startOfMonth(selectedDate), to: endOfMonth(selectedDate) };
    }

    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T00:00:00`);
    return {
      from: from <= to ? from : to,
      to: from <= to ? to : from,
    };
  }, [viewMode, selectedDate, customFrom, customTo]);

  const periodTransactions = useMemo(
    () =>
      filteredTransactions.filter((transaction) =>
        transactionDateInRange(transaction, period.from, period.to)
      ),
    [filteredTransactions, period]
  );

  const selectedDayTransactions = useMemo(
    () =>
      filteredTransactions.filter(
        (transaction) => dateKey(transaction.createdAt) === inputDate(selectedDate)
      ),
    [filteredTransactions, selectedDate]
  );

  const summary = useMemo(() => {
    let sales = 0;
    let production = 0;
    let consumption = 0;
    let received = 0;
    let transfers = 0;
    let adjustments = 0;

    for (const transaction of periodTransactions) {
      if (transaction.type === "SALE") {
        sales += Math.abs(transaction.quantityDelta);
      } else if (
        transaction.type === "PRODUCTION" &&
        transaction.item.sourceType === "FINISHED_PRODUCT" &&
        transaction.quantityDelta > 0
      ) {
        production += transaction.quantityDelta;
      } else if (
        transaction.type === "PRODUCTION" &&
        transaction.quantityDelta < 0
      ) {
        consumption += Math.abs(transaction.quantityDelta);
      } else if (
        transaction.type === "STOCK_RECEIPT" &&
        transaction.quantityDelta > 0
      ) {
        received += transaction.quantityDelta;
      } else if (
        transaction.type === "TRANSFER_IN" ||
        transaction.type === "TRANSFER_OUT"
      ) {
        transfers += Math.abs(transaction.quantityDelta);
      } else if (transaction.type === "ADJUSTMENT") {
        adjustments += 1;
      }
    }

    return { sales, production, consumption, received, transfers, adjustments };
  }, [periodTransactions]);

  const productSales = useMemo(() => {
    const map = new Map<string, number>();

    periodTransactions
      .filter((t) => t.type === "SALE")
      .forEach((t) => {
        const label = formatItemLabel(t.item);
        map.set(label, (map.get(label) ?? 0) + Math.abs(t.quantityDelta));
      });

    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [periodTransactions]);

  const productionByProduct = useMemo(() => {
    const map = new Map<string, number>();

    periodTransactions
      .filter(
        (t) =>
          t.type === "PRODUCTION" &&
          t.item.sourceType === "FINISHED_PRODUCT" &&
          t.quantityDelta > 0
      )
      .forEach((t) => {
        const label = formatItemLabel(t.item);
        map.set(label, (map.get(label) ?? 0) + t.quantityDelta);
      });

    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [periodTransactions]);

  const periodLabel = useMemo(() => {
    if (viewMode === "DAY") return displayDate(selectedDate);
    if (viewMode === "WEEK") {
      return `${displayDate(period.from)} – ${displayDate(period.to)}`;
    }
    if (viewMode === "MONTH") {
      return new Intl.DateTimeFormat("en-PH", {
        month: "long",
        year: "numeric",
      }).format(calendarMonth);
    }
    return `${inputDate(period.from)} – ${inputDate(period.to)}`;
  }, [viewMode, selectedDate, period, calendarMonth]);

  function selectDay(day: Date) {
    setSelectedDate(startOfDay(day));
    setCalendarMonth(startOfMonth(day));
    setViewMode("DAY");
  }

  function moveMonth(amount: number) {
    const next = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + amount,
      1
    );
    setCalendarMonth(next);
  }

  function resetFilters() {
    setBranchFilter("ALL");
    setTypeFilter("ALL");
    setItemFilter("ALL");
  }

  const hasFilters =
    branchFilter !== "ALL" || typeFilter !== "ALL" || itemFilter !== "ALL";

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold text-purple-600">
              History & Analytics
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Transaction History
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Review sales, production, consumption, stock receipts, and
              inventory movements by day, week, month, or custom period.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Records
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {periodTransactions.length.toLocaleString("en-PH")}
            </p>
            <p className="text-xs text-gray-500">{periodLabel}</p>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(["DAY", "WEEK", "MONTH", "CUSTOM"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    viewMode === mode
                      ? "bg-purple-600 text-white"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-purple-50"
                  }`}
                >
                  {mode === "DAY"
                    ? "Day"
                    : mode === "WEEK"
                      ? "Week"
                      : mode === "MONTH"
                        ? "Month"
                        : "Custom Range"}
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[720px]">
              <select
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
                className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700"
              >
                <option value="ALL">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700"
              >
                <option value="ALL">All Activities</option>
                <option value="SALE">Sales</option>
                <option value="PRODUCTION">Production / Consumption</option>
                <option value="STOCK_RECEIPT">Stock Receipts</option>
                <option value="ADJUSTMENT">Adjustments</option>
                <option value="TRANSFER_IN">Transfer In</option>
                <option value="TRANSFER_OUT">Transfer Out</option>
              </select>

              <select
                value={itemFilter}
                onChange={(event) => setItemFilter(event.target.value)}
                className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700"
              >
                <option value="ALL">All Items / Products</option>
                {items.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 text-xs font-semibold text-purple-700 hover:underline"
            >
              Clear filters
            </button>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["Sales", summary.sales, "text-red-600"],
            ["Produced", summary.production, "text-purple-700"],
            ["Consumed", summary.consumption, "text-orange-600"],
            ["Received", summary.received, "text-green-700"],
            ["Transfers", summary.transfers, "text-blue-700"],
            ["Adjustments", summary.adjustments, "text-amber-700"],
          ].map(([label, value, tone]) => (
            <div key={String(label)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {label}
              </p>
              <p className={`mt-1 text-xl font-bold ${tone}`}>
                {formatNumber(Number(value))}
              </p>
            </div>
          ))}
        </section>

        <section className="mx-auto w-full max-w-5xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Activity Calendar</h2>
              <p className="text-sm text-gray-500">
                Select a date to see everything recorded that day.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                aria-label="Previous month"
              >
                ←
              </button>
              <p className="min-w-36 text-center text-sm font-semibold text-gray-900">
                {new Intl.DateTimeFormat("en-PH", {
                  month: "long",
                  year: "numeric",
                }).format(calendarMonth)}
              </p>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                aria-label="Next month"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-100 pb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const key = inputDate(day);
              const count = transactionDays.get(key) ?? 0;
              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
              const isSelected = key === inputDate(selectedDate);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`min-h-16 rounded-lg border p-1.5 text-left transition sm:min-h-20 ${
                    isSelected
                      ? "border-purple-500 bg-purple-50 ring-1 ring-purple-300"
                      : "border-transparent hover:border-purple-200 hover:bg-purple-50/50"
                  } ${isCurrentMonth ? "text-gray-900" : "text-gray-300"}`}
                >
                  <span className={`text-sm font-semibold ${isSelected ? "text-purple-700" : ""}`}>
                    {day.getDate()}
                  </span>

                  {count > 0 && (
                    <span className="mt-2 block w-fit rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                      {count} {count === 1 ? "record" : "records"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {viewMode === "CUSTOM" && (
          <section className="mx-auto w-full max-w-5xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700">
                From
                <input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                To
                <input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
                />
              </label>
            </div>
          </section>
        )}

        {(viewMode === "WEEK" || viewMode === "MONTH") && (
          <section className="mx-auto w-full max-w-5xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              Planning Summary
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Historical quantities that can be used when planning production
              for holidays, events, and recurring demand.
            </p>

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Products Sold
                </h3>
                {productSales.length === 0 ? (
                  <p className="text-sm text-gray-400">No sales recorded for this period.</p>
                ) : (
                  <div className="space-y-2">
                    {productSales.slice(0, 10).map(([item, quantity]) => (
                      <div key={item} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <span className="text-gray-700">{item}</span>
                        <span className="font-bold text-gray-900">{formatNumber(quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Finished Products Produced
                </h3>
                {productionByProduct.length === 0 ? (
                  <p className="text-sm text-gray-400">No production recorded for this period.</p>
                ) : (
                  <div className="space-y-2">
                    {productionByProduct.slice(0, 10).map(([item, quantity]) => (
                      <div key={item} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <span className="text-gray-700">{item}</span>
                        <span className="font-bold text-gray-900">{formatNumber(quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h2 className="text-lg font-bold text-gray-900">
              {viewMode === "DAY" ? `Activity on ${displayDate(selectedDate)}` : `Transaction Ledger — ${periodLabel}`}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Inventory movements are shown like a bank-style ledger: previous
              quantity → change → resulting balance.
            </p>
          </div>

          {viewMode === "DAY" && selectedDayTransactions.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              No transactions were recorded on {displayDate(selectedDate)}.
            </div>
          ) : periodTransactions.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              No transactions were recorded for this period.
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 shadow-sm">
                  <tr>
                    <th className="px-3 py-2.5">Date / Time</th>
                    <th className="px-3 py-2.5">Activity</th>
                    <th className="px-3 py-2.5">Item / Product</th>
                    <th className="px-3 py-2.5">Branch</th>
                    <th className="px-3 py-2.5 text-right">Previous</th>
                    <th className="px-3 py-2.5 text-right">Change</th>
                    <th className="px-3 py-2.5 text-right">Balance</th>
                    <th className="px-3 py-2.5">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {periodTransactions
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                          <div>{displayDate(transaction.createdAt)}</div>
                          <div className="text-xs text-gray-400">{displayTime(transaction.createdAt)}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${transactionTone(transaction.type)}`}>
                            {formatType(transaction.type)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">
                          {formatItemLabel(transaction.item)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{transaction.branch.name}</td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {transaction.previousQuantity === null ? "—" : formatNumber(transaction.previousQuantity)}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${
                          transaction.quantityDelta > 0 ? "text-green-600" : transaction.quantityDelta < 0 ? "text-red-600" : "text-gray-500"
                        }`}>
                          {transaction.quantityDelta > 0 ? "+" : ""}
                          {formatNumber(transaction.quantityDelta)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                          {transaction.newQuantity === null ? "—" : formatNumber(transaction.newQuantity)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{transaction.user.username}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
