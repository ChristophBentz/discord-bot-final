import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { MessageFlags } from "discord.js";
import { getConfig } from "@repo/db";
import { memberCanControlMusic } from "./service.js";

export interface GuardOk {
  ok: true;
  member: GuildMember;
}
export interface GuardFail {
  ok: false;
}

// Prüft: Bot ready, Music aktiv, User ist Member + hat DJ-Rolle.
// Antwortet bei Fehler ephemeral und gibt { ok: false } zurück.
export async function musicGuard(
  interaction: ChatInputCommandInteraction,
  options: { requireVoice?: boolean } = {},
): Promise<GuardOk | GuardFail> {
  if (!interaction.guild) {
    await interaction.reply({ content: "Nur auf einem Server nutzbar.", flags: MessageFlags.Ephemeral });
    return { ok: false };
  }

  const config = await getConfig();
  if (!config.musicEnabled) {
    await interaction.reply({
      content: "Music-Feature ist im Dashboard deaktiviert.",
      flags: MessageFlags.Ephemeral,
    });
    return { ok: false };
  }

  const member = interaction.member as GuildMember | null;
  if (!member || typeof member.roles?.cache?.keys !== "function") {
    await interaction.reply({ content: "Du musst Mitglied dieses Servers sein.", flags: MessageFlags.Ephemeral });
    return { ok: false };
  }

  if (!(await memberCanControlMusic(member))) {
    await interaction.reply({
      content: "Du hast keine DJ-Rolle. Bitte im Dashboard einrichten.",
      flags: MessageFlags.Ephemeral,
    });
    return { ok: false };
  }

  if (options.requireVoice && !member.voice.channel) {
    await interaction.reply({
      content: "Du musst in einem Voice-Channel sein.",
      flags: MessageFlags.Ephemeral,
    });
    return { ok: false };
  }

  return { ok: true, member };
}
