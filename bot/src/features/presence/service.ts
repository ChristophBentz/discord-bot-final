import { ActivityType, type Client } from "discord.js";
import { prisma } from "@repo/db";
import { logger } from "../../lib/logger.js";

const POLL_INTERVAL_MS = 15_000;

let lastApplied: string | null | undefined;

async function applyFromConfig(client: Client): Promise<void> {
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  const text = config?.botStatusText ?? null;
  if (text === lastApplied) return;
  lastApplied = text;

  if (!text) {
    client.user?.setPresence({ activities: [], status: "online" });
    logger.info("Presence zurückgesetzt");
    return;
  }

  client.user?.setPresence({
    activities: [{ name: text, type: ActivityType.Custom, state: text }],
    status: "online",
  });
  logger.info({ text }, "Presence aktualisiert");
}

// Startet einen Poller, der den Bot-Status alle paar Sekunden mit der DB synchronisiert.
export function startPresenceSync(client: Client): void {
  void applyFromConfig(client).catch((err) =>
    logger.error({ err }, "Initiales Presence-Update fehlgeschlagen"),
  );
  setInterval(() => {
    void applyFromConfig(client).catch((err) =>
      logger.error({ err }, "Presence-Polling fehlgeschlagen"),
    );
  }, POLL_INTERVAL_MS);
}
