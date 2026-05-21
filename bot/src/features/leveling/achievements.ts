import {
  AttachmentBuilder,
  EmbedBuilder,
  type Client,
  type TextChannel,
} from "discord.js";
import { prisma, type Achievement, type LevelUser } from "@repo/db";
import { logger } from "../../lib/logger.js";

export type AwardSource = "auto" | string;

export interface AwardResult {
  newlyAwarded: Achievement[];
  notified: { dmSent: boolean; channelSent: boolean }[];
}

async function getEligibleAchievements(user: LevelUser): Promise<Achievement[]> {
  const voiceHours = Math.floor(user.voiceSeconds / 3600);
  return prisma.achievement.findMany({
    where: {
      triggerType: { in: ["level", "messages", "voice", "xp"] },
      OR: [
        { triggerType: "level", triggerValue: { lte: user.level } },
        { triggerType: "messages", triggerValue: { lte: user.messageCount } },
        { triggerType: "voice", triggerValue: { lte: voiceHours } },
        { triggerType: "xp", triggerValue: { lte: user.xp } },
      ],
    },
  });
}

// Lädt das Bild vom Web-Server (läuft auf demselben Host) und liefert ein AttachmentBuilder.
// Discord hostet den Anhang dann selbst — funktioniert auch wenn unser Web-Server nicht öffentlich ist.
async function loadImageAttachment(
  imageUrl: string | null,
): Promise<AttachmentBuilder | null> {
  if (!imageUrl) return null;
  const baseUrl = process.env.WEB_BASE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(baseUrl + imageUrl);
    if (!res.ok) {
      logger.warn({ status: res.status, imageUrl }, "Achievement-Bild konnte nicht geladen werden");
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const name = imageUrl.split("/").pop() ?? "image.png";
    return new AttachmentBuilder(buffer, { name });
  } catch (err) {
    logger.warn({ err, imageUrl }, "Achievement-Bild-Fetch fehlgeschlagen");
    return null;
  }
}

function buildEmbed(args: {
  guildName: string;
  guildIconUrl: string | null;
  achievement: Achievement;
  userId: string;
  isDM: boolean;
  attachmentName: string | null;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0xa855f7)
    .setTitle("🏆 Achievement freigeschaltet")
    .setDescription(
      args.isDM
        ? `Auf dem Server **${args.guildName}** hast du eine neue Auszeichnung erhalten:`
        : `<@${args.userId}> hat eine neue Auszeichnung erhalten:`,
    )
    .addFields({ name: args.achievement.name, value: args.achievement.description })
    .setTimestamp(new Date());

  if (args.attachmentName) {
    embed.setThumbnail(`attachment://${args.attachmentName}`);
  } else if (args.guildIconUrl && args.isDM) {
    embed.setThumbnail(args.guildIconUrl);
  }

  return embed;
}

async function awardAndNotify(
  client: Client,
  userId: string,
  achievements: Achievement[],
  awardedBy: AwardSource,
): Promise<AwardResult> {
  const result: AwardResult = { newlyAwarded: [], notified: [] };
  if (achievements.length === 0) return result;

  const config = await prisma.config.findUnique({ where: { id: 1 } });

  for (const achievement of achievements) {
    try {
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
          awardedBy: awardedBy === "auto" ? null : awardedBy,
        },
      });
    } catch {
      continue;
    }

    result.newlyAwarded.push(achievement);

    // Bild einmal laden, für DM + Channel wiederverwenden
    const attachment = await loadImageAttachment(achievement.imageUrl);

    let dmSent = false;
    let channelSent = false;

    if (config?.achievementNotifyDM) {
      try {
        const user = await client.users.fetch(userId);
        const dmEmbed = buildEmbed({
          guildName: config?.guildName ?? "dem Server",
          guildIconUrl: config?.guildIconUrl ?? null,
          achievement,
          userId,
          isDM: true,
          attachmentName: attachment?.name ?? null,
        });
        await user.send({
          embeds: [dmEmbed],
          files: attachment ? [attachment] : [],
        });
        dmSent = true;
      } catch (err) {
        logger.warn({ err, userId, achievementId: achievement.id }, "Achievement-DM fehlgeschlagen");
      }
    }

    if (config?.achievementNotifyChannel && config.achievementChannelId) {
      try {
        const channel = await client.channels
          .fetch(config.achievementChannelId)
          .catch(() => null);
        if (channel?.isTextBased() && "send" in channel) {
          const channelEmbed = buildEmbed({
            guildName: config?.guildName ?? "dem Server",
            guildIconUrl: config?.guildIconUrl ?? null,
            achievement,
            userId,
            isDM: false,
            attachmentName: attachment?.name ?? null,
          });
          await (channel as TextChannel).send({
            embeds: [channelEmbed],
            files: attachment ? [attachment] : [],
          });
          channelSent = true;
        }
      } catch (err) {
        logger.warn({ err, userId, achievementId: achievement.id }, "Achievement-Channel-Post fehlgeschlagen");
      }
    }

    result.notified.push({ dmSent, channelSent });
    logger.info(
      { userId, achievementId: achievement.id, awardedBy, dmSent, channelSent },
      "Achievement vergeben",
    );
  }

  return result;
}

export async function checkAndAwardAuto(
  client: Client,
  user: LevelUser,
): Promise<AwardResult> {
  const eligible = await getEligibleAchievements(user);
  if (eligible.length === 0) return { newlyAwarded: [], notified: [] };

  const already = await prisma.userAchievement.findMany({
    where: { userId: user.userId, achievementId: { in: eligible.map((a) => a.id) } },
    select: { achievementId: true },
  });
  const alreadyIds = new Set(already.map((a) => a.achievementId));
  const toAward = eligible.filter((a) => !alreadyIds.has(a.id));

  return awardAndNotify(client, user.userId, toAward, "auto");
}

export async function awardManually(
  client: Client,
  userId: string,
  achievementId: number,
  moderatorId: string,
): Promise<
  | { ok: true; alreadyAwarded: boolean; dmSent: boolean; channelSent: boolean }
  | { ok: false; error: string }
> {
  const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } });
  if (!achievement) return { ok: false, error: "Achievement nicht gefunden" };

  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId } },
  });
  if (existing) {
    return { ok: true, alreadyAwarded: true, dmSent: false, channelSent: false };
  }

  const result = await awardAndNotify(client, userId, [achievement], moderatorId);
  const notif = result.notified[0] ?? { dmSent: false, channelSent: false };
  return { ok: true, alreadyAwarded: false, dmSent: notif.dmSent, channelSent: notif.channelSent };
}
