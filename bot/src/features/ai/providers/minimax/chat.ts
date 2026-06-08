import { callMinimax, type MinimaxClient } from "./client.js";

export interface ChatRequest extends MinimaxClient {
  model: string;
  prompt: string;
}

export interface ChatResult {
  ok: boolean;
  text?: string;
  error?: string;
}

export async function chat(req: ChatRequest): Promise<ChatResult> {
  const res = await callMinimax<{
    choices?: { message?: { content?: string } }[];
  }>(
    req,
    "/v1/text/chatcompletion_v2",
    {
      model: req.model,
      messages: [
        { role: "system", content: "Du bist ein hilfsbereiter Assistent in einem Discord-Server. Antworte kurz und freundlich." },
        { role: "user", content: req.prompt },
      ],
    },
  );

  if (!res.ok) return { ok: false, error: res.error };
  const text = res.data?.choices?.[0]?.message?.content;
  if (!text) return { ok: false, error: "Antwort enthielt keinen Text" };
  return { ok: true, text };
}
