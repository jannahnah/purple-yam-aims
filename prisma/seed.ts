import {
  PrismaClient,
  Role,
  ItemCategory,
  ItemSourceType,
} from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function ensureUser(data: {
  username: string;
  email: string;
  password: string;
  role: Role;
  branchId: string | null;
  businessId: string;
  mustChangePassword: boolean;
}) {
  const existing = await prisma.user.findUnique({
    where: { username: data.username },
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({ data });
}

async function ensureItem(data: {
  name: string;
  sourceType: ItemSourceType;
  category: ItemCategory;
  unit: string;
  minThreshold: number;
  businessId: string;
}) {
  const existing = await prisma.item.findFirst({
    where: {
      businessId: data.businessId,
      name: data.name,
    },
  });

  if (existing) {
    if (existing.category !== data.category) {
      return prisma.item.update({
        where: { id: existing.id },
        data: { category: data.category },
      });
    }
    return existing;
  }

  return prisma.item.create({ data });
}

async function main() {
  console.log(
    "Bootstrapping Purple Yam AIMS defaults without deleting existing operational data..."
  );

  const business = await prisma.business.upsert({
    where: { id: "purple-yam" },
    update: { name: "Purple Yam" },
    create: {
      id: "purple-yam",
      name: "Purple Yam",
    },
  });

  // Keep these IDs stable so existing transactions, users, and stock remain linked.
  const commissary = await prisma.branch.upsert({
    where: { id: "commissary" },
    update: {
      name: "Butuan/Main Branch",
      location: "Butuan City",
      isCommissary: true,
      businessId: business.id,
    },
    create: {
      id: "commissary",
      name: "Butuan/Main Branch",
      location: "Butuan City",
      isCommissary: true,
      businessId: business.id,
    },
  });

  const libertad = await prisma.branch.upsert({
    where: { id: "branch-1" },
    update: {
      name: "Libertad",
      location: "Libertad",
      isCommissary: false,
      businessId: business.id,
    },
    create: {
      id: "branch-1",
      name: "Libertad",
      location: "Libertad",
      isCommissary: false,
      businessId: business.id,
    },
  });

  const cabadbaran = await prisma.branch.upsert({
    where: { id: "branch-2" },
    update: {
      name: "Cabadbaran",
      location: "Cabadbaran",
      isCommissary: false,
      businessId: business.id,
    },
    create: {
      id: "branch-2",
      name: "Cabadbaran",
      location: "Cabadbaran",
      isCommissary: false,
      businessId: business.id,
    },
  });

  const sanFrancisco = await prisma.branch.upsert({
    where: { id: "branch-3" },
    update: {
      name: "San Francisco",
      location: "San Francisco",
      isCommissary: false,
      businessId: business.id,
    },
    create: {
      id: "branch-3",
      name: "San Francisco",
      location: "San Francisco",
      isCommissary: false,
      businessId: business.id,
    },
  });

  const ownerPassword = await hashPassword("owner123");
  const managerPassword = await hashPassword("manager123");
  const cashierPassword = await hashPassword("cashier123");
  const userPassword = await hashPassword("user123");

  // Create test/default accounts only when they do not already exist.
  // Existing passwords, status, assignments, and audit history are preserved.
  await ensureUser({
    username: "owner",
    email: "owner@purpleyam.local",
    password: ownerPassword,
    role: Role.OWNER,
    branchId: null,
    businessId: business.id,
    mustChangePassword: false,
  });

  await ensureUser({
    username: "manager_b1",
    email: "manager.b1@purpleyam.local",
    password: managerPassword,
    role: Role.BRANCH_MANAGER,
    branchId: libertad.id,
    businessId: business.id,
    mustChangePassword: true,
  });

  await ensureUser({
    username: "cashier_b1",
    email: "cashier.b1@purpleyam.local",
    password: cashierPassword,
    role: Role.CASHIER,
    branchId: libertad.id,
    businessId: business.id,
    mustChangePassword: true,
  });

  await ensureUser({
    username: "user",
    email: "user@purpleyam.local",
    password: userPassword,
    role: Role.CASHIER,
    branchId: libertad.id,
    businessId: business.id,
    mustChangePassword: true,
  });

  // Actual Purple Yam stock-room item master from the uploaded inventory workbook.
  // Packaging is separated from ingredients used in production.
  // Verified finished product name from the business interview.
  // No stock or recipe is seeded until the approved product/recipe records are provided.
  await ensureItem({
    name: "Ube Cake",
    sourceType: ItemSourceType.FINISHED_PRODUCT,
    category: ItemCategory.RAW_MATERIAL,
    unit: "pcs",
    minThreshold: 0.0,
    businessId: business.id,
  });

  await ensureItem({
    name: "Premix Dry (UBE)",
    sourceType: ItemSourceType.COMMISSARY_SUPPLIED,
    category: ItemCategory.RAW_MATERIAL,
    unit: "pack",
    minThreshold: 0.0,
    businessId: business.id,
  });

  await ensureItem({
    name: "Premix Wet (UBE)",
    sourceType: ItemSourceType.COMMISSARY_SUPPLIED,
    category: ItemCategory.RAW_MATERIAL,
    unit: "pack",
    minThreshold: 0.0,
    businessId: business.id,
  });

  await ensureItem({
    name: "Choco Premix Dry",
    sourceType: ItemSourceType.COMMISSARY_SUPPLIED,
    category: ItemCategory.RAW_MATERIAL,
    unit: "pack",
    minThreshold: 0.0,
    businessId: business.id,
  });

  await ensureItem({
    name: "Condensed Milk",
    sourceType: ItemSourceType.BRANCH_SOURCED,
    category: ItemCategory.RAW_MATERIAL,
    unit: "can",
    minThreshold: 0.0,
    businessId: business.id,
  });

  await ensureItem({
    name: "Evaporated Milk",
    sourceType: ItemSourceType.BRANCH_SOURCED,
    category: ItemCategory.RAW_MATERIAL,
    unit: "can",
    minThreshold: 0.0,
    businessId: business.id,
  });

  await ensureItem({
    name: "Creamcheese Wet",
    sourceType: ItemSourceType.BRANCH_SOURCED,
    category: ItemCategory.RAW_MATERIAL,
    unit: "pack",
    minThreshold: 0.0,
    businessId: business.id,
  });

  for (const item of [
    { name: "BOX (Large)", sourceType: ItemSourceType.BRANCH_SOURCED, unit: "pcs" },
    { name: "BOX (Medium)", sourceType: ItemSourceType.BRANCH_SOURCED, unit: "pcs" },
    { name: "BOX (Small - Round)", sourceType: ItemSourceType.BRANCH_SOURCED, unit: "pcs" },
    { name: "BASE (Large)", sourceType: ItemSourceType.BRANCH_SOURCED, unit: "pcs" },
    { name: "BASE (Medium)", sourceType: ItemSourceType.BRANCH_SOURCED, unit: "pcs" },
    { name: "Base (Small - Round)", sourceType: ItemSourceType.BRANCH_SOURCED, unit: "pcs" },
    { name: "Box Custard", sourceType: ItemSourceType.BRANCH_SOURCED, unit: "pcs" },
    { name: "Ube Calamansi Box", sourceType: ItemSourceType.BRANCH_SOURCED, unit: "pcs" },
  ]) {
    await ensureItem({
      name: item.name,
      sourceType: item.sourceType,
      category: ItemCategory.PACKAGING,
      unit: item.unit,
      minThreshold: 0.0,
      businessId: business.id,
    });
  }

  // Production recipes are intentionally not seeded from mock data.
  // They must be configured from the business's approved recipe/formulation records.
  
  // Actual quantities are loaded through the audited Inventory Import workflow.
  // Seed intentionally creates no inventory quantities.
  
  console.log(
    "Database bootstrap completed. Existing inventory and transaction history were preserved."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
