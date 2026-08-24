import { PrismaClient, Role, ItemSourceType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database according to PRD specification...");

  // Clear existing records
  await prisma.reorderAlert.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.productionRecipe.deleteMany();
  await prisma.branchStock.deleteMany();
  await prisma.user.deleteMany();
  await prisma.item.deleteMany();
  await prisma.branch.deleteMany();

  // Create Head Commissary + 3 Satellite Branches
  const commissary = await prisma.branch.create({
    data: { id: "commissary", name: "Main Commissary / Head Branch", location: "Central Hub" },
  });

  const branch1 = await prisma.branch.create({
    data: { id: "branch-1", name: "Purple Yam - Branch 1", location: "Downtown" },
  });

  const branch2 = await prisma.branch.create({
    data: { id: "branch-2", name: "Purple Yam - Branch 2", location: "Uptown Mall" },
  });

  const branch3 = await prisma.branch.create({
    data: { id: "branch-3", name: "Purple Yam - Branch 3", location: "Highway Express" },
  });

  // Create Users
  await prisma.user.createMany({
    data: [
      {
        username: "owner",
        password: "owner123",
        role: Role.OWNER,
        branchId: null,
      },
      {
        username: "manager_b1",
        password: "manager123",
        role: Role.BRANCH_MANAGER,
        branchId: branch1.id,
      },
      {
        username: "cashier_b1",
        password: "cashier123",
        role: Role.CASHIER,
        branchId: branch1.id,
      },
    ],
  });

  // Create Items
  const yamFlour = await prisma.item.create({
    data: { name: "Purple Yam Premix", sourceType: ItemSourceType.COMMISSARY_SUPPLIED, unit: "kg", minThreshold: 10.0 },
  });

  const condensedMilk = await prisma.item.create({
    data: { name: "Condensed Milk", sourceType: ItemSourceType.BRANCH_SOURCED, unit: "cans", minThreshold: 15.0 },
  });

  const butter = await prisma.item.create({
    data: { name: "Butter", sourceType: ItemSourceType.BRANCH_SOURCED, unit: "kg", minThreshold: 5.0 },
  });

  const ubeCake = await prisma.item.create({
    data: { name: "Purple Yam Cake (Finished)", sourceType: ItemSourceType.FINISHED_PRODUCT, unit: "pcs", minThreshold: 3.0 },
  });

  // Create Recipe
  await prisma.productionRecipe.createMany({
    data: [
      { finishedItemId: ubeCake.id, ingredientItemId: yamFlour.id, requiredQuantity: 0.5 },
      { finishedItemId: ubeCake.id, ingredientItemId: condensedMilk.id, requiredQuantity: 1.0 },
      { finishedItemId: ubeCake.id, ingredientItemId: butter.id, requiredQuantity: 0.2 },
    ],
  });

  // Initialize Stock across Branches
  const allBranches = [commissary, branch1, branch2, branch3];
  
  for (const branch of allBranches) {
    await prisma.branchStock.createMany({
      data: [
        { branchId: branch.id, itemId: yamFlour.id, quantity: branch.id === "commissary" ? 100.0 : 15.0 },
        { branchId: branch.id, itemId: condensedMilk.id, quantity: 30.0 },
        { branchId: branch.id, itemId: butter.id, quantity: 10.0 },
        { branchId: branch.id, itemId: ubeCake.id, quantity: branch.id === "commissary" ? 0.0 : 5.0 },
      ],
    });
  }

  console.log("Database successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });