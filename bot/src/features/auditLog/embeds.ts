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
