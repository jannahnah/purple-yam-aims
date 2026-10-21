import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";

function requiredEnvironmentVariable(name: "OWNER_EMAIL" | "OWNER_PASSWORD") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be provided.`);
  }

  return value;
}

async function main() {
  const email = requiredEnvironmentVariable("OWNER_EMAIL").toLowerCase();
  const password = requiredEnvironmentVariable("OWNER_PASSWORD");

  if (password.length < 8) {
    throw new Error("OWNER_PASSWORD must be at least 8 characters long.");
  }

  const owner = await prisma.user.findFirst({
    where: { role: "OWNER" },
    select: { id: true },
  });

  if (!owner) {
    throw new Error("No owner account exists to replace.");
  }

  const conflictingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (conflictingUser && conflictingUser.id !== owner.id) {
    throw new Error(`The email ${email} is already assigned to another user.`);
  }

  await prisma.user.update({
    where: { id: owner.id },
    data: {
      email,
      password: await hashPassword(password),
      status: "ACTIVE",
      mustChangePassword: false,
    },
  });

  console.log("Owner credentials replaced successfully.");
}

main()
  .catch((error) => {
    console.error(
      "Owner credential replacement failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
