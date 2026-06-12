import { EmbedBuilder, type User, type GuildMember } from "discord.js";
import { LOG_COLORS } from "./service.js";

// Helper: User-Header für den Author-Bereich.
function userAuthor(user: User) {
  return {
    name: `${user.username}${user.discriminator !== "0" ? `#${user.discriminator}` : ""}`,
    iconURL: user.displayAvatarURL({ size: 64 }),
  };
}

function truncate(text: string, max = 1024): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

// Generischer Embed für Server-Events (Channels, Rollen, Server-Settings, Invites, Emojis).
export function serverEventEmbed(args: {
  title: string;
  color: number;
  description?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
  thumbnail?: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(args.color)
    .setTitle(args.title)
    .setTimestamp(new Date());
  if (args.description) embed.setDescription(truncate(args.description, 4000));
  if (args.fields && args.fields.length > 0) {
    embed.addFields(
      args.fields.map((f) => ({ ...f, value: truncate(f.value) })),
    );
  }
  if (args.footer) embed.setFooter({ text: args.footer });
  if (args.thumbnail) embed.setThumbnail(args.thumbnail);
  return embed;
}

// Nachricht gelöscht
export function messageDeleteEmbed(args: {
  author: User | null;
  channelId: string;
  content: string | null;
  messageId: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(LOG_COLORS.delete)
    .setTitle("Nachricht gelöscht")
    .setDescription(
      `In <#${args.channelId}>${args.author ? ` von <@${args.author.id}>` : ""}`,
    )
    .setTimestamp(new Date())
    .setFooter({ text: `Message-ID: ${args.messageId}` });

  if (args.author) embed.setAuthor(userAuthor(args.author));

  if (args.content && args.content.length > 0) {
    embed.addFields({ name: "Inhalt", value: truncate(args.content) });
  } else {
    embed.addFields({ name: "Inhalt", value: "*(kein Text — vielleicht ein Embed/Anhang)*" });
  }

  return embed;
}

// Nachricht bearbeitet
export function messageEditEmbed(args: {
  author: User;
  channelId: string;
  messageId: string;
  before: string | null;
  after: string;
  jumpUrl: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(LOG_COLORS.edit)
    .setAuthor(userAuthor(args.author))
    .setTitle("Nachricht bearbeitet")
    .setURL(args.jumpUrl)
    .setDescription(`In <#${args.channelId}> von <@${args.author.id}>`)
    .addFields(
      { name: "Vorher", value: truncate(args.before ?? "*(nicht im Cache)*") },
      { name: "Nachher", value: truncate(args.after) },
    )
    .setTimestamp(new Date())
    .setFooter({ text: `Message-ID: ${args.messageId}` });
}

// Member beigetreten
export function memberJoinEmbed(member: GuildMember): EmbedBuilder {
  const ageDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
  return new EmbedBuilder()
    .setColor(LOG_COLORS.join)
    .setAuthor(userAuthor(member.user))
    .setTitle("Member beigetreten")
    .setDescription(`<@${member.id}>`)
    .addFields(
      { name: "Account-Alter", value: `${ageDays} Tage`, inline: true },
      {
        name: "Account erstellt",
        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
        inline: true,
      },
    )
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${member.id}` });
}

// Member hat den Server verlassen
export function memberLeaveEmbed(args: {
  user: User;
  joinedAt: Date | null;
  roles: string[];
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(LOG_COLORS.leave)
    .setAuthor(userAuthor(args.user))
    .setTitle("Member hat den Server verlassen")
    .setDescription(`<@${args.user.id}>`)
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });

  if (args.joinedAt) {
    embed.addFields({
      name: "War auf dem Server seit",
      value: `<t:${Math.floor(args.joinedAt.getTime() / 1000)}:R>`,
      inline: true,
    });
  }
  if (args.roles.length > 0) {
    embed.addFields({
      name: "Rollen",
      value: truncate(args.roles.map((id) => `<@&${id}>`).join(" ")),
    });
  }
  return embed;
}

// Ban gesetzt
export function memberBanEmbed(args: { user: User; reason: string | null }): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(LOG_COLORS.ban)
    .setAuthor(userAuthor(args.user))
    .setTitle("Member gebannt")
    .setDescription(`<@${args.user.id}>`)
    .addFields({ name: "Grund", value: args.reason ?? "*(kein Grund angegeben)*" })
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });
}

// Ban aufgehoben
export function memberUnbanEmbed(user: User): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(LOG_COLORS.unban)
    .setAuthor(userAuthor(user))
    .setTitle("Ban aufgehoben")
    .setDescription(`<@${user.id}>`)
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${user.id}` });
}

// Nickname geändert
export function nicknameChangeEmbed(args: {
  user: User;
  before: string | null;
  after: string | null;
  executor?: { id: string } | null;
  reason?: string | null;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(LOG_COLORS.update)
    .setAuthor(userAuthor(args.user))
    .setTitle("Nickname geändert")
    .setDescription(`<@${args.user.id}>`)
    .addFields(
      { name: "Vorher", value: args.before ?? "*(keiner)*", inline: true },
      { name: "Nachher", value: args.after ?? "*(keiner)*", inline: true },
    )
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });

  if (args.executor && args.executor.id !== args.user.id) {
    embed.addFields({ name: "Geändert von", value: `<@${args.executor.id}>`, inline: true });
  }
  if (args.reason) {
    embed.addFields({ name: "Grund", value: args.reason });
  }
  return embed;
}

// Voice: Channel beigetreten
export function voiceJoinEmbed(args: { user: User; channelId: string }): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(LOG_COLORS.voiceJoin)
    .setAuthor(userAuthor(args.user))
    .setTitle("Voice-Channel beigetreten")
    .setDescription(`<@${args.user.id}> → <#${args.channelId}>`)
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });
}

// Voice: Channel verlassen
export function voiceLeaveEmbed(args: { user: User; channelId: string }): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(LOG_COLORS.voiceLeave)
    .setAuthor(userAuthor(args.user))
    .setTitle("Voice-Channel verlassen")
    .setDescription(`<@${args.user.id}> ← <#${args.channelId}>`)
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });
}

// Voice: Channel gewechselt
export function voiceMoveEmbed(args: {
  user: User;
  fromChannelId: string;
  toChannelId: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(LOG_COLORS.voiceMove)
    .setAuthor(userAuthor(args.user))
    .setTitle("Voice-Channel gewechselt")
    .setDescription(`<@${args.user.id}>`)
    .addFields(
      { name: "Von", value: `<#${args.fromChannelId}>`, inline: true },
      { name: "Nach", value: `<#${args.toChannelId}>`, inline: true },
    )
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });
}

// Rollen-Änderung
export function rolesChangeEmbed(args: {
  user: User;
  added: string[];
  removed: string[];
  executor?: { id: string } | null;
  reason?: string | null;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(LOG_COLORS.update)
    .setAuthor(userAuthor(args.user))
    .setTitle("Rollen geändert")
    .setDescription(`<@${args.user.id}>`)
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });

  if (args.added.length > 0) {
    embed.addFields({
      name: "Hinzugefügt",
      value: truncate(args.added.map((id) => `<@&${id}>`).join(" ")),
    });
  }
  if (args.removed.length > 0) {
    embed.addFields({
      name: "Entfernt",
      value: truncate(args.removed.map((id) => `<@&${id}>`).join(" ")),
    });
  }
  if (args.executor && args.executor.id !== args.user.id) {
    embed.addFields({ name: "Geändert von", value: `<@${args.executor.id}>`, inline: true });
  }
  if (args.reason) {
    embed.addFields({ name: "Grund", value: args.reason, inline: true });
  }
  return embed;
}

export function memberKickEmbed(args: {
  user: User;
  executor: { id: string } | null;
  reason: string | null;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0xfaa61a)
    .setAuthor({ name: args.user.username, iconURL: args.user.displayAvatarURL({ size: 64 }) })
    .setTitle("👢 Mitglied gekickt")
    .setDescription(`<@${args.user.id}>`)
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });
  if (args.executor) embed.addFields({ name: "Von", value: `<@${args.executor.id}>`, inline: true });
  if (args.reason) embed.addFields({ name: "Grund", value: args.reason, inline: false });
  return embed;
}

export function memberTimeoutEmbed(args: {
  user: User;
  executor: { id: string } | null;
  reason: string | null;
  until: Date;
}): EmbedBuilder {
  const seconds = Math.max(0, Math.floor((args.until.getTime() - Date.now()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const duration =
    hours > 0
      ? `${hours}h ${minutes % 60}m`
      : minutes > 0
        ? `${minutes}m`
        : `${seconds}s`;
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setAuthor({ name: args.user.username, iconURL: args.user.displayAvatarURL({ size: 64 }) })
    .setTitle("🔇 Timeout vergeben")
    .setDescription(`<@${args.user.id}>`)
    .addFields({ name: "Dauer", value: duration, inline: true })
    .addFields({
      name: "Bis",
      value: `<t:${Math.floor(args.until.getTime() / 1000)}:f>`,
      inline: true,
    })
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });
  if (args.executor) embed.addFields({ name: "Von", value: `<@${args.executor.id}>`, inline: false });
  if (args.reason) embed.addFields({ name: "Grund", value: args.reason, inline: false });
  return embed;
}

export function memberTimeoutRemoveEmbed(args: {
  user: User;
  executor: { id: string } | null;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setAuthor({ name: args.user.username, iconURL: args.user.displayAvatarURL({ size: 64 }) })
    .setTitle("🔊 Timeout aufgehoben")
    .setDescription(`<@${args.user.id}>`)
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });
  if (args.executor) embed.addFields({ name: "Von", value: `<@${args.executor.id}>`, inline: true });
  return embed;
}

export function memberWarnEmbed(args: {
  user: User;
  executor: { id: string };
  reason: string;
  warningCount: number;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xfee75c)
    .setAuthor({ name: args.user.username, iconURL: args.user.displayAvatarURL({ size: 64 }) })
    .setTitle("⚠️ Verwarnung")
    .setDescription(`<@${args.user.id}>`)
    .addFields(
      { name: "Von", value: `<@${args.executor.id}>`, inline: true },
      { name: "Verwarnungen gesamt", value: String(args.warningCount), inline: true },
      { name: "Grund", value: args.reason, inline: false },
    )
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });
}

export function memberForceMoveEmbed(args: {
  user: User;
  fromChannelId: string;
  toChannelId: string;
  executor: { id: string };
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(LOG_COLORS.voiceMove)
    .setAuthor({ name: args.user.username, iconURL: args.user.displayAvatarURL({ size: 64 }) })
    .setTitle("↪️ Voice-Move (von Mod)")
    .setDescription(`<@${args.user.id}>`)
    .addFields(
      { name: "Von", value: `<#${args.fromChannelId}>`, inline: true },
      { name: "Nach", value: `<#${args.toChannelId}>`, inline: true },
      { name: "Verschoben von", value: `<@${args.executor.id}>`, inline: false },
    )
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });
}

export function memberForceDisconnectEmbed(args: {
  user: User;
  fromChannelId: string;
  executor: { id: string };
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(LOG_COLORS.voiceLeave)
    .setAuthor({ name: args.user.username, iconURL: args.user.displayAvatarURL({ size: 64 }) })
    .setTitle("📤 Voice-Disconnect (von Mod)")
    .setDescription(`<@${args.user.id}>`)
    .addFields(
      { name: "Aus Channel", value: `<#${args.fromChannelId}>`, inline: true },
      { name: "Getrennt von", value: `<@${args.executor.id}>`, inline: true },
    )
    .setTimestamp(new Date())
    .setFooter({ text: `User-ID: ${args.user.id}` });
}
