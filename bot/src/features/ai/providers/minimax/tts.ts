import { callMinimax, type MinimaxClient } from "./client.js";

export interface TtsRequest extends MinimaxClient {
  model: string;
  text: string;
  voiceId: string;
}

export interface TtsResult {
  ok: boolean;
  /** mp3-Buffer */
  audio?: Buffer;
  error?: string;
}

export async function generateSpeech(req: TtsRequest): Promise<TtsResult> {
  const res = await callMinimax<{
    data?: { audio?: string }; // hex-encoded mp3
  }>(
    req,
    "/v1/t2a_v2",
    {
      model: req.model,
      text: req.text,
      voice_setting: {
        voice_id: req.voiceId,
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
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
