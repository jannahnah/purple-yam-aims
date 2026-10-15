import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Run inventory mutations at serializable isolation. PostgreSQL may reject
 * concurrent transactions with P2034; retry those conflicts a small number
 * of times so concurrent sales/adjustments/transfers cannot silently overwrite
 * one another's stock updates.
 */
export async function runSerializableTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034";

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 30));
    }
  }

  throw new Error("Inventory transaction could not be completed.");
}
