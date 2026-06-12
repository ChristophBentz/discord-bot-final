"use server";

import nodemailer from "nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/db";

export type SendFeedbackResult =
  | { ok: true }
  // notConfigured: weder Endpoint erreichbar noch SMTP konfiguriert —
  // Client fällt auf mailto: zurück, damit Feedback trotzdem ankommt.
  | { ok: false; error: string; notConfigured?: boolean };

// Zentraler Empfangs-Endpoint (scripts/feedback-endpoint.php auf dem Webspace
// des Entwicklers) — funktioniert für jede Installation ohne Zugangsdaten.
const FEEDBACK_ENDPOINT =
  process.env.FEEDBACK_ENDPOINT ?? "https://moser-dev.com/bot-feedback.php";

export async function sendFeedback(text: string): Promise<SendFeedbackResult> {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, error: "Nicht eingeloggt." };

  const trimmed = text.trim().slice(0, 1500);
  if (!trimmed) return { ok: false, error: "Feedback ist leer." };

  const senderName = session.user?.name ?? "Unbekannt";
  const discordId =
    (session.user as { discordId?: string } | undefined)?.discordId ?? "";
  const config = await prisma.config
    .findUnique({ where: { id: 1 }, select: { guildName: true } })
    .catch(() => null);

  // 1. Zentraler Endpoint — kein Setup nötig, läuft für alle Installationen.
  if (FEEDBACK_ENDPOINT) {
    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          senderName,
          discordId,
          guildName: config?.guildName ?? "",
          website: "", // Honeypot — muss leer bleiben
        }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (res.ok && json?.ok) return { ok: true };
    } catch {
      // Endpoint nicht erreichbar → weiter mit SMTP/mailto
    }
  }

  // 2. Eigener SMTP-Zugang (falls auf dieser Installation konfiguriert).
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const to =
      process.env.FEEDBACK_EMAIL ??
      process.env.NEXT_PUBLIC_FEEDBACK_EMAIL ??
      "info@moser-dev.com";
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implizites TLS, 587 = STARTTLS
      auth: { user, pass },
    });
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM ?? user,
        to,
        subject: `Feedback zum Discord-Bot — von ${senderName}`,
        text: `Von: ${senderName} (Discord-ID: ${discordId || "unbekannt"})\nGesendet über das Dashboard.\n\n${trimmed}`,
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Versand fehlgeschlagen.";
      return { ok: false, error: `Versand fehlgeschlagen: ${msg}` };
    }
  }

  // 3. Nichts davon verfügbar → Client öffnet das Mail-Programm.
  return {
    ok: false,
    error: "Kein Versandweg verfügbar — Mail-Programm wird geöffnet.",
    notConfigured: true,
  };
}
