import { REST, Routes, SlashCommandBuilder } from "discord.js";
import type { Client, Collection } from "discord.js";
import { prisma } from "@repo/db";

import { env } from "../../lib/env.js";
import { loadCommands } from "../../lib/loaders.js";
import { logger } from "../../lib/logger.js";
import type { SlashCommand } from "../../lib/types.js";

const NAME_RE = /^[a-z0-9_-]{1,32}$/;

export function isValidCustomCommandName(name: string): boolean {
  return NAME_RE.test(name);
}

export function customCommandToJSON(cmd: { name: string; description: string }) {
  const safeDesc = cmd.description?.trim().slice(0, 100) || "Custom-Command";
  return new SlashCommandBuilder()
    .setName(cmd.name)
    .setDescription(safeDesc)
    .toJSON();
}

// Lädt alle Built-In-Commands (Datei-basiert) + alle Custom-Commands (DB)
// und re-registriert das gesamte Set als Guild-Commands bei Discord.
// Bei Single-Server-Setup propagieren Guild-Commands sofort.
export async function syncAllCommands(): Promise<{ builtIn: number; custom: number }> {
  const builtInCollection = new (await import("discord.js")).Collection<string, SlashCommand>();
  await loadCommands(builtInCollection);
  const builtInJson = builtInCollection.map((c) => c.data.toJSON());
  const builtInNames = new Set(builtInCollection.map((c) => c.data.name));

  const customs = await prisma.customCommand.findMany();
  const skipped: { name: string; reason: string }[] = [];
  const customJson = customs
    .filter((c) => {
      if (!isValidCustomCommandName(c.name)) {
        skipped.push({ name: c.name, reason: "ungültiger Name (nur a-z0-9_- erlaubt)" });
        return false;
      }
      if (builtInNames.has(c.name)) {
        skipped.push({ name: c.name, reason: "Konflikt mit Built-in-Command" });
        return false;
      }
      return true;
    })
    .map((c) => customCommandToJSON(c));

  if (skipped.length > 0) {
    logger.warn({ skipped }, "Custom-Commands beim Sync übersprungen");
  }

  const body = [...builtInJson, ...customJson];

  if (body.length > 100) {
    logger.warn({ count: body.length }, "Über 100 Commands — Discord-Limit überschritten!");
  }

  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
    { body },
  );

  logger.info(
    { builtIn: builtInJson.length, custom: customJson.length },
    "Slash-Commands bei Discord aktualisiert",
  );

  return { builtIn: builtInJson.length, custom: customJson.length };
}

// Reload aller Built-In-Commands in die Client-Collection — wird beim
// Bot-Start aufgerufen damit Custom-Commands dispatchable sind.
export async function ensureCustomCommandsLoaded(_client: Client): Promise<void> {
  // Custom-Commands werden NICHT in die client.commands-Collection geladen —
  // der interactionCreate-Handler fällt automatisch auf DB-Lookup zurück.
  // Hier nur als Hook für spätere Erweiterungen.
}
