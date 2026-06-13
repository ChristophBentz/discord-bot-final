import { Events, MessageFlags, type Interaction } from "discord.js";
import { prisma } from "@repo/db";
import type { BotEvent } from "../../../lib/types.js";
import { logger } from "../../../lib/logger.js";
import { checkEligibility, refreshGiveawayMessage } from "../service.js";

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (!interaction.isButton() || !interaction.customId.startsWith("giveaway:enter:")) return;

    try {
      const id = Number(interaction.customId.split(":")[2]);
      const reply = (content: string) =>
        interaction.reply({ content, flags: MessageFlags.Ephemeral });

      const giveaway = await prisma.giveaway.findUnique({ where: { id } });
      if (!giveaway || giveaway.ended) {
        await reply("Dieses Giveaway ist bereits beendet.");
        return;
      }

      const member = interaction.guild
        ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
        : null;
      if (!member) {
        await reply("Teilnahme nur direkt im Server möglich.");
        return;
      }

      const existing = await prisma.giveawayEntry.findUnique({
        where: { giveawayId_userId: { giveawayId: id, userId: member.id } },
      });

      // Bereits dabei → wieder austragen (Toggle).
      if (existing) {
        await prisma.giveawayEntry.delete({ where: { id: existing.id } });
        await refreshGiveawayMessage(interaction.client, id);
        await reply("Du nimmst nicht mehr teil. (Erneut klicken zum Wieder-Teilnehmen.)");
        return;
      }

      // Kriterien prüfen
      const failure = await checkEligibility(member, giveaway);
      if (failure) {
        await reply(`❌ ${failure}`);
        return;
      }

      await prisma.giveawayEntry.create({ data: { giveawayId: id, userId: member.id } });
      await refreshGiveawayMessage(interaction.client, id);
      await reply("✅ Du nimmst jetzt teil! Viel Glück 🍀");
    } catch (err) {
      logger.error({ err }, "Giveaway-Teilnahme-Fehler");
      if (!interaction.replied) {
        await interaction
          .reply({ content: "Etwas ist schiefgelaufen.", flags: MessageFlags.Ephemeral })
          .catch(() => null);
      }
    }
  },
};

export default event;
