import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { loadCommands, loadEvents } from "./lib/loaders.js";
import type { SlashCommand } from "./lib/types.js";

// Erweitert den Client um eine Commands-Collection.
declare module "discord.js" {
  interface Client {
    commands: Collection<string, SlashCommand>;
  }
}

const client = new Client({
  // large_threshold = 250 (Maximum): Discord schickt im GUILD_CREATE alle
  // bis zu 250 Members samt initial-Presences. Wichtig damit „Gerade online"
  // korrekte Werte liefert.
  ws: { large_threshold: 250 },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences, // für Server-Stats „Online-Zählung" — privileged intent!
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites, // Invite-Tracking (braucht „Server verwalten"-Berechtigung)
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();

await loadCommands(client.commands);
await loadEvents(client);

process.on("unhandledRejection", (err) => logger.error({ err }, "unhandledRejection"));
process.on("uncaughtException", (err) => logger.error({ err }, "uncaughtException"));

await client.login(env.DISCORD_TOKEN);
