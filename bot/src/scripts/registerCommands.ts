// Registriert alle Slash-Commands bei Discord (guild-scoped — Updates sind sofort sichtbar).
// Aufruf:  npm run register  (im bot/-Ordner)

import { REST, Routes } from "discord.js";
import { Collection } from "discord.js";
import { env } from "../lib/env.js";
import { loadCommands } from "../lib/loaders.js";
import { logger } from "../lib/logger.js";
import type { SlashCommand } from "../lib/types.js";

const commands = new Collection<string, SlashCommand>();
await loadCommands(commands);

const body = commands.map((c) => c.data.toJSON());
const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

logger.info({ count: body.length }, "Registriere Slash-Commands bei Discord");
await rest.put(
  Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
  { body },
);
logger.info("Fertig.");
