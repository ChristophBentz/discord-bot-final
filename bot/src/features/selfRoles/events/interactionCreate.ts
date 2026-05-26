import { Events, MessageFlags, type Interaction } from "discord.js";
import { prisma } from "@repo/db";
import type { BotEvent } from "../../../lib/types.js";
import { applyUniqueChoice, toggleRoleForMember } from "../service.js";
import { logger } from "../../../lib/logger.js";

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // Button: customId = selfrole:btn:<panelId>:<roleId>
    if (interaction.isButton() && interaction.customId.startsWith("selfrole:btn:")) {
      const parts = interaction.customId.split(":");
      const panelId = Number(parts[2]);
      const roleId = parts[3]!;
      await handleAssign(interaction, panelId, [roleId]);
      return;
    }
    // Dropdown: customId = selfrole:dd:<panelId>
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("selfrole:dd:")) {
      const parts = interaction.customId.split(":");
      const panelId = Number(parts[2]);
      await handleAssign(interaction, panelId, interaction.values);
      return;
    }
  },
};

async function handleAssign(
  interaction: import("discord.js").ButtonInteraction | import("discord.js").StringSelectMenuInteraction,
  panelId: number,
  selectedRoleIds: string[],
): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({ content: "Nur im Server.", flags: MessageFlags.Ephemeral });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "Member-Fetch fehlgeschlagen.", flags: MessageFlags.Ephemeral });
    return;
  }

  const panel = await prisma.selfRolePanel.findUnique({
    where: { id: panelId },
    include: { options: true },
  });
  if (!panel || !panel.enabled) {
    await interaction.reply({ content: "Panel nicht mehr aktiv.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const messages: string[] = [];

  // Bei Dropdown: für jede in der Aktuell-Auswahl angeklickte Rolle togglen.
  // Bei Button: einzelne Rolle togglen.
  // uniqueChoice: vor dem Add die anderen Panel-Rollen entfernen.
  if (interaction.isStringSelectMenu()) {
    // Bei Dropdown ist "was nicht ausgewählt ist" = entfernen
    const inPanel = new Set(panel.options.map((o) => o.roleId));
    const desired = new Set(selectedRoleIds);
    for (const opt of panel.options) {
      const has = member.roles.cache.has(opt.roleId);
      const want = desired.has(opt.roleId);
      if (want && !has) {
        if (panel.uniqueChoice) await applyUniqueChoice(member, panel, opt.roleId);
        const r = await toggleRoleForMember(member, opt.roleId, "add");
        if (r.action === "added") messages.push(`+ <@&${opt.roleId}>`);
        else if (r.reason) messages.push(`⚠ ${r.reason}`);
      } else if (!want && has && inPanel.has(opt.roleId)) {
        const r = await toggleRoleForMember(member, opt.roleId, "remove");
        if (r.action === "removed") messages.push(`− <@&${opt.roleId}>`);
        else if (r.reason) messages.push(`⚠ ${r.reason}`);
      }
    }
  } else {
    const roleId = selectedRoleIds[0]!;
    const has = member.roles.cache.has(roleId);
    if (panel.uniqueChoice && !has) {
      await applyUniqueChoice(member, panel, roleId);
    }
    const r = await toggleRoleForMember(member, roleId, "toggle");
    if (r.action === "added") messages.push(`✅ Rolle <@&${roleId}> hinzugefügt`);
    else if (r.action === "removed") messages.push(`❎ Rolle <@&${roleId}> entfernt`);
    else if (r.reason) messages.push(`⚠ ${r.reason}`);
  }

  const reply = messages.length > 0 ? messages.join("\n") : "Keine Änderungen.";
  await interaction
    .editReply({ content: reply, allowedMentions: { parse: [] } })
    .catch((err) => logger.warn({ err }, "SelfRole: editReply fehlgeschlagen"));
}

export default event;
