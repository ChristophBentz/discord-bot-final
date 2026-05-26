import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Suche .env zuerst lokal (bot/.env), dann im Projekt-Root.
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(here, "../../.env"),
  join(here, "../../../.env"),
  join(here, "../../../../.env"),
];
for (const path of candidates) {
  if (existsSync(path)) {
    loadDotenv({ path });
    break;
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Umgebungsvariable ${name} fehlt. .env.example als Vorlage benutzen.`);
  }
  return value;
}

export const env = {
  DISCORD_TOKEN: required("DISCORD_TOKEN"),
  DISCORD_CLIENT_ID: required("DISCORD_CLIENT_ID"),
  DISCORD_GUILD_ID: required("DISCORD_GUILD_ID"),
  BOT_API_SECRET: required("BOT_API_SECRET"),
  BOT_API_PORT: Number(process.env.BOT_API_PORT ?? 4001),
  PUBLIC_WEB_URL: process.env.PUBLIC_WEB_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000",
};
