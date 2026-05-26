import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type Client,
  type GuildMember,
  type Message,
  type TextChannel,
} from "discord.js";
import { prisma, type SelfRoleOption, type SelfRolePanel } from "@repo/db";
import { logger } from "../../lib/logger.js";

export type PanelType = "reaction" | "button" | "dropdown";

const BUTTON_STYLES: Record<string, ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
};

// Discord-Emoji-Parser: <:name:id> oder <a:name:id> → Custom-Emoji-ID,
// sonst Unicode-Emoji direkt.
function parseEmoji(raw: string | null | undefined): { id: string; name?: string; animated?: boolean } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const customMatch = trimmed.match(/^<(a?):([a-zA-Z0-9_]+):(\d+)>$/);
  if (customMatch) {
    return { name: customMatch[2]!, id: customMatch[3]!, animated: customMatch[1] === "a" };
  }
  // Unicode-Emoji: id ist der String selber (Discord-API erwartet das)
  return { id: trimmed };
}

function emojiForBuilder(raw: string | null | undefined): string | { id: string; name?: string; animated?: boolean } | undefined {
  const p = parseEmoji(raw);
  if (!p) return undefined;
  // Für Buttons/StringSelectMenu nehmen wir das objekt-form bei Custom-Emojis,
  // String-Form bei Unicode.
  if (/^\d+$/.test(p.id) && p.name) return p;
  return p.id;
}

function buildEmbed(panel: SelfRolePanel, options: SelfRoleOption[]): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(panel.title);
  if (panel.description) embed.setDescription(panel.description);
  if (panel.color) embed.setColor(panel.color);

  // Bei Reaction-Panels: die Rollen-Liste sichtbar im Embed anzeigen.
  if (panel.type === "reaction" && options.length > 0) {
    const lines = options.map((o) => {
      const e = o.emoji ?? "•";
      return `${e}  <@&${o.roleId}>${o.description ? ` — ${o.description}` : ""}`;
    });
    if (panel.description) {
      embed.setDescription(`${panel.description}\n\n${lines.join("\n")}`);
    } else {
      embed.setDescription(lines.join("\n"));
    }
  }
  return embed;
}

// Plain-Text-Version (wenn useEmbed=false)
function buildPlainContent(panel: SelfRolePanel, options: SelfRoleOption[]): string {
  const lines: string[] = [`**${panel.title}**`];
  if (panel.description) lines.push(panel.description);
  if (panel.type === "reaction" && options.length > 0) {
    lines.push(""); // Leerzeile
    for (const o of options) {
      const e = o.emoji ?? "•";
      lines.push(`${e}  <@&${o.roleId}>${o.description ? ` — ${o.description}` : ""}`);
    }
  }
  return lines.join("\n");
}

function buildComponents(panel: SelfRolePanel, options: SelfRoleOption[]) {
  if (panel.type === "button") {
    // Max 5 Buttons pro Row, max 5 Rows → max 25 Buttons total
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < options.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (const opt of options.slice(i, i + 5)) {
        const btn = new ButtonBuilder()
          .setCustomId(`selfrole:btn:${panel.id}:${opt.roleId}`)
          .setLabel(opt.label.slice(0, 80))
          .setStyle(BUTTON_STYLES[opt.buttonStyle ?? "secondary"] ?? ButtonStyle.Secondary);
        const e = emojiForBuilder(opt.emoji);
        if (e) btn.setEmoji(e);
        row.addComponents(btn);
      }
      rows.push(row);
    }
    return rows;
  }
  if (panel.type === "dropdown") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`selfrole:dd:${panel.id}`)
      .setPlaceholder("Rolle auswählen…")
      .setMinValues(0)
      .setMaxValues(panel.uniqueChoice ? 1 : options.length);
    for (const opt of options) {
      const o = new StringSelectMenuOptionBuilder()
        .setValue(opt.roleId)
        .setLabel(opt.label.slice(0, 100));
      if (opt.description) o.setDescription(opt.description.slice(0, 100));
      const e = emojiForBuilder(opt.emoji);
      if (e) o.setEmoji(e);
      menu.addOptions(o);
    }
    return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)];
  }
  return [];
}

async function getChannel(client: Client, channelId: string): Promise<TextChannel | null> {
  const ch =
    client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId).catch(() => null));
  if (!ch || ch.type !== ChannelType.GuildText) return null;
  return ch as TextChannel;
}

// Postet oder editiert die Nachricht eines Panels. Bei Reaction-Type werden
// die Reactions nach dem Post hinzugefügt.
export async function syncPanelMessage(client: Client, panelId: number): Promise<void> {
  const panel = await prisma.selfRolePanel.findUnique({
    where: { id: panelId },
    include: { options: { orderBy: { position: "asc" } } },
  });
  if (!panel) return;
  if (!panel.enabled) {
    // Wenn deaktiviert: existierende Nachricht löschen
    if (panel.messageId) {
      const ch = await getChannel(client, panel.channelId);
      if (ch) {
        await ch.messages.delete(panel.messageId).catch(() => {});
      }
      await prisma.selfRolePanel.update({ where: { id: panelId }, data: { messageId: null } });
    }
    return;
  }

  const channel = await getChannel(client, panel.channelId);
  if (!channel) {
    logger.warn(`SelfRole: Channel nicht gefunden für Panel ${panelId}`);
    return;
  }

  const components = buildComponents(panel, panel.options);
  const payload: { content: string; embeds: EmbedBuilder[]; components: typeof components; allowedMentions?: { parse: [] } } = panel.useEmbed
    ? { content: "", embeds: [buildEmbed(panel, panel.options)], components }
    : {
        content: buildPlainContent(panel, panel.options),
        embeds: [],
        components,
        allowedMentions: { parse: [] }, // Rollen-Mentions nicht pingen
      };

  let message: Message | null = null;
  if (panel.messageId) {
    message = await channel.messages.fetch(panel.messageId).catch(() => null);
  }

  if (message && message.author.id === client.user?.id) {
    await message.edit(payload).catch((err) => {
      logger.warn({ err, panelId }, "SelfRole: Edit fehlgeschlagen, poste neu");
    });
  } else {
    message = await channel.send(payload).catch((err) => {
      logger.warn({ err, panelId }, "SelfRole: Posten fehlgeschlagen");
      return null;
    });
    if (message) {
      await prisma.selfRolePanel.update({
        where: { id: panelId },
        data: { messageId: message.id },
      });
    }
  }

  // Reactions für Reaction-Panel
  if (panel.type === "reaction" && message) {
    const wantedEmojis = panel.options
      .map((o) => parseEmoji(o.emoji))
      .filter((e): e is { id: string; name?: string; animated?: boolean } => Boolean(e));
    for (const e of wantedEmojis) {
      // Für Custom-Emoji: nur die ID übergeben; für Unicode: das Symbol selbst
      const key = /^\d+$/.test(e.id) && e.name ? `${e.name}:${e.id}` : e.id;
      try {
        await message.react(key);
      } catch (err: unknown) {
        const errObj = err as { code?: number; message?: string };
        logger.warn(
          `SelfRole Reaction-Add fehlgeschlagen panelId=${panelId} emoji=${JSON.stringify(e)} code=${errObj?.code} msg=${errObj?.message} — fehlt evtl. die 'Add Reactions'-Permission im Channel`,
        );
      }
    }
  }
}

export async function deletePanelMessage(client: Client, channelId: string, messageId: string | null): Promise<void> {
  if (!messageId) return;
  const channel = await getChannel(client, channelId);
  if (!channel) return;
  await channel.messages.delete(messageId).catch(() => {});
}

// Liefert das Panel + Option für eine Reaction-Emoji-ID (für reaction handler)
export async function findPanelOptionByEmoji(
  messageId: string,
  emojiKey: string,
): Promise<{ panel: SelfRolePanel; option: SelfRoleOption } | null> {
  const panel = await prisma.selfRolePanel.findFirst({
    where: { messageId, type: "reaction", enabled: true },
    include: { options: true },
  });
  if (!panel) return null;
  const opt = panel.options.find((o) => {
    const parsed = parseEmoji(o.emoji);
    if (!parsed) return false;
    // Custom-Emoji → ID matchen; Unicode → String matchen
    return parsed.id === emojiKey || parsed.name === emojiKey;
  });
  if (!opt) return null;
  return { panel, option: opt };
}

export async function toggleRoleForMember(
  member: GuildMember,
  roleId: string,
  desired: "add" | "remove" | "toggle",
): Promise<{ action: "added" | "removed" | "noop"; reason?: string }> {
  const has = member.roles.cache.has(roleId);
  try {
    if (desired === "add" && !has) {
      await member.roles.add(roleId, "Self-Assign-Role");
      return { action: "added" };
    }
    if (desired === "remove" && has) {
      await member.roles.remove(roleId, "Self-Assign-Role");
      return { action: "removed" };
    }
    if (desired === "toggle") {
      if (has) {
        await member.roles.remove(roleId, "Self-Assign-Role");
        return { action: "removed" };
      }
      await member.roles.add(roleId, "Self-Assign-Role");
      return { action: "added" };
    }
    return { action: "noop" };
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    return {
      action: "noop",
      reason: `Discord-Fehler (${e?.code}): ${e?.message ?? "unbekannt"}`,
    };
  }
}

// Für uniqueChoice: alle anderen Panel-Rollen entfernen, bevor neue gegeben wird
export async function applyUniqueChoice(
  member: GuildMember,
  panel: SelfRolePanel & { options: SelfRoleOption[] },
  keepRoleId: string,
): Promise<void> {
  for (const opt of panel.options) {
    if (opt.roleId === keepRoleId) continue;
    if (member.roles.cache.has(opt.roleId)) {
      await member.roles.remove(opt.roleId, "Self-Role unique choice").catch(() => {});
    }
  }
}
