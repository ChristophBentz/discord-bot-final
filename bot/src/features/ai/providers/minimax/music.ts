import { callMinimax, type MinimaxClient } from "./client.js";

export interface MusicRequest extends MinimaxClient {
  model: string;
  /** Lyrics ODER ein Style-Prompt — MiniMax akzeptiert beides via "lyrics"-Feld */
  lyrics: string;
  /** Referenz-Stil als Text-Beschreibung */
  refer_voice?: string;
}

export interface MusicResult {
  ok: boolean;
  audio?: Buffer;
  error?: string;
}

export async function generateMusic(req: MusicRequest): Promise<MusicResult> {
  const res = await callMinimax<{
    data?: { audio?: string }; // hex-encoded mp3
  }>(
    req,
    "/v1/music_generation",
    {
      model: req.model,
      lyrics: req.lyrics,
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
