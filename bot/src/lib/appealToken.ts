import { createHmac } from "node:crypto";
import { env } from "./env.js";

// Signierter Link zur öffentlichen Appeal-Seite — gleiches Muster wie profileToken,
// aber eigener Namespace, damit Profil-Links nicht als Appeal-Links gelten.
export function signAppealToken(userId: string): string {
  return createHmac("sha256", env.BOT_API_SECRET)
    .update(`appeal.${userId}`)
    .digest("base64url");
}

export function appealUrl(userId: string): string {
  return `${env.PUBLIC_WEB_URL}/appeal/${userId}?key=${signAppealToken(userId)}`;
}
