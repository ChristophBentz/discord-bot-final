import { readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import type { Client, Collection } from "discord.js";
import type { BotEvent, SlashCommand } from "./types.js";
import { logger } from "./logger.js";

const here = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(here, "..");

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (
      // .d.ts überspringen — sind nur TypeScript-Deklarationen, kein ausführbarer Code.
      // Im dist/-Build liegen die neben den .js-Files und würden sonst doppelt geladen.
      !entry.name.endsWith(".d.ts") &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))
    ) {
      files.push(full);
    }
  }
  return files;
}

// Lädt alle Slash-Commands aus src/commands und allen features/*/commands-Ordnern.
export async function loadCommands(
  commands: Collection<string, SlashCommand>,
): Promise<void> {
  const roots = [join(SRC_ROOT, "commands"), join(SRC_ROOT, "features")];
  for (const root of roots) {
    let files: string[];
    try {
      files = await walk(root);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.includes("/commands/")) continue;
      const mod = (await import(pathToFileURL(file).href)) as {
        default?: SlashCommand;
      };
      const command = mod.default;
      if (!command?.data || !command.execute) continue;
      commands.set(command.data.name, command);
      logger.debug({ name: command.data.name }, "Command geladen");
    }
  }
  logger.info({ count: commands.size }, "Slash-Commands registriert");
}

// Lädt alle Event-Handler aus src/events und allen features/*/events-Ordnern.
export async function loadEvents(client: Client): Promise<void> {
  const roots = [join(SRC_ROOT, "events"), join(SRC_ROOT, "features")];
  let count = 0;
  for (const root of roots) {
    let files: string[];
    try {
      files = await walk(root);
    } catch {
      continue;
    }
    for (const file of files) {
      if (root.endsWith("features") && !file.includes("/events/")) continue;
      const mod = (await import(pathToFileURL(file).href)) as {
        default?: BotEvent;
      };
      const event = mod.default;
      if (!event?.name || !event.execute) continue;
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      count += 1;
      logger.debug({ name: event.name }, "Event geladen");
    }
  }
  logger.info({ count }, "Event-Handler registriert");
}
