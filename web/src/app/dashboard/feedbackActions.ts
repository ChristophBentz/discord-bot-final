"use server";

import nodemailer from "nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type SendFeedbackResult =
  | { ok: true }
  // notConfigured: kein SMTP auf diesem Server — Client fällt auf mailto: zurück,
  // damit Feedback auch von fremden Installationen ankommt.
  | { ok: false; error: string; notConfigured?: boolean };

/**
 * Feedback direkt per SMTP verschicken. Braucht SMTP_HOST/USER/PASS in der .env —
 * ohne Konfiguration kommt eine verständliche Fehlermeldung zurück.
 */
export async function sendFeedback(text: string): Promise<SendFeedbackResult> {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, error: "Nicht eingeloggt." };

  const trimmed = text.trim().slice(0, 1500);
  if (!trimmed) return { ok: false, error: "Feedback ist leer." };

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return {
      ok: false,
      error: "Kein SMTP konfiguriert — Mail-Programm wird geöffnet.",
      notConfigured: true,
    };
  }

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

  const senderName = session.user?.name ?? "Unbekannt";
  const discordId =
    (session.user as { discordId?: string } | undefined)?.discordId ?? "unbekannt";

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? user,
      to,
      subject: `Feedback zum Discord-Bot — von ${senderName}`,
      text: `Von: ${senderName} (Discord-ID: ${discordId})\nGesendet über das Dashboard.\n\n${trimmed}`,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Versand fehlgeschlagen.";
    return { ok: false, error: `Versand fehlgeschlagen: ${msg}` };
  }
}
