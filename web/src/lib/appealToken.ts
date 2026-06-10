import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.BOT_API_SECRET ?? "";

// Gegenstück zu bot/src/lib/appealToken.ts — gleicher Namespace, gleiches Secret.
export function signAppealToken(userId: string): string {
  return createHmac("sha256", SECRET).update(`appeal.${userId}`).digest("base64url");
}

export function verifyAppealToken(
  userId: string,
  token: string | undefined | null,
): boolean {
  if (!token || !SECRET) return false;
  const expected = signAppealToken(userId);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
