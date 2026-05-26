import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.BOT_API_SECRET ?? "";

export function signProfileToken(userId: string, version: number): string {
  return createHmac("sha256", SECRET)
    .update(`${userId}.${version}`)
    .digest("base64url");
}

export function verifyProfileToken(
  userId: string,
  version: number,
  token: string | undefined | null,
): boolean {
  if (!token || !SECRET) return false;
  const expected = signProfileToken(userId, version);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
