import {
  ActionRowBuilder,
  Events,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Interaction,
  type ModalSubmitInteraction,
} from "discord.js";
import { prisma } from "@repo/db";
import type { BotEvent } from "../../../lib/types.js";
import { logger } from "../../../lib/logger.js";
import { ageFromBirthday } from "../service.js";
import { buildBirthdayPanel, loadBirthday, MONTHS_DE } from "../ui.js";

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    try {
      // Button „Setzen / Ändern" → Modal öffnen
      if (interaction.isButton() && interaction.customId === "bday:open") {
        const rec = await loadBirthday(interaction.user.id);
        const modal = new ModalBuilder()
          .setCustomId("bday:modal")
          .setTitle("Geburtstag festlegen");

        const dayInput = new TextInputBuilder()
          .setCustomId("day")
          .setLabel("Tag (1–31)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("z.B. 24")
          .setMaxLength(2)
          .setRequired(true);
        const monthInput = new TextInputBuilder()
          .setCustomId("month")
          .setLabel("Monat (1–12)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("z.B. 12")
          .setMaxLength(2)
          .setRequired(true);
        const yearInput = new TextInputBuilder()
          .setCustomId("year")
          .setLabel("Jahr (optional, für die Altersanzeige)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("z.B. 2001 — leer lassen für ohne")
          .setMaxLength(4)
          .setRequired(false);

        if (rec?.birthdayDay) dayInput.setValue(String(rec.birthdayDay));
        if (rec?.birthdayMonth) monthInput.setValue(String(rec.birthdayMonth));
        if (rec?.birthdayYear) yearInput.setValue(String(rec.birthdayYear));

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(dayInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(monthInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(yearInput),
        );
        await interaction.showModal(modal);
        return;
      }

      // Modal-Submit → validieren + speichern, Panel aktualisieren
      if (interaction.isModalSubmit() && interaction.customId === "bday:modal") {
        await handleModal(interaction);
        return;
      }

      // Privatsphäre-Schnellschalter
      if (interaction.isButton() && interaction.customId.startsWith("bday:toggle:")) {
        const field = interaction.customId.split(":")[2];
        const dbField = field === "show" ? "birthdayShow" : "birthdayAnnounce";
        const rec = await loadBirthday(interaction.user.id);
        if (!rec) return;
        const current = field === "show" ? rec.birthdayShow : rec.birthdayAnnounce;
        await prisma.member.update({
          where: { userId: interaction.user.id },
          data: { [dbField]: !current },
        });
        const updated = await loadBirthday(interaction.user.id);
        await interaction.update(buildBirthdayPanel(updated));
        return;
      }

      // Löschen
      if (interaction.isButton() && interaction.customId === "bday:delete") {
        await prisma.member.update({
          where: { userId: interaction.user.id },
          data: { birthdayDay: null, birthdayMonth: null, birthdayYear: null },
        });
        const updated = await loadBirthday(interaction.user.id);
        await interaction.update(buildBirthdayPanel(updated));
        return;
      }
    } catch (err) {
      logger.error({ err }, "Geburtstags-Interaction-Fehler");
    }
  },
};

async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  const dayRaw = interaction.fields.getTextInputValue("day").trim();
  const monthRaw = interaction.fields.getTextInputValue("month").trim();
  const yearRaw = interaction.fields.getTextInputValue("year").trim();

  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = yearRaw ? Number(yearRaw) : null;
  const thisYear = new Date().getFullYear();

  const fail = (msg: string) =>
    interaction.reply({ content: `❌ ${msg}`, flags: MessageFlags.Ephemeral });

  if (!Number.isInteger(day) || day < 1 || day > 31) return void (await fail("Tag muss zwischen 1 und 31 liegen."));
  if (!Number.isInteger(month) || month < 1 || month > 12) return void (await fail("Monat muss zwischen 1 und 12 liegen."));
  if (day > DAYS_IN_MONTH[month - 1]!) return void (await fail(`Der ${MONTHS_DE[month - 1]} hat keinen ${day}. Tag.`));
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > thisYear)) {
    return void (await fail(`Jahr muss zwischen 1900 und ${thisYear} liegen (oder leer).`));
  }

  await prisma.member.update({
    where: { userId: interaction.user.id },
    data: { birthdayDay: day, birthdayMonth: month, birthdayYear: year },
  });

  const age = ageFromBirthday(day, month, year);
  await interaction.reply({
    content:
      `✅ Geburtstag gespeichert: **${day}. ${MONTHS_DE[month - 1]}**` +
      (year ? ` ${year}` : "") +
      (age !== null ? ` (du bist ${age})` : "") +
      "\nRuf `/geburtstag` erneut auf, um Sichtbarkeit & Ankündigung zu steuern.",
    flags: MessageFlags.Ephemeral,
  });
}

export default event;
