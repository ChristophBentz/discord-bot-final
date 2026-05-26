import { Events, MessageFlags } from "discord.js";
import { prisma } from "@repo/db";

import { respondCustomCommand } from "../features/customCommands/render.js";
import type { BotEvent } from "../lib/types.js";
import { logger } from "../lib/logger.js";

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const builtIn = interaction.client.commands.get(interaction.commandName);
    if (builtIn) {
      try {
        await builtIn.execute(interaction);
      } catch (err) {
        logger.error({ err, name: interaction.commandName }, "Command-Fehler");
        const message = "Beim Ausführen des Commands ist ein Fehler aufgetreten.";
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        }
      }
      return;
    }

    // Fallback: Custom-Command aus DB
    const custom = await prisma.customCommand.findUnique({
      where: { name: interaction.commandName },
    });
    if (!custom) {
      logger.warn({ name: interaction.commandName }, "Unbekannter Command");
      return;
    }

    try {
      await respondCustomCommand(interaction, custom);
    } catch (err) {
      logger.error({ err, name: interaction.commandName }, "Custom-Command-Fehler");
      const message = "Beim Ausführen des Custom-Commands ist ein Fehler aufgetreten.";
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
      }
    }
  },
};

export default event;
