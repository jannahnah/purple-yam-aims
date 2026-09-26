import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { updateReorderAlert } from "@/lib/reorder-alerts";

type ImportRow = {
  itemId?: string;
  itemName?: string;
  branchId?: string;
  branchName?: string;
  quantity?: number | string;
  source?: string;
};

type NormalizedRow = {
  itemId: string;
  itemName: string;
  branchId: string;
  branchName: string;
  unit: string;
  currentQuantity: number;
  importedQuantity: number;
  change: number;
};

const WORKBOOK_BRANCHES: Record<string, string> = {
  bxuinventory: "Butuan / Main Branch",
  lbdinventory: "Libertad",
  cbrinventory: "Cabadbaran",
  sfinventory: "San Francisco",
};

// Only confirmed equivalents belong here. Premix Dry (UBE) is intentionally not an alias.
const ITEM_ALIASES: Record<string, string> = {
  premixweyube: "premixwetube",
  premixwetube: "premixwetube",
  boxcustardround: "boxcustard",
  boxcustard: "boxcustard",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeName(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function canonicalItemName(value: unknown): string {
  const normalized = normalizeName(value);
  return ITEM_ALIASES[normalized] ?? normalized;
}

function parseQuantity(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const parsed = Number(value.trim().replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getHeaderIndex(headers: string[], names: string[]) {
  return headers.findIndex((header) => names.includes(header));
}

function rowsFromWorksheet(
  worksheet: XLSX.WorkSheet,
  sheetName: string,
  mappedBranchName?: string
): ImportRow[] {
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
  });
  const headerRowIndex = sheetRows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return (
      getHeaderIndex(headers, ["rawmaterial", "item", "itemname", "itemdescription", "description", "particulars", "itemid"]) >= 0 &&
      getHeaderIndex(headers, ["ending", "endingstock", "currentstock", "stock", "quantity"]) >= 0
    );
  });

  if (headerRowIndex < 0) {
    throw new Error(`Sheet "${sheetName}" must contain Item and Ending columns.`);
  }

  const headers = sheetRows[headerRowIndex].map(normalizeHeader);
  const itemIdIndex = getHeaderIndex(headers, ["itemid"]);
  const rawMaterialIndex = headers.indexOf("rawmaterial");
  const itemNameIndex =
    rawMaterialIndex >= 0
      ? rawMaterialIndex
      : getHeaderIndex(headers, [
          "itemname",
          "itemdescription",
          "description",
          "particulars",
          "item",
        ]);
  const branchIdIndex = getHeaderIndex(headers, ["branchid"]);
  const branchNameIndex = getHeaderIndex(headers, ["branchname", "branch"]);
  const quantityIndex = getHeaderIndex(headers, ["ending", "endingstock", "currentstock", "stock", "quantity"]);

  return sheetRows.slice(headerRowIndex + 1).flatMap((row, offset) => {
    const itemId = String(row[itemIdIndex] ?? "").trim();
    const itemName = String(row[itemNameIndex] ?? "").trim();
    if (!itemId && !itemName) return [];

    return [{
      itemId: itemId || undefined,
      itemName: itemName || undefined,
      branchId: String(row[branchIdIndex] ?? "").trim() || undefined,
      branchName:
        mappedBranchName ??
        (String(row[branchNameIndex] ?? "").trim() || undefined),
      quantity:
        typeof row[quantityIndex] === "number" ||
        typeof row[quantityIndex] === "string"
          ? row[quantityIndex]
          : undefined,
      source: `Excel row ${headerRowIndex + offset + 2} in "${sheetName}"`,
    }];
  });
}

function rowsFromWorkbook(workbook: XLSX.WorkBook): ImportRow[] {
  const recognizedSheets = workbook.SheetNames.filter(
    (sheetName) => WORKBOOK_BRANCHES[normalizeName(sheetName)]
  );
  const sheetNames = recognizedSheets.length ? recognizedSheets : workbook.SheetNames.slice(0, 1);
  if (!sheetNames.length) throw new Error("The workbook contains no sheets.");

  return sheetNames.flatMap((sheetName) =>
    rowsFromWorksheet(
      workbook.Sheets[sheetName],
      sheetName,
      WORKBOOK_BRANCHES[normalizeName(sheetName)]
    )
  );
}

async function validateRows(
  rows: ImportRow[],
  currentUser: Awaited<ReturnType<typeof getCurrentUser>>
): Promise<NormalizedRow[]> {
  if (!currentUser) throw new Error("Unauthorized.");
  if (currentUser.role !== "OWNER" && currentUser.role !== "BRANCH_MANAGER") {
    throw new Error("Only the Owner or Branch Manager can import inventory.");
  }
  if (!Array.isArray(rows) || !rows.length) throw new Error("The uploaded file contains no inventory rows.");
  if (rows.length > 1000) throw new Error("The import file cannot contain more than 1,000 rows.");
  if (currentUser.role === "BRANCH_MANAGER" && !currentUser.branchId) {
    throw new Error("Your account is not assigned to a branch.");
  }

  const [items, branches] = await Promise.all([prisma.item.findMany(), prisma.branch.findMany()]);
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const itemsByName = new Map(items.map((item) => [canonicalItemName(item.name), item]));
  const branchesById = new Map(branches.map((branch) => [branch.id, branch]));
  const branchesByName = new Map(branches.map((branch) => [normalizeName(branch.name), branch]));
  const resolved: Omit<NormalizedRow, "currentQuantity" | "change">[] = [];
  const duplicateKeys = new Set<string>();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowLabel = row.source ?? `Row ${index + 2}`;
    const importedQuantity = parseQuantity(row.quantity);
    const itemId = String(row.itemId ?? "").trim();
    const itemName = String(row.itemName ?? "").trim();
    const branchId = String(row.branchId ?? "").trim();
    const branchName = String(row.branchName ?? "").trim();

    if (!itemId && !itemName) throw new Error(`${rowLabel}: Item ID or Item Name is required.`);
    if (importedQuantity === null) throw new Error(`${rowLabel}: Ending quantity must be a valid number.`);
    if (importedQuantity < 0) throw new Error(`${rowLabel}: Quantity cannot be negative.`);

    const item = itemId ? itemsById.get(itemId) : itemsByName.get(canonicalItemName(itemName));
    if (!item) throw new Error(`${rowLabel}: Item "${itemName || itemId}" does not exist in AIMS.`);

    const requestedBranchId =
      branchId || branchesByName.get(normalizeName(branchName))?.id;

    if (
      currentUser.role === "BRANCH_MANAGER" &&
      requestedBranchId &&
      requestedBranchId !== currentUser.branchId
    ) {
      const requestedBranch = branchesById.get(requestedBranchId);
      throw new Error(
        `${rowLabel}: Branch "${requestedBranch?.name ?? branchName ?? branchId}" is outside your assigned branch.`
      );
    }

    const resolvedBranchId =
      currentUser.role === "BRANCH_MANAGER"
        ? currentUser.branchId!
        : requestedBranchId;
    const branch = resolvedBranchId ? branchesById.get(resolvedBranchId) : undefined;
    if (!branch) throw new Error(`${rowLabel}: Branch "${branchName || branchId}" does not exist in AIMS.`);
    if (item.unit.toLowerCase() === "pcs" && !Number.isInteger(importedQuantity)) {
      throw new Error(`${rowLabel}: "${item.name}" is measured in pcs, so the quantity must be a whole number.`);
    }

    const duplicateKey = `${branch.id}:${item.id}`;
    if (duplicateKeys.has(duplicateKey)) {
      throw new Error(`Rows contain duplicate inventory entries for "${item.name}" at "${branch.name}".`);
    }
    duplicateKeys.add(duplicateKey);
    resolved.push({ itemId: item.id, itemName: item.name, branchId: branch.id, branchName: branch.name, unit: item.unit, importedQuantity });
  }

  const stocks = await prisma.branchStock.findMany({
    where: { OR: resolved.map((row) => ({ branchId: row.branchId, itemId: row.itemId })) },
  });
  const stockByKey = new Map(stocks.map((stock) => [`${stock.branchId}:${stock.itemId}`, stock.quantity]));
  return resolved.map((row) => {
    const currentQuantity = stockByKey.get(`${row.branchId}:${row.itemId}`) ?? 0;
    return { ...row, currentQuantity, change: row.importedQuantity - currentQuantity };
  });
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (currentUser.role !== "OWNER" && currentUser.role !== "BRANCH_MANAGER") {
      return NextResponse.json({ error: "Only the Owner or Branch Manager can import inventory." }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const file = (await request.formData()).get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Please upload an Excel or CSV file." }, { status: 400 });
      if (!file.size) return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
      if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "The file cannot exceed 10 MB." }, { status: 400 });
      if (!file.name.match(/\.(xlsx|xlsm|xls|csv)$/i)) {
        return NextResponse.json({ error: "Unsupported file type. Please upload .xlsx, .xlsm, .xls, or .csv." }, { status: 400 });
      }

      const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: false });
      return NextResponse.json({ success: true, preview: await validateRows(rowsFromWorkbook(workbook), currentUser) });
    }

    if (!contentType.includes("application/json")) return NextResponse.json({ error: "Unsupported request." }, { status: 400 });
    const normalized = await validateRows((await request.json()).rows, currentUser);
    const result = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;
      let unchangedCount = 0;
      for (const row of normalized) {
        const existingStock = await tx.branchStock.findUnique({ where: { branchId_itemId: { branchId: row.branchId, itemId: row.itemId } } });
        const previousQuantity = existingStock?.quantity ?? 0;
        const quantityDelta = row.importedQuantity - previousQuantity;
        if (!quantityDelta) { unchangedCount++; continue; }

        const updatedStock = await tx.branchStock.upsert({
          where: { branchId_itemId: { branchId: row.branchId, itemId: row.itemId } },
          update: { quantity: row.importedQuantity },
          create: { branchId: row.branchId, itemId: row.itemId, quantity: row.importedQuantity },
        });
        await tx.stockTransaction.create({ data: {
          type: "ADJUSTMENT", branchId: row.branchId, itemId: row.itemId, userId: currentUser.id,
          quantityDelta, previousQuantity, newQuantity: updatedStock.quantity,
        } });
        await updateReorderAlert(tx, row.branchId, row.itemId, updatedStock.quantity);
        updatedCount++;
      }
      return { updatedCount, unchangedCount };
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/reports");
    return NextResponse.json({ success: true, message: "Inventory import completed successfully.", ...result });
  } catch (error) {
    console.error("Inventory import error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inventory import failed." }, { status: 400 });
  }
}
