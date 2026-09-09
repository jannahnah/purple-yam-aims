import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Establishing Purple Yam business foundation...");

  // 1. Create the single Purple Yam business if it does not exist.
  let business = await prisma.business.findFirst({
    where: {
      name: "Purple Yam",
    },
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: "Purple Yam",
      },
    });

    console.log(`Created business: ${business.id}`);
  } else {
    console.log(`Business already exists: ${business.id}`);
  }

  // 2. Associate all existing Purple Yam branches.
  const branchResult = await prisma.branch.updateMany({
    where: {
      businessId: null,
    },
    data: {
      businessId: business.id,
    },
  });

  console.log(
    `Associated ${branchResult.count} branch(es) with Purple Yam.`
  );

  // 3. Associate all existing Purple Yam items.
  const itemResult = await prisma.item.updateMany({
    where: {
      businessId: null,
    },
    data: {
      businessId: business.id,
    },
  });

  console.log(
    `Associated ${itemResult.count} item(s) with Purple Yam.`
  );

  // 4. Associate all existing Purple Yam users.
  const userResult = await prisma.user.updateMany({
    where: {
      businessId: null,
    },
    data: {
      businessId: business.id,
    },
  });

  console.log(
    `Associated ${userResult.count} user(s) with Purple Yam.`
  );

  console.log("Business foundation established successfully.");
}

main()
  .catch((error) => {
    console.error("Business foundation failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });