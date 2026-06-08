import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
// dist/api/routes/update.js → ../../../../  (raus aus dist + bot/)
const REPO_ROOT = join(here, "..", "..", "..", "..");
const STATUS_FILE = process.env.BOT_UPDATE_STATUS_FILE ?? join(REPO_ROOT, ".update-status.json");
const UPDATE_SCRIPT = join(REPO_ROOT, "scripts", "update.sh");
const LOCK_FILE = join(REPO_ROOT, ".update.lock");
const DOCKER_FLAG = "/.dockerenv";

// Repo-Slug aus git remote — z.B. "ChristophBentz/discord-bot-final"
let cachedRepoSlug: string | null = null;
function getRepoSlug(): string | null {
  if (cachedRepoSlug !== null) return cachedRepoSlug;
  // ENV override hat Vorrang
  if (process.env.UPSTREAM_REPO) {
    cachedRepoSlug = process.env.UPSTREAM_REPO;
    return cachedRepoSlug;
  }
  try {
    const url = execSync("git remote get-url origin", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    const match = url.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/);
    cachedRepoSlug = match?.[1] ?? null;
  } catch {
    cachedRepoSlug = null;
  }
  return cachedRepoSlug;
}

let cachedSha: string | null | undefined = undefined;
function getCurrentSha(): string | null {
  if (cachedSha !== undefined) return cachedSha;
  if (process.env.APP_GIT_SHA) {
    cachedSha = process.env.APP_GIT_SHA;
    return cachedSha;
  }
  try {
    cachedSha = execSync("git rev-parse HEAD", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    cachedSha = null;
  }
  return cachedSha;
}

function isDocker(): boolean {
  return existsSync(DOCKER_FLAG);
}

interface GitHubCommit {
  sha: string;
  commit: { message: string; author: { date: string; name: string } };
  html_url: string;
}

export interface VersionInfo {
  ok: true;
  current: { sha: string | null; short: string | null };
  latest: { sha: string; short: string; message: string; date: string; url: string } | null;
  behindCount: number | null;
  upToDate: boolean | null;
  repoSlug: string | null;
  canUpdate: boolean; // false in Docker / kein git / kein update script
  inDocker: boolean;
  reason?: string;
  updateInProgress: boolean;
}

export async function handleGetVersion(): Promise<VersionInfo> {
  const currentSha = getCurrentSha();
  const repoSlug = getRepoSlug();
  const docker = isDocker();
  const inProgress = existsSync(LOCK_FILE);

  let latest: VersionInfo["latest"] = null;
  let behindCount: number | null = null;
  let upToDate: boolean | null = null;

  if (repoSlug) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repoSlug}/commits/main`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (res.ok) {
        const commit = (await res.json()) as GitHubCommit;
        latest = {
          sha: commit.sha,
          short: commit.sha.slice(0, 7),
          message: commit.commit.message.split("\n")[0]!,
          date: commit.commit.author.date,
          url: commit.html_url,
        };
        if (currentSha) {
          upToDate = currentSha === commit.sha;
          // Anzahl Commits hinter: GitHub-Compare-API
          const compareRes = await fetch(
            `https://api.github.com/repos/${repoSlug}/compare/${currentSha}...${commit.sha}`,
            { headers: { Accept: "application/vnd.github+json" } },
          );
          if (compareRes.ok) {
            const cmp = (await compareRes.json()) as { ahead_by: number };
            behindCount = cmp.ahead_by;
          }
        }
      }
    } catch {
      // GitHub-API-Fehler: silent fail, latest bleibt null
    }
  }

  const canUpdate = !docker && currentSha !== null && existsSync(UPDATE_SCRIPT);
  let reason: string | undefined;
  if (docker) reason = "In Docker — update via `docker compose pull && up -d`";
  else if (!currentSha) reason = "Kein Git-Repo erkannt (APP_GIT_SHA fehlt + git fehlt)";
  else if (!existsSync(UPDATE_SCRIPT)) reason = "update.sh fehlt";

  return {
    ok: true,
    current: { sha: currentSha, short: currentSha?.slice(0, 7) ?? null },
    latest,
    behindCount,
    upToDate,
    repoSlug,
    canUpdate,
    inDocker: docker,
    reason,
    updateInProgress: inProgress,
  };
}

// ─── Update auslösen ────────────────────────────────────────────────────────

export interface TriggerResult {
  ok: boolean;
  started?: boolean;
  error?: string;
}

export function handleTriggerUpdate(): TriggerResult {
  if (isDocker()) return { ok: false, error: "Update via Dashboard ist im Docker-Mode nicht möglich" };
  if (!existsSync(UPDATE_SCRIPT)) return { ok: false, error: "update.sh nicht gefunden" };
  if (existsSync(LOCK_FILE)) return { ok: false, error: "Update läuft bereits" };

  // Detached + setsid damit das Skript überlebt, wenn pm2 unseren Bot killt
  const child = spawn("setsid", ["bash", UPDATE_SCRIPT], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, BOT_UPDATE_STATUS_FILE: STATUS_FILE },
  });
  child.unref();

  return { ok: true, started: true };
}

// ─── Update-Status pollen ──────────────────────────────────────────────────

export interface UpdateStatus {
  ok: true;
  active: boolean;
  step: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  log: string[];
}

export function handleUpdateStatus(): UpdateStatus {
  if (!existsSync(STATUS_FILE)) {
    return {
      ok: true,
      active: false,
      step: null,
      startedAt: null,
      finishedAt: null,
      error: null,
      log: [],
    };
  }
  try {
    const data = JSON.parse(readFileSync(STATUS_FILE, "utf8")) as {
      step?: string;
      startedAt?: string;
      finishedAt?: string | null;
      error?: string | null;
      log?: string[];
    };
    return {
      ok: true,
      active: existsSync(LOCK_FILE),
      step: data.step ?? null,
      startedAt: data.startedAt ?? null,
      finishedAt: data.finishedAt ?? null,
      error: data.error ?? null,
      log: data.log ?? [],
    };
  } catch {
    return {
      ok: true,
      active: existsSync(LOCK_FILE),
      step: null,
      startedAt: null,
      finishedAt: null,
      error: "Status-File nicht lesbar",
      log: [],
    };
  }
}
