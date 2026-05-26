import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "./env.js";

export function signProfileToken(userId: string, version: number): string {
  return createHmac("sha256", env.BOT_API_SECRET)
    .update(`${userId}.${version}`)
    .digest("base64url");
}

export function verifyProfileToken(
  userId: string,
  version: number,
  token: string,
): boolean {
  const expected = signProfileToken(userId, version);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
