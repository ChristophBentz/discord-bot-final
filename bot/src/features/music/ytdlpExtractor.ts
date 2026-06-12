// Custom Extractor für discord-player, der yt-dlp nutzt.
// Hintergrund: discord-player-youtubei (youtubei.js v16) kann YouTube's Player-Signatur
// nicht mehr entschlüsseln — yt-dlp wird ständig aktualisiert und ist deutlich zuverlässiger.

import { BaseExtractor, QueryType, Track, Util, type ExtractorInfo, type ExtractorSearchContext } from "discord-player";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Readable } from "node:stream";
import { logger } from "../../lib/logger.js";

// yt-dlp-Binary aus youtube-dl-exec lokalisieren, dabei den Spawn der Library umgehen
// (deren Spawn-Parser zerbricht an Spaces im Pfad — bei uns "Discord Bot Final").
const require_ = createRequire(import.meta.url);
const YTDLP_BIN = join(
  dirname(require_.resolve("youtube-dl-exec/package.json")),
  "bin",
  "yt-dlp",
);

const YT_URL = /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i;
const SC_URL = /^https?:\/\/(www\.|m\.)?soundcloud\.com\//i;

/**
 * yt-dlp auf die neueste Version bringen (Self-Update des Standalone-Binarys).
 * YouTube sperrt alte yt-dlp-Versionen regelmäßig aus — das von youtube-dl-exec
 * mitgelieferte Binary ist auf dem Stand des npm-Installs eingefroren. Wird beim
 * Bot-Start aufgerufen; Fehler (z.B. offline) sind unkritisch und werden nur geloggt.
 */
export function updateYtDlp(): Promise<void> {
  return new Promise((resolve) => {
    const proc = spawn(YTDLP_BIN, ["-U"], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    proc.stdout.on("data", (b) => (output += b.toString()));
    proc.stderr.on("data", (b) => (output += b.toString()));
    proc.on("error", (err) => {
      logger.warn({ err: err.message }, "yt-dlp Self-Update fehlgeschlagen");
      resolve();
    });
    proc.on("close", (code) => {
      const summary = output.trim().split("\n").slice(-1)[0] ?? "";
      if (code === 0) logger.info({ summary }, "yt-dlp Self-Update");
      else logger.warn({ code, output: output.slice(0, 400) }, "yt-dlp Self-Update fehlgeschlagen");
      resolve();
    });
  });
}

interface YtDlpInfo {
  title?: string;
  uploader?: string;
  channel?: string;
  webpage_url?: string;
  url?: string;
  thumbnail?: string;
  duration?: number;
  view_count?: number;
  is_live?: boolean;
  entries?: YtDlpInfo[];
}

// YouTube bot-detection umgehen: explizit web_safari + android + mweb Clients probieren.
// Reihenfolge ist die Fallback-Reihenfolge in yt-dlp.
const YT_EXTRACTOR_ARGS = "youtube:player_client=web_safari,android,mweb,tv";

function runYtDlpRaw(input: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const args = [
      input,
      "--dump-single-json",
      "--no-warnings",
      "--no-playlist",
      "--extractor-args",
      YT_EXTRACTOR_ARGS,
      "-f",
      "bestaudio[ext=webm]/bestaudio/best",
    ];
    const proc = spawn(YTDLP_BIN, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (b) => (stdout += b.toString()));
    proc.stderr.on("data", (b) => (stderr += b.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => resolve({ stdout, stderr, code: code ?? -1 }));
  });
}

async function runYtDlp(input: string): Promise<YtDlpInfo | null> {
  try {
    const { stdout, stderr, code } = await runYtDlpRaw(input);
    if (code !== 0) {
      logger.warn({ input, code, stderr: stderr.slice(0, 800) }, "yt-dlp Exit-Code");
      return null;
    }
    const parsed = JSON.parse(stdout) as YtDlpInfo;
    if (parsed.entries && parsed.entries.length > 0) return parsed.entries[0]!;
    return parsed;
  } catch (err) {
    logger.warn({ input, err: err instanceof Error ? err.message : String(err) }, "yt-dlp Fehler");
    return null;
  }
}

export class YtdlpExtractor extends BaseExtractor {
  public static identifier = "com.bot.ytdlp-extractor";

  override async activate(): Promise<void> {
    this.protocols = ["yt", "youtube", "search", "soundcloud"];
  }

  override async validate(query: string): Promise<boolean> {
    if (YT_URL.test(query)) return true;
    if (SC_URL.test(query)) return true;
    // Kein URL-Pattern → wir behandeln es als Suchanfrage.
    if (!/^https?:\/\//i.test(query)) return true;
    return false;
  }

  override async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
    const input = /^https?:\/\//i.test(query) ? query : `ytsearch1:${query}`;
    const info = await runYtDlp(input);
    if (!info || !info.url) return this.createResponse(null, []);

    const durationMs = (info.duration ?? 0) * 1000;
    const track = new Track(this.context.player, {
      title: info.title ?? "Unknown",
      description: "",
      author: info.uploader ?? info.channel ?? "Unknown",
      url: info.webpage_url ?? info.url,
      thumbnail: info.thumbnail ?? "",
      duration: Util.buildTimeCode(Util.parseMS(durationMs)),
      views: info.view_count ?? 0,
      requestedBy: context.requestedBy ?? null,
      source: YT_URL.test(input) ? "youtube" : SC_URL.test(query) ? "soundcloud" : "arbitrary",
      live: Boolean(info.is_live),
      raw: { webpage_url: info.webpage_url, stream_url: info.url },
      queryType: context.type ?? QueryType.AUTO_SEARCH,
    });
    track.extractor = this;
    return this.createResponse(null, [track]);
  }

  override async stream(track: Track): Promise<Readable> {
    // yt-dlp pipet das Audio direkt nach stdout — kein Race mit signierten CDN-URLs.
    const raw = track.raw as { webpage_url?: string } | null;
    const source = raw?.webpage_url ?? track.url;
    const proc = spawn(
      YTDLP_BIN,
      [
        source,
        "-f",
        "bestaudio[ext=webm]/bestaudio/best",
        "-o",
        "-",
        "--quiet",
        "--no-warnings",
        "--no-playlist",
        "--extractor-args",
        YT_EXTRACTOR_ARGS,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    proc.stderr.on("data", (b) => {
      const msg = b.toString().trim();
      if (msg) logger.warn({ msg: msg.slice(0, 400) }, "yt-dlp stream stderr");
    });
    proc.on("error", (err) => logger.error({ err }, "yt-dlp stream spawn error"));
    return proc.stdout;
  }

  override async getRelatedTracks(): Promise<ExtractorInfo> {
    return this.createResponse(null, []);
  }
}
