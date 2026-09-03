import { prisma } from "@/lib/prisma";

// Task A: Helper function para mo-detect sa Stock Status
export function getStockStatus(quantity: number, minThreshold: number) {
  if (quantity <= 0) {
    return "OUT_OF_STOCK";
  } else if (quantity <= minThreshold) {
    return "LOW_STOCK";
  } else {
    return "IN_STOCK";
  }
}

// Tasks B & C: Function para mag-update sa Stock ug mag-handle sa Alert Creation / Resolution
export async function updateBranchStockAndAlerts(
  branchId: string,
  itemId: string,
  newQuantity: number
) {
  // 1. Kuhaon ang details sa Item para makuha ang minThreshold
  const item = await prisma.item.findUnique({
    where: { id: itemId },
  });

  if (!item) throw new Error("Item not found");

  // 2. I-update o i-upsert ang BranchStock sa Database
  const updatedBranchStock = await prisma.branchStock.upsert({
    where: {
      branchId_itemId: { branchId, itemId },
    },
    update: { quantity: newQuantity },
    create: { branchId, itemId, quantity: newQuantity },
  });

  // 3. I-determine ang status (OUT_OF_STOCK, LOW_STOCK, o IN_STOCK)
  const status = getStockStatus(newQuantity, item.minThreshold);

  // Task B: Kon LOW_STOCK o OUT_OF_STOCK -> Mag-create og PENDING alert kon wala pa
  if (status === "LOW_STOCK" || status === "OUT_OF_STOCK") {
    const existingAlert = await prisma.reorderAlert.findFirst({
      where: { branchId, itemId, status: "PENDING" },
    });

    if (!existingAlert) {
      await prisma.reorderAlert.create({
        data: {
          branchId,
          itemId,
          status: "PENDING",
        },
      });
    }
  }

  // Task C: Resolution -> Kon na-replenish ug nahimong IN_STOCK, i-RESOLVE ang PENDING alert!
  if (status === "IN_STOCK") {
    await prisma.reorderAlert.updateMany({
      where: {
        branchId,
        itemId,
        status: "PENDING",
      },
      data: {
        status: "RESOLVED",
      },
    });
  }

  return { updatedBranchStock, status };
}