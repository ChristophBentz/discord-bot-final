import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import type { CustomCommand } from "@prisma/client";

const PLACEHOLDER_RE = /\{([\w.]+)(?::([^}]+))?\}/g;

function pickRandom(spec: string): string {
  const options = spec.split("|").map((s) => s.trim()).filter(Boolean);
  if (options.length === 0) return "";
  return options[Math.floor(Math.random() * options.length)]!;
}

export function renderTemplate(
  template: string,
  interaction: ChatInputCommandInteraction,
): string {
  const user = interaction.user;
  const guild = interaction.guild;
  const channel = interaction.channel;
  return template.replace(PLACEHOLDER_RE, (_, key: string, arg?: string) => {
    switch (key) {
      case "user":
        return user.displayName ?? user.username;
      case "user.mention":
        return `<@${user.id}>`;
      case "user.id":
        return user.id;
      case "user.tag":
        return user.tag;
      case "server":
      case "guild":
        return guild?.name ?? "";
      case "channel":
        return channel && "name" in channel ? `#${channel.name ?? ""}` : "";
      case "channel.mention":
        return channel ? `<#${channel.id}>` : "";
      case "random":
        return arg ? pickRandom(arg) : "";
      default:
        return `{${key}${arg ? `:${arg}` : ""}}`;
    }
  });
}

export async function respondCustomCommand(
  interaction: ChatInputCommandInteraction,
  cmd: CustomCommand,
): Promise<void> {
  // Role-Gate
  if (cmd.allowedRoleIds.trim().length > 0) {
    const allowed = cmd.allowedRoleIds.split(",").map((s) => s.trim()).filter(Boolean);
    const member = interaction.member;
    const userRoleIds =
      member && "roles" in member && member.roles && "cache" in member.roles
        ? Array.from(member.roles.cache.keys())
        : [];
    if (!allowed.some((r) => userRoleIds.includes(r))) {
      await interaction.reply({
        content: "❌ Du hast keine Berechtigung, diesen Command zu nutzen.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  const flags = cmd.ephemeral ? MessageFlags.Ephemeral : undefined;

  if (cmd.responseType === "embed") {
    const embed = new EmbedBuilder();
    if (cmd.embedTitle) embed.setTitle(renderTemplate(cmd.embedTitle, interaction));
    const desc = cmd.embedDescription || cmd.response;
    if (desc) embed.setDescription(renderTemplate(desc, interaction));
    if (cmd.embedColor !== null) embed.setColor(cmd.embedColor);
    if (cmd.embedImageUrl) embed.setImage(cmd.embedImageUrl);
    if (cmd.embedFooter) embed.setFooter({ text: renderTemplate(cmd.embedFooter, interaction) });
    await interaction.reply({ embeds: [embed], flags });
    return;
  }

  // Text-Mode
  const content = renderTemplate(cmd.response || " ", interaction);
  await interaction.reply({ content: content.slice(0, 2000), flags });
}
