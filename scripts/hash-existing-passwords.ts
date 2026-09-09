import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      password: true,
    },
  });

  console.log(`Found ${users.length} user(s).`);

  for (const user of users) {
    // bcrypt hashes begin with $2
    if (user.password.startsWith("$2")) {
      console.log(`Skipping ${user.username}: already hashed.`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(user.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    console.log(`Hashed password for: ${user.username}`);
  }

  console.log("Password migration completed.");
}

main()
  .catch((error) => {
    console.error("Password migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });