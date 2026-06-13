import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { prisma } from "@repo/db";
import type { SlashCommand } from "../../../lib/types.js";
import { ageFromBirthday } from "../service.js";

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

// Maximaltage pro Monat (Schaltjahr-tolerant: Februar 29).
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("geburtstag")
    .setDescription("Lege deinen Geburtstag fest oder verwalte ihn.")
    .addSubcommand((s) =>
      s
        .setName("setzen")
        .setDescription("Geburtstag festlegen (Jahr optional).")
        .addIntegerOption((o) =>
          o.setName("tag").setDescription("Tag (1–31)").setMinValue(1).setMaxValue(31).setRequired(true),
        )
        .addIntegerOption((o) => {
          o.setName("monat").setDescription("Monat").setMinValue(1).setMaxValue(12).setRequired(true);
          MONTHS.forEach((name, i) => o.addChoices({ name, value: i + 1 }));
          return o;
        })
        .addIntegerOption((o) =>
          o
            .setName("jahr")
            .setDescription("Geburtsjahr (optional — für die Altersanzeige)")
            .setMinValue(1900)
            .setMaxValue(new Date().getFullYear()),
        ),
    )
    .addSubcommand((s) =>
      s.setName("anzeigen").setDescription("Zeigt deinen aktuell gespeicherten Geburtstag."),
    )
    .addSubcommand((s) =>
      s.setName("entfernen").setDescription("Löscht deinen gespeicherten Geburtstag."),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // Member-Datensatz sicherstellen (falls Sync noch nicht durch).
    await prisma.member.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        username: interaction.user.username,
        displayName: interaction.user.displayName ?? interaction.user.username,
        inServer: true,
      },
    });

    if (sub === "setzen") {
      const day = interaction.options.getInteger("tag", true);
      const month = interaction.options.getInteger("monat", true);
      const year = interaction.options.getInteger("jahr");

      if (day > DAYS_IN_MONTH[month - 1]!) {
        await interaction.editReply(
          `❌ Der ${MONTHS[month - 1]} hat keinen ${day}. Tag.`,
        );
        return;
      }

      await prisma.member.update({
        where: { userId },
        data: { birthdayDay: day, birthdayMonth: month, birthdayYear: year ?? null },
      });

      const age = ageFromBirthday(day, month, year ?? null);
      await interaction.editReply(
        `✅ Geburtstag gespeichert: **${day}. ${MONTHS[month - 1]}**${year ? ` ${year}` : ""}` +
          (age !== null ? ` (du bist ${age})` : "") +
          `\nÜber deine Profil-Einstellungen kannst du steuern, ob er öffentlich sichtbar ist und ob du angekündigt wirst.`,
      );
      return;
    }

    if (sub === "anzeigen") {
      const m = await prisma.member.findUnique({
        where: { userId },
        select: { birthdayDay: true, birthdayMonth: true, birthdayYear: true },
      });
      if (!m?.birthdayDay || !m.birthdayMonth) {
        await interaction.editReply(
          "Du hast noch keinen Geburtstag gespeichert. Nutze `/geburtstag setzen`.",
        );
        return;
      }
      const age = ageFromBirthday(m.birthdayDay, m.birthdayMonth, m.birthdayYear);
      await interaction.editReply(
        `🎂 Dein Geburtstag: **${m.birthdayDay}. ${MONTHS[m.birthdayMonth - 1]}**` +
          (m.birthdayYear ? ` ${m.birthdayYear}` : "") +
          (age !== null ? ` · ${age} Jahre` : ""),
      );
      return;
    }

    if (sub === "entfernen") {
      await prisma.member.update({
        where: { userId },
        data: { birthdayDay: null, birthdayMonth: null, birthdayYear: null },
      });
      await interaction.editReply("🗑️ Dein Geburtstag wurde gelöscht.");
      return;
    }
  },
};

export default command;
