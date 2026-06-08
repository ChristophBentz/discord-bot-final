# Discord Bot Final

All-in-One Discord-Bot mit Web-Dashboard — selbst gehostet, eine Konfiguration, ein Server.

Moderation, Leveling, Auto-Rollen, Tickets, Music, RSS-Feeds, Custom-Commands,
öffentliche User-Profile, Leaderboard und mehr. Alles über ein zentrales
Dashboard konfigurierbar, kein Code-Editing nötig.

---

## Features

### Moderation & Sicherheit
- **Moderation** — Warns, Timeouts, Kicks, Bans aus dem Dashboard mit Verlauf pro User
- **AutoMod** — Anti-Spam, Mass-Mention-Filter, Invite-Filter, Whitelist-Channels und Bypass-Rollen
- **Audit Logs** — Konfigurierbare Server-Event-Logs (Delete/Edit/Join/Leave/Voice/Bans/Rollen…)

### Engagement
- **Welcome** — Begrüßungs- & Verabschiedungsnachrichten + Auto-Rollen für neue Mitglieder
- **Leveling** — XP für Nachrichten & Voice-Zeit, anpassbare Kurve, Reward-Rollen
- **Achievements** — Manuell oder automatisch (Level/Messages/Voice/XP), eigene Bilder
- **Server-Stats** — Locked Voice-Channels mit Live-Counter (Mitglieder/Online/Bots)
- **Auto-Rollen** — Self-Assign-Panels via Reactions, Buttons oder Dropdown
- **Custom Commands** — Eigene `/slash`-Commands mit Text- oder Embed-Antwort,
  Platzhaltern (`{user}`, `{server}`, `{random:a|b|c}`), Ephemeral, Role-Gates

### Utility
- **Temp-Channels** — Join-to-Create Voice mit Owner-Rechten (Lock, Rename, Limit)
- **Tickets** — Support-Threads via Button, Antworten aus dem Dashboard, Transkripte + Rating
- **Musik** — YouTube/Spotify/SoundCloud via yt-dlp, Dashboard-Steuerung
- **Free Games** — Postet kostenlose Spiele (Epic/Steam/GOG/Konsolen) via GamerPower
- **RSS-Feeds** — Beliebige RSS/Atom-Feeds in Discord-Channels
- **Nachrichten** — Text, Embeds, Umfragen, Datei-Anhänge im Namen des Bots senden
- **Emojis** — Drag-&-Drop Upload mit Auto-Resize auf Discord-Limit

### Übersicht
- **Mitglieder** — Vollprofile mit Heatmap, Rollen, Mod-Verlauf, Achievements, Online-Status
- **Analytics** — Server-Charts: Message-/Voice-Trends, Top-User, Channel-Aktivität
- **Bot-Health** — Live-Status, Memory, Discord-Latenz, Scheduler-Runs, Error-Log
- **Globale Suche** — `⌘K` findet Members, Channels, Pages, Commands, Achievements

### Public-Seiten (kein Login nötig)
- **User-Profile** unter `/u/[discordId]` — Level, XP, Achievements, Stats
- **Leaderboard** unter `/leaderboard` — XP-Rangliste mit Top-3-Podium
- **Magic-Links** — User bekommt via `/profil` einen signierten Link um sein
  Profil auf öffentlich/privat zu stellen — komplett ohne Login

---

## Voraussetzungen

- **Discord-Application** mit Bot-Token, Client-Secret und Guild-ID
  ([Developer Portal](https://discord.com/developers/applications))
- **OAuth Redirect-URI** in der Discord-App eintragen:
  - Dev: `http://localhost:3000/api/auth/callback/discord`
  - Prod: `https://deine-domain/api/auth/callback/discord`
- **Privileged Gateway Intents** im Discord-Portal aktivieren:
  - Server Members Intent
  - Presence Intent (für Online-Counter)
  - Message Content Intent (für AutoMod, Leveling)

---

## Setup

### Option A — Docker (empfohlen)

```bash
git clone <repo-url> discord-bot-final
cd discord-bot-final
cp .env.example .env
# .env mit deinen Werten füllen (Discord-Token, Secrets etc.)
docker compose up -d
```

**Secrets generieren:**
```bash
# NEXTAUTH_SECRET
openssl rand -base64 32
# BOT_API_SECRET
openssl rand -hex 32
```

**Slash-Commands registrieren** (einmalig nach Erststart):
```bash
docker compose exec bot sh -c "cd /app/bot && npx tsx src/scripts/registerCommands.ts"
```

**Logs ansehen:**
```bash
docker compose logs -f
```

Dashboard läuft auf `http://localhost:3000`. Für Production stell einen
Reverse-Proxy (Caddy, Nginx oder Cloudflare Tunnel) mit HTTPS davor.

---

### Option B — Interaktives Setup-Skript

Wenn du keinen Docker nutzen willst: das Skript installiert Dependencies,
DB, registriert Slash-Commands, kann optional Caddy oder Cloudflare Tunnel
einrichten und PM2 starten.

```bash
git clone <repo-url> discord-bot-final
cd discord-bot-final
bash scripts/setup.sh
```

**Voraussetzungen für Option B:**
- Node.js 20+
- npm 10+
- openssl (für Secret-Generierung)
- Optional: sudo (für Caddy/Cloudflare-Setup)

---

### Option C — Manueller Setup (Development)

```bash
git clone <repo-url> discord-bot-final
cd discord-bot-final
cp .env.example .env
# .env editieren

npm ci
npm run build:db
cd packages/db && npx prisma migrate deploy && cd ../..
npm --workspace bot run register   # Slash-Commands bei Discord registrieren

# Zwei Terminals:
npm run bot:dev   # Terminal 1
npm run web:dev   # Terminal 2
```

---

## Konfiguration

Alle Settings sind im **Dashboard** unter den jeweiligen Feature-Seiten
einstellbar — keine Code- oder Config-Datei-Anpassungen nötig.

**Env-Vars** (in `.env`):

| Variable | Beschreibung |
|---|---|
| `DISCORD_TOKEN` | Bot-Token aus dem Developer Portal |
| `DISCORD_CLIENT_ID` | Application-ID |
| `DISCORD_CLIENT_SECRET` | OAuth-Secret |
| `DISCORD_GUILD_ID` | ID deines Servers (Single-Server-Bot) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` oder `https://deine-domain` |
| `PUBLIC_WEB_URL` | URL für `/profil`-Links — fällt auf `NEXTAUTH_URL` zurück |
| `OWNER_DISCORD_ID` | (optional) Notfall-Zugang für Owner |
| `BOT_API_SECRET` | `openssl rand -hex 32` — geteiltes Secret Bot↔Web |
| `BOT_API_URL` | Wo das Web den Bot erreicht (`http://localhost:4001`) |
| `BOT_API_PORT` | Port für Bot-API (default 4001) |
| `DATABASE_URL` | SQLite-Pfad (`file:./dev.db`, im Docker `file:/data/dev.db`) |
| `NEXT_PUBLIC_BRAND_NAME` | (optional) Footer-Branding auf Public-Pages |
| `NEXT_PUBLIC_BRAND_URL` | (optional) Footer-Link |

---

## Login & Berechtigungen

- Login läuft über **Discord OAuth**
- Ins Dashboard kommen nur User mit Admin/Mod-Rolle auf dem konfigurierten Server
  (geprüft per Discord-Permissions: `Administrator`, `KickMembers`, `BanMembers`
  oder `ModerateMembers`)
- `OWNER_DISCORD_ID` als Notfall-Zugang falls Member-Sync ausfällt

---

## Slash-Commands

| Befehl | Beschreibung |
|---|---|
| `/ping` | Bot-Latenz |
| `/leaderboard` | Link zum öffentlichen Leaderboard |
| `/profil` | Eigener Profil-Link + Bearbeiten-Modus |
| `/profil reset` | Erzeugt neuen Magic-Link, alter wird ungültig |
| `/<custom>` | Alle im Dashboard angelegten Custom-Commands |

---

## Updates

### Docker
```bash
git pull
docker compose build
docker compose up -d
```

### Native (mit `setup.sh` oder manuell)
```bash
git pull
npm ci
npm run build:db
cd packages/db && npx prisma migrate deploy && cd ../..
npm run build
npm --workspace bot run register   # nur bei neuen Slash-Commands nötig
pm2 restart all
```

---

## Stack

**Bot:** Node.js 20+ · TypeScript 5.7 · discord.js v14 · discord-player v7 (yt-dlp) · pino

**Web:** Next.js 15.5 (App Router) · React 19 · NextAuth v4 · Tailwind v3

**DB:** SQLite via Prisma 5 — single-file, ohne externe DB nötig (für größere
Server kann auf Postgres umgestellt werden, Schema ist DB-agnostisch)

**Monorepo:** npm workspaces (`bot/`, `web/`, `packages/db/`)

---

## Architektur

```
        ┌──────────────┐         ┌──────────────┐
Discord │     Bot      │ ←HTTP→  │     Web      │ Browser
        │  (Gateway)   │  Port   │  (Next.js)   │
        └──────┬───────┘  4001   └──────┬───────┘
               │                        │
               └────────┬───────────────┘
                        ▼
                 ┌─────────────┐
                 │   SQLite    │
                 │  (Prisma)   │
                 └─────────────┘
```

- Bot hält die persistente Discord-Gateway-Verbindung
- Web liest/schreibt DB direkt
- Mutations die Discord-Side wirken (Channel-Rename, Nachricht senden,
  Slash-Command-Sync) gehen über die HTTP-Bridge mit Shared-Secret
- Auth fürs Dashboard über NextAuth + Discord OAuth

---

## Projektstruktur

```
.
├── bot/                  # Discord-Bot (Slash-Commands, Events, HTTP-API)
│   ├── src/commands/     # Globale Slash-Commands
│   ├── src/events/       # Discord-Event-Handler
│   ├── src/features/     # Feature-Module (leveling, tickets, music, …)
│   ├── src/api/          # HTTP-Bridge Endpoints
│   ├── src/lib/          # Logger, env, healthBuffer
│   └── src/scripts/      # registerCommands.ts
├── web/                  # Next.js Dashboard
│   └── src/app/dashboard/  # Eine Page pro Feature
├── packages/db/          # Prisma Schema + Client (geteilt)
│   └── prisma/
├── scripts/setup.sh      # Interaktiver Installer
├── Dockerfile
├── docker-compose.yml
└── ecosystem.config.cjs  # PM2-Config für native Deployments
```

---

## License

MIT — siehe [LICENSE](LICENSE)
