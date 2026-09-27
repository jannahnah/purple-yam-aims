import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatItemLabel } from "@/lib/item-label";

export const runtime = "nodejs";

type ExportFormat = "xlsx" | "csv";

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(value)
    .replace(",", "");
}

function statusFor(quantity: number, minThreshold: number) {
  if (quantity <= 0) return "OUT OF STOCK";
  if (quantity <= minThreshold) return "LOW STOCK";
  return "NORMAL";
}

function formatSourceType(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatTransactionType(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatDateColumn(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00+08:00`);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function buildDateKeys(startDate: string, endDate: string) {
  const keys: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00+08:00`);
  const end = new Date(`${endDate}T00:00:00+08:00`);

  while (cursor <= end) {
    keys.push(formatDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

function parseExportDateRange(url: URL) {
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (!startDate && !endDate) {
    return null;
  }

  if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("Start date and end date are required in YYYY-MM-DD format.");
  }

  const start = new Date(`${startDate}T00:00:00+08:00`);
  const end = new Date(`${endDate}T00:00:00+08:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new Error("Start date must be on or before end date.");
  }

  return {
    startDate,
    endDate,
    startAt: start,
    endAt: new Date(end.getTime() + 24 * 60 * 60 * 1000),
  };
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    if (
      currentUser.role !== "OWNER" &&
      currentUser.role !== "BRANCH_MANAGER"
    ) {
      return NextResponse.json(
        { error: "You do not have permission to export reports." },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format") as ExportFormat | null;

    if (format !== "xlsx" && format !== "csv") {
      return NextResponse.json(
        { error: "Unsupported export format. Use xlsx or csv." },
        { status: 400 }
      );
    }

    let exportDateRange;
    try {
      exportDateRange = parseExportDateRange(url);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid export date range." },
        { status: 400 }
      );
    }

    // Branch scope is derived exclusively from the authenticated user.
    // A Branch Manager cannot override this with a query parameter.
    const branchWhere =
      currentUser.role === "OWNER"
        ? {}
        : {
            branchId: currentUser.branchId ?? "__NO_BRANCH__",
          };

    const [inventory, transactions, branches] = await Promise.all([
      prisma.branchStock.findMany({
        where: {
          ...branchWhere,
          item: {
            isActive: true,
          },
        },
        include: {
          item: true,
          branch: true,
        },
        orderBy: [
          { branch: { name: "asc" } },
          { item: { name: "asc" } },
        ],
      }),
      prisma.stockTransaction.findMany({
        where: {
          ...branchWhere,
          ...(exportDateRange
            ? {
                createdAt: {
                  gte: exportDateRange.startAt,
                  lt: exportDateRange.endAt,
                },
              }
            : {}),
        },
        include: {
          item: true,
          branch: true,
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.branch.findMany({
        where: branchWhere,
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    const transferBranchIds = Array.from(
      new Set(
        transactions
          .map((transaction) => transaction.transferBranchId)
          .filter(
            (branchId): branchId is string => Boolean(branchId)
          )
      )
    );

    const transferBranches =
      transferBranchIds.length > 0
        ? await prisma.branch.findMany({
            where: {
              id: {
                in: transferBranchIds,
              },
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [];

    const transferBranchMap = new Map(
      transferBranches.map((branch) => [branch.id, branch.name])
    );

    const transferGroups = new Map<string, typeof transactions>();

    for (const transaction of transactions) {
      if (
        transaction.type !== "TRANSFER_IN" &&
        transaction.type !== "TRANSFER_OUT"
      ) {
        continue;
      }

      const key = transaction.transferId ?? transaction.id;
      transferGroups.set(key, [
        ...(transferGroups.get(key) ?? []),
        transaction,
      ]);
    }

    const transferDeliveries = [...transferGroups.entries()]
      .map(([id, group]) => {
        const outgoing = group.find(
          (transaction) => transaction.type === "TRANSFER_OUT"
        );
        const incoming = group.find(
          (transaction) => transaction.type === "TRANSFER_IN"
        );
        const primary = outgoing ?? incoming ?? group[0];

        if (!primary) return null;

        const from =
          outgoing?.branch.name ??
          (primary.type === "TRANSFER_IN" && primary.transferBranchId
            ? transferBranchMap.get(primary.transferBranchId) ?? null
            : null) ??
          "Unknown";

        const to =
          incoming?.branch.name ??
          (outgoing?.transferBranchId
            ? transferBranchMap.get(outgoing.transferBranchId) ?? null
            : null) ??
          "Unknown";

        return {
          id,
          transferId: primary.transferId ?? "",
          createdAt: group.reduce(
            (latest, transaction) =>
              transaction.createdAt > latest
                ? transaction.createdAt
                : latest,
            primary.createdAt
          ),
          item: formatItemLabel(primary.item),
          sourceType: formatSourceType(primary.item.sourceType),
          unit: primary.item.unit,
          quantity: Math.abs(primary.quantityDelta),
          from,
          to,
          status: primary.transferId ? "COMPLETED" : "RECORDED",
          "Recorded By":
            outgoing?.user.username ??
            incoming?.user.username ??
            primary.user.username,
          "Source Previous Quantity": outgoing?.previousQuantity ?? "",
          "Source New Quantity": outgoing?.newQuantity ?? "",
          "Destination Previous Quantity": incoming?.previousQuantity ?? "",
          "Destination New Quantity": incoming?.newQuantity ?? "",
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b!.createdAt).getTime() -
          new Date(a!.createdAt).getTime()
      );

    const reportGeneratedAt = new Date();
    const reportDateTime = formatDateTime(reportGeneratedAt);

    const inventoryRows = inventory.map((stock) => ({
      "Report Date & Time": reportDateTime,
      Branch: stock.branch.name,
      Item: formatItemLabel(stock.item),
      "Source Type": formatSourceType(stock.item.sourceType),
      Unit: stock.item.unit,
      "Current Quantity": stock.quantity,
      "Minimum Threshold": stock.item.minThreshold,
      Status: statusFor(stock.quantity, stock.item.minThreshold),
    }));

    const lowStockRows = inventory
      .filter(
        (stock) =>
          stock.quantity > 0 &&
          stock.quantity <= stock.item.minThreshold
      )
      .map((stock) => ({
        "Report Date & Time": reportDateTime,
        Branch: stock.branch.name,
        Item: formatItemLabel(stock.item),
        "Source Type": formatSourceType(stock.item.sourceType),
        Unit: stock.item.unit,
        "Current Quantity": stock.quantity,
        "Minimum Threshold": stock.item.minThreshold,
        Deficit: stock.item.minThreshold - stock.quantity,
      }));

    const outOfStockRows = inventory
      .filter((stock) => stock.quantity <= 0)
      .map((stock) => ({
        "Report Date & Time": reportDateTime,
        Branch: stock.branch.name,
        Item: formatItemLabel(stock.item),
        "Source Type": formatSourceType(stock.item.sourceType),
        Unit: stock.item.unit,
        "Current Quantity": stock.quantity,
        "Minimum Threshold": stock.item.minThreshold,
        Status: "OUT OF STOCK",
      }));

    const salesRows = transactions
      .filter((transaction) => transaction.type === "SALE")
      .map((transaction) => ({
        "Report Date & Time": reportDateTime,
        "Date & Time": formatDateTime(transaction.createdAt),
        Branch: transaction.branch.name,
        Product: formatItemLabel(transaction.item),
        Unit: transaction.item.unit,
        Quantity: Math.abs(transaction.quantityDelta),
        "Recorded By": transaction.user.username,
      }));

    const productionRows = transactions
      .filter(
        (transaction) =>
          transaction.type === "PRODUCTION" &&
          transaction.item.sourceType === "FINISHED_PRODUCT" &&
          transaction.quantityDelta > 0
      )
      .map((transaction) => ({
        "Report Date & Time": reportDateTime,
        "Date & Time": formatDateTime(transaction.createdAt),
        Branch: transaction.branch.name,
        Product: formatItemLabel(transaction.item),
        Unit: transaction.item.unit,
        "Quantity Produced": transaction.quantityDelta,
        "Recorded By": transaction.user.username,
      }));

    const transferDeliveryRows = transferDeliveries.map((transfer) => ({
      "Report Date & Time": reportDateTime,
      "Date & Time": formatDateTime(transfer!.createdAt),
      "Transfer ID": transfer!.transferId,
      Item: transfer!.item,
      "Source Type": transfer!.sourceType,
      Unit: transfer!.unit,
      Quantity: transfer!.quantity,
      From: transfer!.from,
      To: transfer!.to,
      Status: transfer!.status,
      "Recorded By": transfer!["Recorded By"],
      "Source Previous Quantity": transfer!["Source Previous Quantity"],
      "Source New Quantity": transfer!["Source New Quantity"],
      "Destination Previous Quantity":
        transfer!["Destination Previous Quantity"],
      "Destination New Quantity":
        transfer!["Destination New Quantity"],
    }));

    const transactionRows = transactions.map((transaction) => ({
      "Report Date & Time": reportDateTime,
      "Date & Time": formatDateTime(transaction.createdAt),
      Transaction: formatTransactionType(transaction.type),
      Branch: transaction.branch.name,
      Item: formatItemLabel(transaction.item),
      "Source Type": formatSourceType(transaction.item.sourceType),
      Unit: transaction.item.unit,
      "Previous Quantity": transaction.previousQuantity ?? "",
      Change: transaction.quantityDelta,
      "New Quantity": transaction.newQuantity ?? "",
      User: transaction.user.username,
      "User Role": transaction.user.role,
    }));

    const transactionDateKeys = exportDateRange
      ? buildDateKeys(exportDateRange.startDate, exportDateRange.endDate)
      : Array.from(
          new Set(
            transactions.map((transaction) =>
              formatDateKey(transaction.createdAt)
            )
          )
        ).sort();

    const branchTransactionTypes = Array.from(
      new Set(transactions.map((transaction) => transaction.type))
    );

    const branchGroups = new Map<
      string,
      {
        name: string;
        transactions: typeof transactions;
      }
    >();

    for (const branch of branches) {
      branchGroups.set(branch.id, {
        name: branch.name,
        transactions: [],
      });
    }

    for (const transaction of transactions) {
      const existing = branchGroups.get(transaction.branchId);

      if (existing) {
        existing.transactions.push(transaction);
      } else {
        branchGroups.set(transaction.branchId, {
          name: transaction.branch.name,
          transactions: [transaction],
        });
      }
    }

    const branchTransactionSheets = [...branchGroups.values()].map(
      (branch) => {
        const rows: Array<Array<string | number>> = [
          ["PURPLE YAM", branch.name.toUpperCase()],
          [
            "Transaction History",
            exportDateRange
              ? `${exportDateRange.startDate} to ${exportDateRange.endDate}`
              : "All recorded transaction dates",
          ],
          [],
        ];

        const dates = transactionDateKeys.map(formatDateColumn);

        for (const transactionType of branchTransactionTypes) {
          const typeTransactions = branch.transactions.filter(
            (transaction) => transaction.type === transactionType
          );

          if (typeTransactions.length === 0) {
            continue;
          }

          rows.push([formatTransactionType(transactionType)]);
          rows.push(["Item", "Unit", ...dates, "Total Change"]);

          const itemGroups = new Map<
            string,
            {
              item: string;
              unit: string;
              daily: Map<string, number>;
            }
          >();

          for (const transaction of typeTransactions) {
            const existing = itemGroups.get(transaction.itemId);
            const dateKey = formatDateKey(transaction.createdAt);

            if (existing) {
              existing.daily.set(
                dateKey,
                (existing.daily.get(dateKey) ?? 0) +
                  transaction.quantityDelta
              );
            } else {
              itemGroups.set(transaction.itemId, {
                item: formatItemLabel(transaction.item),
                unit: transaction.item.unit,
                daily: new Map([[dateKey, transaction.quantityDelta]]),
              });
            }
          }

          for (const item of [...itemGroups.values()].sort((a, b) =>
            a.item.localeCompare(b.item)
          )) {
            const row: Array<string | number> = [
              item.item,
              item.unit,
            ];
            let total = 0;

            for (const dateKey of transactionDateKeys) {
              const change = item.daily.get(dateKey) ?? 0;
              row.push(change);
              total += change;
            }

            row.push(total);
            rows.push(row);
          }

          rows.push([]);
        }

        if (rows.length === 3) {
          rows.push(["No transactions found for this branch and date range."]);
        }

        return {
          name: branch.name,
          rows,
        };
      }
    );

    const branchSheetNames = new Set<string>();

    for (const branch of branchGroups.values()) {
      const baseName = branch.name.replace(/[\\/?*\[\]:]/g, "").slice(0, 31) || "Branch";
      let sheetName = baseName;
      let suffix = 2;

      while (branchSheetNames.has(sheetName)) {
        const suffixText = ` ${suffix}`;
        sheetName = `${baseName.slice(0, 31 - suffixText.length)}${suffixText}`;
        suffix += 1;
      }

      branchSheetNames.add(sheetName);

      const sheet = branchTransactionSheets.find(
        (candidate) => candidate.name === branch.name
      );

      if (sheet) {
        sheet.name = sheetName;
      }
    }

    const filenameDate = formatDate(new Date());
    const filenameRange = exportDateRange
      ? `-${exportDateRange.startDate}-to-${exportDateRange.endDate}`
      : "";

    if (format === "xlsx") {
      const workbook = XLSX.utils.book_new();

      for (const sheet of branchTransactionSheets) {
        const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);

        worksheet["!cols"] = [
          { wch: 28 },
          { wch: 12 },
          ...transactionDateKeys.map(() => ({ wch: 14 })),
          { wch: 16 },
        ];

        if (worksheet["A1"]) {
          worksheet["A1"].s = {
            font: { bold: true },
          };
        }

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          sheet.name.slice(0, 31)
        );
      }

      const buffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "buffer",
      });

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="purple-yam-transaction-history-${filenameDate}${filenameRange}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // CSV cannot contain multiple worksheets, so each branch is
    // exported as a clearly separated branch section.
    const csvSections = branchTransactionSheets.map((sheet) => {
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return `# ${sheet.name}\n${csv.trim()}`;
    });

    const csvContent = csvSections.join("\n\n");
    const csvWithBom = "\uFEFF" + csvContent + "\n";

    return new Response(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="purple-yam-transaction-history-${filenameDate}${filenameRange}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export reports:", error);

    return NextResponse.json(
      { error: "Failed to export reports." },
      { status: 500 }
    );
  }
}
