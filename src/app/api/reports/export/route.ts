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

    // Branch scope is derived exclusively from the authenticated user.
    // A Branch Manager cannot override this with a query parameter.
    const branchWhere =
      currentUser.role === "OWNER"
        ? {}
        : {
            branchId: currentUser.branchId ?? "__NO_BRANCH__",
          };

    const [inventory, transactions] = await Promise.all([
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
        where: branchWhere,
        include: {
          item: true,
          branch: true,
          user: true,
        },
        orderBy: {
          createdAt: "desc",
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

    const sheets = [
      { name: "Inventory Report", rows: inventoryRows },
      { name: "Low Stock Report", rows: lowStockRows },
      { name: "Out of Stock", rows: outOfStockRows },
      { name: "Sales Summary", rows: salesRows },
      { name: "Production Summary", rows: productionRows },
      {
        name: "Transfer & Delivery",
        rows: transferDeliveryRows,
      },
      { name: "Transaction History", rows: transactionRows },
    ].map((sheet) => {
      if (sheet.rows.length > 0) return sheet;

      return {
        ...sheet,
        rows: [
          {
            "Report Date & Time": reportDateTime,
            Status: "No records found",
          },
        ],
      };
    });

    const filenameDate = formatDate(new Date());

    if (format === "xlsx") {
      const workbook = XLSX.utils.book_new();

      for (const sheet of sheets) {
        const worksheet = XLSX.utils.json_to_sheet(sheet.rows);

        worksheet["!cols"] = Object.keys(sheet.rows[0] ?? {}).map(
          (key) => ({
            wch: Math.min(Math.max(key.length + 2, 16), 32),
          })
        );

        // Make the generated timestamp easy to verify when comparing
        // exported reports against the live system.
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
          "Content-Disposition": `attachment; filename="purple-yam-reports-${filenameDate}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // CSV cannot contain multiple worksheets, so all six reports are
    // exported into one readable CSV with clearly separated sections.
    const csvSections = sheets.map((sheet) => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return `# ${sheet.name}\n${csv.trim()}`;
    });

    const csvContent = csvSections.join("\n\n");
    const csvWithBom = "\uFEFF" + csvContent + "\n";

    return new Response(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="purple-yam-reports-${filenameDate}.csv"`,
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
