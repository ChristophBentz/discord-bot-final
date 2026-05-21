import { EmbedBuilder, Events, type Message, type TextChannel } from "discord.js";
import { prisma, type Config } from "@repo/db";
import type { BotEvent } from "../../../lib/types.js";
import { logger } from "../../../lib/logger.js";
import {
  findBadWord,
  findForbiddenInvite,
  hasAutoModBypassRole,
  isChannelExcluded,
  trackForSpam,
} from "../service.js";

interface Violation {
  rule: string;
  label: string;
  detail: string;
}

async function checkContent(
  message: Message,
  config: Config,
  badWord: string | null,
): Promise<Violation | null> {
  if (badWord) {
    return { rule: "blacklist", label: "Gefiltertes Wort", detail: badWord };
  }
  if (config.autoModBlockInvites) {
    const forbiddenCode = await findForbiddenInvite(message.content);
    if (forbiddenCode) {
      return {
        rule: "invite",
        label: "Fremder Discord-Invite",
        detail: `discord.gg/${forbiddenCode}`,
      };
    }
  }
  if (config.autoModMassMentionEnabled) {
    const count = message.mentions.users.size + message.mentions.roles.size;
    if (count > config.autoModMassMentionLimit) {
      return {
        rule: "mentions",
        label: "Zu viele Erwähnungen",
        detail: `${count} (max ${config.autoModMassMentionLimit})`,
      };
    }
  }
  return null;
}

const event: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (!message.content) return;

    try {
      const config = await prisma.config.findUnique({ where: { id: 1 } });
      if (!config?.autoModEnabled) return;

      // Channel-Ausnahme zuerst (nur wenn Toggle an)
      if (
        config.autoModExcludedChannelsEnabled &&
        (await isChannelExcluded(message.channelId))
      ) {
        return;
      }

      // Bypass-Rollen: User mit einer konfigurierten Rolle übergehen den Filter komplett.
      if (config.autoModBypassMods && message.member) {
        const memberRoleIds = message.member.roles.cache.keys();
        if (await hasAutoModBypassRole(memberRoleIds)) {
          return;
        }
      }

      // Anti-Spam separat behandeln (eigene Action: Timeout statt nur löschen)
      if (config.autoModSpamEnabled) {
        const triggered = trackForSpam(
          message.author.id,
          { ts: Date.now(), channelId: message.channelId, messageId: message.id },
          config.autoModSpamMessages,
          config.autoModSpamSeconds,
        );
        if (triggered) {
          await handleSpam(message, config, triggered);
          return; // Spam wurde behandelt, keine weiteren Checks nötig
        }
      }

      const badWord = await findBadWord(message.content);
      const violation = await checkContent(message, config, badWord);
      if (!violation) return;

      const deletedContent = message.content;
      await message.delete().catch((err) => {
        logger.warn({ err, rule: violation.rule }, "AutoMod: Konnte Nachricht nicht löschen");
      });

      // DM an User
      let dmSent = false;
      if (config.autoModDM) {
        try {
          const channelName =
            "name" in message.channel && typeof message.channel.name === "string"
              ? message.channel.name
              : "unbekannt";
          const dmEmbed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🚫 Deine Nachricht wurde entfernt")
            .setDescription(
              `Auf dem Server **${config?.guildName ?? "dem Server"}** wurde deine Nachricht entfernt.`,
            )
            .addFields(
              { name: "Channel", value: `#${channelName}`, inline: true },
              { name: violation.label, value: `\`${violation.detail}\``, inline: true },
            )
            .setTimestamp(new Date());
          if (config?.guildIconUrl) dmEmbed.setThumbnail(config.guildIconUrl);
          await message.author.send({ embeds: [dmEmbed] });
          dmSent = true;
        } catch {
          /* DMs zu */
        }
      }

      // Log-Channel
      if (config.logChannelId) {
        try {
          const channel = await message.client.channels
            .fetch(config.logChannelId)
            .catch(() => null);
          if (channel?.isTextBased() && "send" in channel) {
            const embed = new EmbedBuilder()
              .setColor(0xed4245)
              .setAuthor({
                name: message.author.username,
                iconURL: message.author.displayAvatarURL({ size: 64 }),
              })
              .setTitle(`AutoMod: ${violation.label}`)
              .setDescription(`<@${message.author.id}> in <#${message.channelId}>`)
              .addFields(
                { name: "Regel", value: violation.detail, inline: true },
                {
                  name: "DM-Status",
                  value: dmSent ? "✅ Zugestellt" : "❌ Nicht zustellbar",
                  inline: true,
                },
                { name: "Inhalt", value: truncate(deletedContent) },
              )
              .setTimestamp(new Date())
              .setFooter({ text: `User-ID: ${message.author.id}` });
            await (channel as TextChannel).send({ embeds: [embed] });
          }
        } catch (err) {
          logger.warn({ err }, "AutoMod-Log fehlgeschlagen");
        }
      }

      logger.info(
        { userId: message.author.id, rule: violation.rule, detail: violation.detail, dmSent },
        "AutoMod: Nachricht gelöscht",
      );
    } catch (err) {
      logger.error({ err }, "AutoMod-Handler-Fehler");
    }
  },
};

function truncate(text: string, max = 1024): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

// Bei Spam: Spam-Nachrichten löschen, User timeouten, Log + DM.
async function handleSpam(
  message: Message,
  config: Config,
  stamps: Array<{ channelId: string; messageId: string }>,
): Promise<void> {
  const timeoutSeconds = config.autoModSpamTimeoutMinutes * 60;
  const member = message.member;

  // Spam-Nachrichten löschen (best-effort, gruppiert pro Channel)
  const byChannel = new Map<string, string[]>();
  for (const s of stamps) {
    const arr = byChannel.get(s.channelId) ?? [];
    arr.push(s.messageId);
    byChannel.set(s.channelId, arr);
  }
  for (const [channelId, ids] of byChannel.entries()) {
    const channel = await message.client.channels.fetch(channelId).catch(() => null);
    if (channel?.isTextBased() && "bulkDelete" in channel) {
      // bulkDelete erlaubt Nachrichten, die <14 Tage alt sind — perfekt für Spam.
      await (channel as TextChannel).bulkDelete(ids, true).catch(() => {});
    }
  }

  // User timeouten
  let timeoutOk = false;
  if (member) {
    try {
      await member.timeout(timeoutSeconds * 1000, "AutoMod: Spam-Detection");
      timeoutOk = true;
    } catch (err) {
      logger.warn({ err, userId: message.author.id }, "AutoMod: Timeout fehlgeschlagen");
    }
  }

  // DM an User
  let dmSent = false;
  if (config.autoModDM) {
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🚫 Spam erkannt — Timeout gesetzt")
        .setDescription(
          `Auf dem Server **${config.guildName ?? "dem Server"}** wurdest du wegen zu vieler Nachrichten in kurzer Zeit stummgeschaltet.`,
        )
        .addFields(
          {
            name: "Dauer",
            value: `${config.autoModSpamTimeoutMinutes} Minuten`,
            inline: true,
          },
          {
            name: "Limit",
            value: `${config.autoModSpamMessages} Nachrichten in ${config.autoModSpamSeconds}s`,
            inline: true,
          },
        )
        .setTimestamp(new Date());
      if (config.guildIconUrl) dmEmbed.setThumbnail(config.guildIconUrl);
      await message.author.send({ embeds: [dmEmbed] });
      dmSent = true;
    } catch {
      /* DMs zu */
    }
  }

  // Log
  if (config.logChannelId) {
    try {
      const channel = await message.client.channels
        .fetch(config.logChannelId)
        .catch(() => null);
      if (channel?.isTextBased() && "send" in channel) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setAuthor({
            name: message.author.username,
            iconURL: message.author.displayAvatarURL({ size: 64 }),
          })
          .setTitle("AutoMod: Spam erkannt")
          .setDescription(`<@${message.author.id}>`)
          .addFields(
            {
              name: "Regel",
              value: `> ${config.autoModSpamMessages} Nachrichten in ${config.autoModSpamSeconds}s`,
              inline: true,
            },
            {
              name: "Action",
              value: timeoutOk
                ? `Timeout für ${config.autoModSpamTimeoutMinutes} Min`
                : "Timeout fehlgeschlagen",
              inline: true,
            },
            {
              name: "DM-Status",
              value: dmSent ? "✅ Zugestellt" : "❌ Nicht zustellbar",
              inline: true,
            },
            {
              name: "Gelöschte Nachrichten",
              value: String(stamps.length),
              inline: true,
            },
          )
          .setTimestamp(new Date())
          .setFooter({ text: `User-ID: ${message.author.id}` });
        await (channel as TextChannel).send({ embeds: [embed] });
      }
    } catch (err) {
      logger.warn({ err }, "Spam-Log fehlgeschlagen");
    }
  }

  logger.info(
    {
      userId: message.author.id,
      messages: stamps.length,
      timeoutOk,
      dmSent,
    },
    "AutoMod: Spam-Detection ausgelöst",
  );
}

export default event;
