import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

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
        where: branchWhere,
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

    const reportGeneratedAt = new Date();
    const reportDateTime = formatDateTime(reportGeneratedAt);

    const inventoryRows = inventory.map((stock) => ({
      "Report Date & Time": reportDateTime,
      Branch: stock.branch.name,
      Item: stock.item.name,
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
        Item: stock.item.name,
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
        Item: stock.item.name,
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
        Product: transaction.item.name,
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
        Product: transaction.item.name,
        Unit: transaction.item.unit,
        "Quantity Produced": transaction.quantityDelta,
        "Recorded By": transaction.user.username,
      }));

    const transactionRows = transactions.map((transaction) => ({
      "Report Date & Time": reportDateTime,
      "Date & Time": formatDateTime(transaction.createdAt),
      Transaction: formatTransactionType(transaction.type),
      Branch: transaction.branch.name,
      Item: transaction.item.name,
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
