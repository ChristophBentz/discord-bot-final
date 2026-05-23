import {
  ActionRowBuilder,
  ChannelType,
  Events,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type Interaction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  type VoiceChannel,
} from "discord.js";
import { prisma } from "@repo/db";
import type { BotEvent } from "../../../lib/types.js";
import { logger } from "../../../lib/logger.js";
import { buildPanel, isChannelLocked } from "../panel.js";

async function getOwnedChannel(
  interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction,
): Promise<{ channel: VoiceChannel } | null> {
  if (!interaction.channelId) return null;
  const record = await prisma.tempChannel.findUnique({
    where: { channelId: interaction.channelId },
  });
  if (!record) return null;
  if (record.ownerId !== interaction.user.id) {
    await interaction.reply({
      content: "Nur der Owner dieses Channels kann das.",
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
  const channel = interaction.channel;
  if (channel?.type !== ChannelType.GuildVoice) return null;
  return { channel: channel as VoiceChannel };
}

// Aktualisiert das Panel-Embed in der Channel-Nachricht.
async function refreshPanel(channel: VoiceChannel): Promise<void> {
  const record = await prisma.tempChannel.findUnique({ where: { channelId: channel.id } });
  if (!record?.panelMessageId) return;
  try {
    const msg = await channel.messages.fetch(record.panelMessageId).catch(() => null);
    if (msg) await msg.edit(buildPanel(channel, record.ownerId));
  } catch (err) {
    logger.warn({ err, channelId: channel.id }, "Panel-Refresh fehlgeschlagen");
  }
}

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // Button
    if (interaction.isButton() && interaction.customId.startsWith("temp:")) {
      await handleButton(interaction);
      return;
    }
    // Modal-Submit
    if (interaction.isModalSubmit() && interaction.customId.startsWith("temp:")) {
      await handleModal(interaction);
      return;
    }
    // String-Select (Member-Picker für Kick/Transfer)
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("temp:")) {
      await handleStringSelect(interaction);
      return;
    }
  },
};

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const owned = await getOwnedChannel(interaction);
  if (!owned) return;
  const { channel } = owned;
  const action = interaction.customId.split(":")[1];

  switch (action) {
    case "rename":
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("temp:rename:modal")
          .setTitle("Channel umbenennen")
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("name")
                .setLabel("Neuer Name")
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(100)
                .setValue(channel.name)
                .setRequired(true),
            ),
          ),
      );
      break;

    case "limit":
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("temp:limit:modal")
          .setTitle("User-Limit setzen")
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("limit")
                .setLabel("Limit (0 = unbegrenzt, max 99)")
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(2)
                .setValue(String(channel.userLimit))
                .setRequired(true),
            ),
          ),
      );
      break;

    case "lock": {
      const locked = isChannelLocked(channel);
      const everyone = channel.guild.roles.everyone;
      try {
        await channel.permissionOverwrites.edit(everyone, {
          Connect: locked ? null : false,
        });
        await refreshPanel(channel);
        await interaction.reply({
          content: locked ? "🔓 Channel entsperrt." : "🔒 Channel gesperrt.",
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        logger.warn({ err, channelId: channel.id }, "Lock-Toggle fehlgeschlagen");
        await interaction.reply({
          content: "Lock konnte nicht geändert werden.",
          flags: MessageFlags.Ephemeral,
        });
      }
      break;
    }

    case "kick": {
      const others = channel.members.filter((m) => m.id !== interaction.user.id);
      if (others.size === 0) {
        await interaction.reply({
          content: "Niemand sonst im Channel.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const options = others.first(25).map((m) => ({
        label: m.displayName.slice(0, 100),
        value: m.id,
        description: `@${m.user.username}`.slice(0, 100),
      }));
      await interaction.reply({
        content: "Wen willst du kicken?",
        flags: MessageFlags.Ephemeral,
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("temp:kick:select")
              .setPlaceholder("User im Channel auswählen")
              .setMinValues(1)
              .setMaxValues(1)
              .addOptions(options),
          ),
        ],
      });
      break;
    }

    case "transfer": {
      const others = channel.members.filter((m) => m.id !== interaction.user.id);
      if (others.size === 0) {
        await interaction.reply({
          content: "Niemand sonst im Channel, an den du übertragen könntest.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const options = others.first(25).map((m) => ({
        label: m.displayName.slice(0, 100),
        value: m.id,
        description: `@${m.user.username}`.slice(0, 100),
      }));
      await interaction.reply({
        content: "An wen willst du den Channel übertragen?",
        flags: MessageFlags.Ephemeral,
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("temp:transfer:select")
              .setPlaceholder("User im Channel auswählen")
              .setMinValues(1)
              .setMaxValues(1)
              .addOptions(options),
          ),
        ],
      });
      break;
    }
  }
}

async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  const owned = await getOwnedChannel(interaction);
  if (!owned) return;
  const { channel } = owned;
  const action = interaction.customId.split(":")[1];

  if (action === "rename") {
    const newName = interaction.fields.getTextInputValue("name").trim();
    if (!newName) {
      await interaction.reply({ content: "Name darf nicht leer sein.", flags: MessageFlags.Ephemeral });
      return;
    }
    try {
      await channel.setName(newName);
      await refreshPanel(channel);
      await interaction.reply({
        content: `✏️ Channel umbenannt zu **${newName}**.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      logger.warn({ err }, "Rename fehlgeschlagen");
      await interaction.reply({
        content: "Umbenennen fehlgeschlagen (Rate-Limit von Discord?).",
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  if (action === "limit") {
    const raw = interaction.fields.getTextInputValue("limit").trim();
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 99) {
      await interaction.reply({
        content: "Limit muss eine Zahl zwischen 0 und 99 sein.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    try {
      await channel.setUserLimit(Math.floor(n));
      await refreshPanel(channel);
      await interaction.reply({
        content: n === 0 ? "👥 Limit aufgehoben." : `👥 Limit auf **${n}** gesetzt.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      logger.warn({ err }, "Limit-Setzen fehlgeschlagen");
      await interaction.reply({
        content: "Limit konnte nicht gesetzt werden.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

async function handleStringSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const owned = await getOwnedChannel(interaction);
  if (!owned) return;
  const { channel } = owned;
  const action = interaction.customId.split(":")[1];
  const targetId = interaction.values[0];
  if (!targetId) {
    await interaction.update({ content: "Kein User ausgewählt.", components: [] });
    return;
  }

  if (action === "kick") {
    const member = channel.members.get(targetId);
    if (!member) {
      await interaction.update({ content: "User ist nicht mehr im Channel.", components: [] });
      return;
    }
    try {
      await member.voice.disconnect("Vom Channel-Owner gekickt");
      await interaction.update({
        content: `🚪 <@${targetId}> aus dem Channel gekickt.`,
        components: [],
      });
    } catch (err) {
      logger.warn({ err }, "Voice-Kick fehlgeschlagen");
      await interaction.update({ content: "Kick fehlgeschlagen.", components: [] });
    }
    return;
  }

  if (action === "transfer") {
    const oldOwnerId = interaction.user.id;
    try {
      // Alte Owner-Permissions entfernen, neue setzen
      await channel.permissionOverwrites.delete(oldOwnerId).catch(() => {});
      await channel.permissionOverwrites.edit(targetId, {
        ManageChannels: true,
        MuteMembers: true,
        DeafenMembers: true,
        MoveMembers: true,
        Connect: true,
        Speak: true,
      });
      await prisma.tempChannel.update({
        where: { channelId: channel.id },
        data: { ownerId: targetId },
      });
      await refreshPanel(channel);
      await interaction.update({
        content: `👑 Owner-Rolle an <@${targetId}> übertragen.`,
        components: [],
      });
    } catch (err) {
      logger.warn({ err }, "Owner-Transfer fehlgeschlagen");
      await interaction.update({ content: "Übertragung fehlgeschlagen.", components: [] });
    }
  }
}

// Damit eslint nicht über ungenutzte Import meckert
void PermissionFlagsBits;

export default event;
