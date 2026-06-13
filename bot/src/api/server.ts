import { createServer, type IncomingMessage } from "node:http";
import { timingSafeEqual } from "node:crypto";
import type { Client } from "discord.js";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { invalidateAuditLogCache } from "../features/auditLog/service.js";
import { handleRoleChange, type RoleChangeBody } from "./routes/roles.js";
import { handleWarn, type WarnBody } from "./routes/warn.js";
import { handleAwardAchievement, type AwardBody } from "./routes/achievements.js";
import {
  handleTimeout,
  handleKick,
  handleBan,
  handleUnban,
  handleRemoveTimeout,
  getModerationState,
  handleCreateRejoinInvite,
  type TimeoutBody,
  type ModBody,
  type BanBody,
} from "./routes/moderation.js";
import {
  handleTicketReply,
  handleTicketClose,
  handleEnsurePanel,
  type ReplyBody,
  type CloseBody,
} from "./routes/tickets.js";
import {
  getMusicState,
  handlePlay as handleMusicPlay,
  handlePause as handleMusicPause,
  handleResume as handleMusicResume,
  handleSkip as handleMusicSkip,
  handleStop as handleMusicStop,
  handleVolume as handleMusicVolume,
  type ActionBody as MusicActionBody,
  type PlayBody as MusicPlayBody,
  type VolumeBody as MusicVolumeBody,
} from "./routes/music.js";
import { handleFreeGamesCheck } from "./routes/freeGames.js";
import {
  handleServerStatsDiagnose,
  handleServerStatsEnsure,
  handleServerStatsReset,
  handleServerStatsUpdate,
} from "./routes/serverStats.js";
import {
  handleDeleteEmoji,
  handleGetDescription,
  handleListEmojis,
  handleRenameEmoji,
  handleSetAvatar,
  handleSetBanner,
  handleSetDescription,
  handleSetNickname,
  handleUploadEmoji,
  type AvatarBody,
  type BannerBody,
  type DescriptionBody,
  type EmojiRenameBody,
  type EmojiUploadBody,
  type NicknameBody,
} from "./routes/bot.js";
import { handleRssCheck, handleRssTest, type TestBody as RssTestBody } from "./routes/rss.js";
import {
  handleSelfRoleSync,
  handleSelfRoleDeleteMessage,
} from "./routes/selfRoles.js";
import {
  handleCreateGiveaway,
  handleEndGiveaway,
  handleRerollGiveaway,
  handleDeleteGiveaway,
  type CreateGiveawayBody,
} from "./routes/giveaways.js";
import { getMemberPresence, handleRefreshProfile } from "./routes/profile.js";
import {
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
  type SendBody,
  type EditBody,
} from "./routes/messages.js";
import { syncAllCommands } from "../features/customCommands/register.js";
import { handleHealth } from "./routes/health.js";
import {
  handleGetVersion,
  handleTriggerUpdate,
  handleUpdateStatus,
} from "./routes/update.js";

async function readJson<T>(req: IncomingMessage): Promise<T | null> {
  return new Promise((resolve) => {
    let raw = "";
    // 12 MB Limit — Avatar-Uploads kommen als base64 data-URLs rein
    // und können bis ~10 MB groß werden.
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 12 * 1024 * 1024) {
        req.destroy();
        resolve(null);
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? (JSON.parse(raw) as T) : null);
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

function ok(res: import("node:http").ServerResponse, body: unknown) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
function fail(res: import("node:http").ServerResponse, status: number, error: string) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error }));
}

// Timing-safe Vergleich des API-Secrets. Längen-Mismatch zuerst abfangen,
// damit timingSafeEqual nicht wirft, und über einen Dummy-Vergleich trotzdem
// konstante Zeit halten.
const SECRET_BUF = Buffer.from(env.BOT_API_SECRET);
function secretMatches(provided: string): boolean {
  const buf = Buffer.from(provided);
  if (buf.length !== SECRET_BUF.length) {
    // Konstante-Zeit-Dummy gegen sich selbst, Ergebnis verwerfen.
    timingSafeEqual(buf, buf);
    return false;
  }
  return timingSafeEqual(buf, SECRET_BUF);
}

export function startApiServer(client: Client): void {
  const server = createServer(async (req, res) => {
    try {
      // Auth: geteiltes Secret im Header — timing-safe verglichen.
      const auth = req.headers["x-bot-api-key"];
      if (typeof auth !== "string" || !secretMatches(auth)) {
        fail(res, 401, "unauthorized");
        return;
      }

      const url = new URL(req.url ?? "/", "http://localhost");

      // POST /api/members/:userId/roles
      const rolesMatch = url.pathname.match(/^\/api\/members\/(\d{17,20})\/roles$/);
      if (req.method === "POST" && rolesMatch) {
        const userId = rolesMatch[1]!;
        const body = await readJson<RoleChangeBody>(req);
        if (!body) {
          fail(res, 400, "Body ist kein valides JSON");
          return;
        }
        const result = await handleRoleChange(client, userId, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/members/:userId/warn
      const warnMatch = url.pathname.match(/^\/api\/members\/(\d{17,20})\/warn$/);
      if (req.method === "POST" && warnMatch) {
        const userId = warnMatch[1]!;
        const body = await readJson<WarnBody>(req);
        if (!body) {
          fail(res, 400, "Body ist kein valides JSON");
          return;
        }
        const result = await handleWarn(client, userId, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/members/:userId/achievements/:achievementId
      const awardMatch = url.pathname.match(
        /^\/api\/members\/(\d{17,20})\/achievements\/(\d+)$/,
      );
      if (req.method === "POST" && awardMatch) {
        const userId = awardMatch[1]!;
        const achievementId = Number(awardMatch[2]!);
        const body = (await readJson<AwardBody>(req)) ?? {};
        const result = await handleAwardAchievement(client, userId, achievementId, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/members/:userId/timeout
      const timeoutMatch = url.pathname.match(/^\/api\/members\/(\d{17,20})\/timeout$/);
      if (req.method === "POST" && timeoutMatch) {
        const userId = timeoutMatch[1]!;
        const body = (await readJson<TimeoutBody>(req)) ?? {};
        const result = await handleTimeout(client, userId, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/members/:userId/kick
      const kickMatch = url.pathname.match(/^\/api\/members\/(\d{17,20})\/kick$/);
      if (req.method === "POST" && kickMatch) {
        const userId = kickMatch[1]!;
        const body = (await readJson<ModBody>(req)) ?? {};
        const result = await handleKick(client, userId, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/members/:userId/ban
      const banMatch = url.pathname.match(/^\/api\/members\/(\d{17,20})\/ban$/);
      if (req.method === "POST" && banMatch) {
        const userId = banMatch[1]!;
        const body = (await readJson<BanBody>(req)) ?? {};
        const result = await handleBan(client, userId, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // DELETE /api/members/:userId/ban → Unban
      if (req.method === "DELETE" && banMatch) {
        const userId = banMatch[1]!;
        const body = (await readJson<ModBody>(req)) ?? {};
        const result = await handleUnban(client, userId, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // DELETE /api/members/:userId/timeout → Remove timeout
      if (req.method === "DELETE" && timeoutMatch) {
        const userId = timeoutMatch[1]!;
        const body = (await readJson<ModBody>(req)) ?? {};
        const result = await handleRemoveTimeout(client, userId, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // GET /api/moderation/state
      if (req.method === "GET" && url.pathname === "/api/moderation/state") {
        const state = await getModerationState(client);
        ok(res, { ok: true, ...state });
        return;
      }

      // POST /api/moderation/rejoin-invite — Einmal-Invite nach angenommenem Appeal
      if (req.method === "POST" && url.pathname === "/api/moderation/rejoin-invite") {
        const result = await handleCreateRejoinInvite(client);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/tickets/:id/reply
      const ticketReplyMatch = url.pathname.match(/^\/api\/tickets\/(\d+)\/reply$/);
      if (req.method === "POST" && ticketReplyMatch) {
        const ticketId = Number(ticketReplyMatch[1]!);
        const body = (await readJson<ReplyBody>(req)) ?? {};
        const result = await handleTicketReply(client, ticketId, body);
        if (result.ok) ok(res, { ok: true });
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/tickets/:id/close
      const ticketCloseMatch = url.pathname.match(/^\/api\/tickets\/(\d+)\/close$/);
      if (req.method === "POST" && ticketCloseMatch) {
        const ticketId = Number(ticketCloseMatch[1]!);
        const body = (await readJson<CloseBody>(req)) ?? {};
        const result = await handleTicketClose(client, ticketId, body);
        if (result.ok) ok(res, { ok: true });
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/tickets/ensure-panel — Web triggert nach Settings-Change
      if (req.method === "POST" && url.pathname === "/api/tickets/ensure-panel") {
        await handleEnsurePanel(client);
        ok(res, { ok: true });
        return;
      }

      // POST /api/auditlog/invalidate-cache — Web triggert nach Logging-Settings-Change,
      // damit Toggles (z.B. Mod-Aktionen-Verlauf) sofort statt nach Cache-TTL wirken.
      if (req.method === "POST" && url.pathname === "/api/auditlog/invalidate-cache") {
        invalidateAuditLogCache();
        ok(res, { ok: true });
        return;
      }

      // GET /api/music/state
      if (req.method === "GET" && url.pathname === "/api/music/state") {
        const state = await getMusicState(client);
        ok(res, { ok: true, state });
        return;
      }
      // POST /api/music/play
      if (req.method === "POST" && url.pathname === "/api/music/play") {
        const body = (await readJson<MusicPlayBody>(req)) ?? {};
        const result = await handleMusicPlay(client, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }
      // POST /api/music/volume
      if (req.method === "POST" && url.pathname === "/api/music/volume") {
        const body = (await readJson<MusicVolumeBody>(req)) ?? {};
        const result = await handleMusicVolume(client, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }
      // POST /api/music/pause | resume | skip | stop
      const musicActionMatch = url.pathname.match(/^\/api\/music\/(pause|resume|skip|stop)$/);
      if (req.method === "POST" && musicActionMatch) {
        const action = musicActionMatch[1]!;
        const body = (await readJson<MusicActionBody>(req)) ?? {};
        const handler =
          action === "pause"
            ? handleMusicPause
            : action === "resume"
              ? handleMusicResume
              : action === "skip"
                ? handleMusicSkip
                : handleMusicStop;
        const result = await handler(client, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/rss/test — Vorschau ohne Speichern
      if (req.method === "POST" && url.pathname === "/api/rss/test") {
        const body = (await readJson<RssTestBody>(req)) ?? {};
        const result = await handleRssTest(body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/selfroles/panels/:id/sync — Panel-Nachricht posten/aktualisieren
      const srSyncMatch = url.pathname.match(/^\/api\/selfroles\/panels\/(\d+)\/sync$/);
      if (req.method === "POST" && srSyncMatch) {
        const panelId = Number(srSyncMatch[1]!);
        const result = await handleSelfRoleSync(client, panelId);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/selfroles/panels/:id/delete-message — Nachricht löschen (Panel bleibt)
      const srDelMatch = url.pathname.match(/^\/api\/selfroles\/panels\/(\d+)\/delete-message$/);
      if (req.method === "POST" && srDelMatch) {
        const panelId = Number(srDelMatch[1]!);
        const result = await handleSelfRoleDeleteMessage(client, panelId);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/rss/feeds/:id/check — sofortiger Check eines Feeds
      const rssCheckMatch = url.pathname.match(/^\/api\/rss\/feeds\/(\d+)\/check$/);
      if (req.method === "POST" && rssCheckMatch) {
        const feedId = Number(rssCheckMatch[1]!);
        const result = await handleRssCheck(client, feedId);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/giveaways — Giveaway erstellen + Nachricht posten
      if (req.method === "POST" && url.pathname === "/api/giveaways") {
        const body = await readJson<CreateGiveawayBody>(req);
        if (!body) return void fail(res, 400, "Body ist kein valides JSON");
        const result = await handleCreateGiveaway(client, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/giveaways/:id/end | /reroll | DELETE /api/giveaways/:id
      const gaMatch = url.pathname.match(/^\/api\/giveaways\/(\d+)(?:\/(end|reroll))?$/);
      if (gaMatch) {
        const gid = Number(gaMatch[1]!);
        const action = gaMatch[2];
        let result;
        if (req.method === "POST" && action === "end") result = await handleEndGiveaway(client, gid);
        else if (req.method === "POST" && action === "reroll") result = await handleRerollGiveaway(client, gid);
        else if (req.method === "DELETE" && !action) result = await handleDeleteGiveaway(client, gid);
        else return void fail(res, 404, "not found");
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/bot/nickname — Server-Nickname des Bots ändern
      if (req.method === "POST" && url.pathname === "/api/bot/nickname") {
        const body = (await readJson<NicknameBody>(req)) ?? {};
        const result = await handleSetNickname(client, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // GET /api/bot/description — aktuelle Beschreibung laden
      if (req.method === "GET" && url.pathname === "/api/bot/description") {
        const result = await handleGetDescription(client);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/bot/description — Beschreibung setzen
      if (req.method === "POST" && url.pathname === "/api/bot/description") {
        const body = (await readJson<DescriptionBody>(req)) ?? {};
        const result = await handleSetDescription(client, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/bot/avatar — Avatar als data:image/...;base64,... setzen
      if (req.method === "POST" && url.pathname === "/api/bot/avatar") {
        const body = (await readJson<AvatarBody>(req)) ?? {};
        const result = await handleSetAvatar(client, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/bot/banner — Banner-Image setzen
      if (req.method === "POST" && url.pathname === "/api/bot/banner") {
        const body = (await readJson<BannerBody>(req)) ?? {};
        const result = await handleSetBanner(client, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/bot/emoji — Custom-Emoji auf Server hochladen
      if (req.method === "POST" && url.pathname === "/api/bot/emoji") {
        const body = (await readJson<EmojiUploadBody>(req)) ?? {};
        const result = await handleUploadEmoji(client, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // GET /api/bot/emojis — alle Server-Emojis listen
      if (req.method === "GET" && url.pathname === "/api/bot/emojis") {
        const result = await handleListEmojis(client);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // DELETE /api/bot/emojis/:id
      const emojiIdMatch = url.pathname.match(/^\/api\/bot\/emojis\/(\d{17,20})$/);
      if (req.method === "DELETE" && emojiIdMatch) {
        const result = await handleDeleteEmoji(client, emojiIdMatch[1]!);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // PATCH /api/bot/emojis/:id — Rename
      if (req.method === "PATCH" && emojiIdMatch) {
        const body = (await readJson<EmojiRenameBody>(req)) ?? {};
        const result = await handleRenameEmoji(client, emojiIdMatch[1]!, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/serverstats/ensure — Channels nachziehen nach Config-Änderung
      if (req.method === "POST" && url.pathname === "/api/serverstats/ensure") {
        const result = await handleServerStatsEnsure(client);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/serverstats/update — sofortiges Update aller Stat-Channels
      if (req.method === "POST" && url.pathname === "/api/serverstats/update") {
        const result = await handleServerStatsUpdate(client);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // GET /api/serverstats/diagnose — Live-Diagnose der aktuellen Zustände
      if (req.method === "GET" && url.pathname === "/api/serverstats/diagnose") {
        const result = await handleServerStatsDiagnose(client);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/serverstats/reset — alle Channel-Referenzen nullen und neu anlegen
      if (req.method === "POST" && url.pathname === "/api/serverstats/reset") {
        const result = await handleServerStatsReset(client);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/freegames/check
      if (req.method === "POST" && url.pathname === "/api/freegames/check") {
        const result = await handleFreeGamesCheck(client);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/messages/send
      if (req.method === "POST" && url.pathname === "/api/messages/send") {
        const body = (await readJson<SendBody>(req)) ?? {};
        const result = await handleSendMessage(client, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // PATCH /api/messages/:id
      const msgEditMatch = url.pathname.match(/^\/api\/messages\/(\d+)$/);
      if (req.method === "PATCH" && msgEditMatch) {
        const id = Number(msgEditMatch[1]!);
        const body = (await readJson<EditBody>(req)) ?? {};
        const result = await handleEditMessage(client, id, body);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // DELETE /api/messages/:id
      if (req.method === "DELETE" && msgEditMatch) {
        const id = Number(msgEditMatch[1]!);
        const result = await handleDeleteMessage(client, id);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // POST /api/members/:userId/refresh-profile — Banner + Accent von Discord holen
      const refreshMatch = url.pathname.match(/^\/api\/members\/(\d{17,20})\/refresh-profile$/);
      if (req.method === "POST" && refreshMatch) {
        const userId = refreshMatch[1]!;
        const result = await handleRefreshProfile(client, userId);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // GET /api/members/:userId/presence — aktueller Online-Status aus Cache
      const presenceMatch = url.pathname.match(/^\/api\/members\/(\d{17,20})\/presence$/);
      if (req.method === "GET" && presenceMatch) {
        const userId = presenceMatch[1]!;
        const result = getMemberPresence(client, userId);
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error);
        return;
      }

      // GET /api/system/health — Bot-Status für Dashboard-Healthpage
      if (req.method === "GET" && url.pathname === "/api/system/health") {
        const result = await handleHealth(client);
        ok(res, result);
        return;
      }

      // GET /api/system/version — current SHA + GitHub-latest
      if (req.method === "GET" && url.pathname === "/api/system/version") {
        const result = await handleGetVersion();
        ok(res, result);
        return;
      }

      // POST /api/system/update — Update auslösen (Native only)
      if (req.method === "POST" && url.pathname === "/api/system/update") {
        const result = handleTriggerUpdate();
        if (result.ok) ok(res, result);
        else fail(res, 400, result.error ?? "Unbekannter Fehler");
        return;
      }

      // GET /api/system/update/status — Update-Progress pollen
      if (req.method === "GET" && url.pathname === "/api/system/update/status") {
        ok(res, handleUpdateStatus());
        return;
      }

      // POST /api/commands/sync — re-registriert built-in + custom Slash-Commands
      if (req.method === "POST" && url.pathname === "/api/commands/sync") {
        try {
          const result = await syncAllCommands();
          ok(res, { ok: true, ...result });
        } catch (err) {
          logger.error({ err }, "Command-Sync fehlgeschlagen");
          fail(res, 500, "Sync fehlgeschlagen — siehe Bot-Logs");
        }
        return;
      }

      fail(res, 404, "not found");
    } catch (err) {
      logger.error({ err, url: req.url }, "API-Fehler");
      fail(res, 500, "internal error");
    }
  });

  server.listen(env.BOT_API_PORT, "127.0.0.1", () => {
    logger.info({ port: env.BOT_API_PORT }, "Bot-API läuft");
  });
}
