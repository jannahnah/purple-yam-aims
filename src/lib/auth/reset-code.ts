import { createHash, randomInt } from "crypto";

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000;

export function createResetCode() {
  const code = randomInt(0, 1_000_000).toString().padStart(CODE_LENGTH, "0");
  const codeHash = hashResetCode(code);

  return {
    code,
    codeHash,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  };
}

export function hashResetCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function isResetCodeExpired(expiresAt: Date | null) {
  return !expiresAt || expiresAt.getTime() <= Date.now();
}

export { CODE_TTL_MS };
