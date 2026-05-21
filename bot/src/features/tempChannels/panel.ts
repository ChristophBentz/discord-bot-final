import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  type VoiceChannel,
} from "discord.js";

export function isChannelLocked(channel: VoiceChannel): boolean {
  const everyone = channel.guild.roles.everyone;
  const ow = channel.permissionOverwrites.cache.get(everyone.id);
  return ow?.deny.has(PermissionFlagsBits.Connect) ?? false;
}

export function buildPanel(channel: VoiceChannel, ownerId: string) {
  const locked = isChannelLocked(channel);
  const embed = new EmbedBuilder()
    .setColor(0xa855f7)
    .setTitle("🎛️ Channel-Kontrolle")
    .setDescription(`Owner: <@${ownerId}> — nur du kannst die Buttons unten benutzen.`)
    .addFields(
      { name: "Name", value: channel.name, inline: true },
      {
        name: "Limit",
        value: channel.userLimit > 0 ? String(channel.userLimit) : "unbegrenzt",
        inline: true,
      },
      { name: "Status", value: locked ? "🔒 Gesperrt" : "🔓 Offen", inline: true },
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("temp:rename")
      .setLabel("Umbenennen")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("✒️"),
    new ButtonBuilder()
      .setCustomId("temp:limit")
      .setLabel("Limit")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("👥"),
    new ButtonBuilder()
      .setCustomId("temp:lock")
      .setLabel(locked ? "Entsperren" : "Sperren")
      .setStyle(locked ? ButtonStyle.Success : ButtonStyle.Danger)
      .setEmoji(locked ? "🔓" : "🔒"),
    new ButtonBuilder()
      .setCustomId("temp:kick")
      .setLabel("Kicken")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("👢"),
    new ButtonBuilder()
      .setCustomId("temp:transfer")
      .setLabel("Übertragen")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("👑"),
  );

  return { embeds: [embed], components: [row] };
}
