import type { Client } from "discord.js";
import { prisma } from "@repo/db";

import {
  getRecentLogs,
  getSchedulerStatuses,
  type LogEntry,
  type SchedulerStatus,
} from "../../lib/healthBuffer.js";

const bootTime = Date.now();

export interface HealthResponse {
  ok: true;
  bot: {
    uptimeMs: number;
    wsLatencyMs: number;
    ready: boolean;
    user: { tag: string; id: string } | null;
    guildCount: number;
  };
  process: {
    nodeVersion: string;
    platform: string;
    pid: number;
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  guild: {
    name: string | null;
    memberCount: number;
    cachedMembers: number;
    roleCount: number;
    channelCount: number;
  };
  db: {
    members: number;
    levelUsers: number;
    achievements: number;
    customCommands: number;
    warnings: number;
    tickets: number;
  };
  schedulers: SchedulerStatus[];
  logs: LogEntry[];
}

export async function handleHealth(client: Client): Promise<HealthResponse> {
  const mem = process.memoryUsage();
  const guild = client.guilds.cache.first() ?? null;

  const [members, levelUsers, achievements, customCommands, warnings, tickets] =
    await Promise.all([
      prisma.member.count(),
      prisma.levelUser.count(),
      prisma.achievement.count(),
      prisma.customCommand.count(),
      prisma.warning.count(),
      prisma.ticket.count(),
    ]);

  return {
    ok: true,
    bot: {
      uptimeMs: Date.now() - bootTime,
      wsLatencyMs: client.ws.ping,
      ready: client.isReady(),
      user: client.user
        ? { tag: client.user.tag, id: client.user.id }
        : null,
      guildCount: client.guilds.cache.size,
    },
    process: {
      nodeVersion: process.version,
      platform: `${process.platform} ${process.arch}`,
      pid: process.pid,
      rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
    },
    guild: {
      name: guild?.name ?? null,
      memberCount: guild?.memberCount ?? 0,
      cachedMembers: guild?.members.cache.size ?? 0,
      roleCount: guild?.roles.cache.size ?? 0,
      channelCount: guild?.channels.cache.size ?? 0,
    },
    db: {
      members,
      levelUsers,
      achievements,
      customCommands,
      warnings,
      tickets,
    },
    schedulers: getSchedulerStatuses(),
    logs: getRecentLogs(),
  };
}
