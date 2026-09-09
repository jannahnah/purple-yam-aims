import { prisma } from "../src/lib/prisma";

const accounts = [
  {
    username: "owner",
    name: "Purple Yam Owner",
    email: "owner@purpleyam.local",
  },
  {
    username: "manager_b1",
    name: "Branch Manager",
    email: "manager.b1@purpleyam.local",
  },
  {
    username: "cashier_b1",
    name: "Branch Cashier",
    email: "cashier.b1@purpleyam.local",
  },
  {
    username: "user",
    name: "Test Cashier",
    email: "user@purpleyam.local",
  },
];

async function main() {
  for (const account of accounts) {
    const user = await prisma.user.findUnique({
      where: {
        username: account.username,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      console.log(`Skipping ${account.username}: user not found.`);
      continue;
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: account.name,
        email: account.email,
        status: "ACTIVE",
      },
    });

    console.log(
      `Updated ${account.username}: ${account.email}`
    );
  }

  console.log("User account backfill completed.");
}

main()
  .catch((error) => {
    console.error("User account backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });