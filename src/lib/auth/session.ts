import { createHmac, timingSafeEqual } from "crypto";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "development-session-secret-change-later";

const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

type SessionData = {
  userId: string;
  expiresAt: number;
};

function encodeSession(data: SessionData) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");

  const signature = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function decodeSession(token: string): SessionData | null {
  try {
    const [payload, signature] = token.split(".");

    if (!payload || !signature) {
      return null;
    }

    const expectedSignature = createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("base64url");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SessionData;

    if (
      typeof data.userId !== "string" ||
      typeof data.expiresAt !== "number" ||
      data.expiresAt <= Date.now()
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function createSessionToken(userId: string) {
  return encodeSession({
    userId,
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
  });
}

export function verifySessionToken(token: string) {
  return decodeSession(token);
}

export { SESSION_MAX_AGE };