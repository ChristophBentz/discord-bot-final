import { Events, MessageFlags } from "discord.js";
import type { BotEvent } from "../lib/types.js";
import { logger } from "../lib/logger.js";

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn({ name: interaction.commandName }, "Unbekannter Command");
      return;
    }
    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err, name: interaction.commandName }, "Command-Fehler");
      const message = "Beim Ausführen des Commands ist ein Fehler aufgetreten.";
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
      }
    }
  },
};

export default event;
