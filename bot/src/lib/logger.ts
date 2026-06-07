import pino from "pino";
import { recordLog } from "./healthBuffer.js";

const base = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});

function captureLog(level: "error" | "warn", ctx: unknown, msg?: string) {
  const finalMsg = (typeof ctx === "string" ? ctx : msg) ?? "(no message)";
  const context =
    typeof ctx === "object" && ctx !== null ? (ctx as Record<string, unknown>) : undefined;
  recordLog(level, finalMsg, context);
}

// Wrapper damit error/warn-Calls zusätzlich im In-Memory-Buffer landen
// (für /dashboard/system Health-View). Andere Levels (info/debug/trace)
// gehen unverändert an pino.
export const logger = {
  ...base,
  error(ctx: unknown, msg?: string): void {
    captureLog("error", ctx, msg);
    // pino-Overloads: (ctx, msg) ODER (msg)
    if (typeof ctx === "string") base.error(ctx);
    else base.error(ctx as object, msg ?? "");
  },
  warn(ctx: unknown, msg?: string): void {
    captureLog("warn", ctx, msg);
    if (typeof ctx === "string") base.warn(ctx);
    else base.warn(ctx as object, msg ?? "");
  },
  info: base.info.bind(base),
  debug: base.debug.bind(base),
  trace: base.trace.bind(base),
  fatal: base.fatal.bind(base),
};
