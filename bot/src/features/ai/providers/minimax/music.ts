import { callMinimax, type MinimaxClient } from "./client.js";

export interface MusicRequest extends MinimaxClient {
  model: string;
  /** Songtext — wird automatisch mit Section-Markern versehen wenn keine vorhanden sind */
  lyrics: string;
}

export interface MusicResult {
  ok: boolean;
  audio?: Buffer;
  error?: string;
}

// MiniMax-Music erwartet Lyrics mit Section-Markern à la [Verse 1], [Chorus].
// Wenn der User keine angibt, packen wir den Text in ein einfaches Format
// damit der API-Validator zufrieden ist.
function ensureSectionMarkers(input: string): string {
  const trimmed = input.trim();
  if (/\[(verse|chorus|bridge|intro|outro|hook|pre[- ]?chorus)/i.test(trimmed)) {
    return trimmed;
  }
  // Erste 1-3 Zeilen als Verse, Rest als Chorus
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 2) {
    return `[Verse]\n${lines.join("\n")}\n[Chorus]\n${lines.join("\n")}`;
  }
  const mid = Math.ceil(lines.length / 2);
  return `[Verse]\n${lines.slice(0, mid).join("\n")}\n[Chorus]\n${lines.slice(mid).join("\n")}`;
}

export async function generateMusic(req: MusicRequest): Promise<MusicResult> {
  const lyrics = ensureSectionMarkers(req.lyrics);

  const res = await callMinimax<{
    data?: { audio?: string };
  }>(
    req,
    "/v1/music_generation",
    {
      model: req.model,
      lyrics,
      audio_setting: {
        sample_rate: 44100,
        bitrate: 256000,
        format: "mp3",
      },
    },
    { appendGroupIdToQuery: true },
  );

  if (!res.ok) return { ok: false, error: res.error };
  const hex = res.data?.data?.audio;
  if (!hex) return { ok: false, error: "Antwort enthielt kein Audio" };
  try {
    return { ok: true, audio: Buffer.from(hex, "hex") };
  } catch (err) {
    return { ok: false, error: `Audio-Decode-Fehler: ${err}` };
  }
}
