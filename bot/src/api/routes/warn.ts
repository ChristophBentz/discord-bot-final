import { EmbedBuilder, type Client } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";
import { sendLog } from "../../features/auditLog/service.js";
import { memberWarnEmbed } from "../../features/auditLog/embeds.js";

export interface WarnBody {
  reason?: string;
  moderatorId?: string;
  moderatorName?: string;
}

export type WarnResult =
  | { ok: true; warningId: number; dmSent: boolean; dmError?: string }
  | { ok: false; error: string };

const MAX_REASON_LENGTH = 500;

export async function handleWarn(
  client: Client,
  userId: string,
  body: WarnBody,
): Promise<WarnResult> {
  const reason = (body.reason ?? "").trim();
  if (!reason) return { ok: false, error: "Grund darf nicht leer sein" };
  if (reason.length > MAX_REASON_LENGTH) {
    return { ok: false, error: `Maximal ${MAX_REASON_LENGTH} Zeichen` };
  }

  const moderatorId = (body.moderatorId ?? "").trim() || "unknown";
  const moderatorName = (body.moderatorName ?? "").trim() || "Staff";

  // 1. In DB schreiben
  const warning = await prisma.warning.create({
    data: { userId, moderatorId, reason },
  });
  const totalWarnings = await prisma.warning.count({ where: { userId } });
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  const guildName = config?.guildName ?? "dem Server";

  // 2. DM an den User versuchen
  let dmSent = false;
  let dmError: string | undefined;
  try {
    const user = await client.users.fetch(userId);
    const dmEmbed = new EmbedBuilder()
      .setColor(0xfaa61a)
      .setTitle("⚠️ Du wurdest verwarnt")
      .setDescription(`Auf dem Server **${guildName}**.`)
      .addFields(
        { name: "Grund", value: reason },
        { name: "Moderator", value: moderatorName, inline: true },
        { name: "Verwarnungen gesamt", value: String(totalWarnings), inline: true },
      )
      .setTimestamp(new Date());
    if (config?.guildIconUrl) dmEmbed.setThumbnail(config.guildIconUrl);

    await user.send({ embeds: [dmEmbed] });
    dmSent = true;
  } catch (err) {
    dmError =
      err instanceof Error && err.message.includes("Cannot send messages to this user")
        ? "User hat DMs deaktiviert"
        : "DM konnte nicht zugestellt werden";
    logger.warn({ err, userId }, "Warn-DM fehlgeschlagen");
  }

  // 3. Audit-Log (respektiert logModeration-Toggle)
  try {
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      await sendLog(
        client,
        "moderation",
        memberWarnEmbed({
          user,
          executor: { id: moderatorId },
          reason,
          warningCount: totalWarnings,
        }),
      );
    }
  } catch (err) {
    logger.warn({ err }, "Warn-Audit-Log fehlgeschlagen");
  }

  logger.info(
    { userId, moderatorId, warningId: warning.id, dmSent },
    "Verwarnung erstellt",
  );
  return { ok: true, warningId: warning.id, dmSent, dmError };
}
