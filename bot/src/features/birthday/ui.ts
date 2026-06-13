import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { prisma } from "@repo/db";
import { ageFromBirthday } from "./service.js";

export const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const BRAND_COLOR = 0xa855f7;

export interface BirthdayRecord {
  birthdayDay: number | null;
  birthdayMonth: number | null;
  birthdayYear: number | null;
  birthdayShow: boolean;
  birthdayShowAge: boolean;
  birthdayAnnounce: boolean;
}

export async function loadBirthday(userId: string): Promise<BirthdayRecord | null> {
  return prisma.member.findUnique({
    where: { userId },
    select: {
      birthdayDay: true,
      birthdayMonth: true,
      birthdayYear: true,
      birthdayShow: true,
      birthdayShowAge: true,
      birthdayAnnounce: true,
    },
  });
}

/** Baut Embed + Buttons für die /geburtstag-Statusnachricht. */
export function buildBirthdayPanel(rec: BirthdayRecord | null): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const has = Boolean(rec?.birthdayDay && rec?.birthdayMonth);

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setAuthor({ name: "🎂 Dein Geburtstag" });

  if (has && rec) {
    const age = ageFromBirthday(rec.birthdayDay!, rec.birthdayMonth!, rec.birthdayYear);
    embed.setDescription(
      `**${rec.birthdayDay}. ${MONTHS_DE[rec.birthdayMonth! - 1]}**` +
        (rec.birthdayYear ? ` ${rec.birthdayYear}` : "") +
        (age !== null ? `  ·  ${age} Jahre` : ""),
    );
    embed.addFields(
      {
        name: "Auf dem Profil",
        value: rec.birthdayShow ? "✅ sichtbar" : "🔒 verborgen",
        inline: true,
      },
      {
        name: "Alter zeigen",
        value: !rec.birthdayYear ? "— (kein Jahr)" : rec.birthdayShowAge ? "✅ ja" : "🔒 nein",
        inline: true,
      },
      {
        name: "Ankündigung",
        value: rec.birthdayAnnounce ? "✅ aktiv" : "🔕 aus",
        inline: true,
      },
    );
    embed.setFooter({ text: "Privatsphäre detailliert: über dein Profil im Dashboard." });
  } else {
    embed.setDescription(
      "Du hast noch keinen Geburtstag hinterlegt.\nKlick unten auf **Geburtstag setzen**, um loszulegen.",
    );
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("bday:open")
      .setStyle(has ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setEmoji("🎂")
      .setLabel(has ? "Ändern" : "Geburtstag setzen"),
  );

  if (has) {
    // Privatsphäre-Schnellschalter + Löschen
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("bday:toggle:show")
        .setStyle(rec!.birthdayShow ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji(rec!.birthdayShow ? "👁️" : "🔒")
        .setLabel("Profil"),
      new ButtonBuilder()
        .setCustomId("bday:toggle:announce")
        .setStyle(rec!.birthdayAnnounce ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji(rec!.birthdayAnnounce ? "🔔" : "🔕")
        .setLabel("Ankündigung"),
      new ButtonBuilder()
        .setCustomId("bday:delete")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
        .setLabel("Löschen"),
    );
  }

  return { embeds: [embed], components: [row] };
}
