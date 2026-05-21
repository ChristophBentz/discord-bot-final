# Discord Bot Final

Discord-Bot mit Web-Dashboard zum Konfigurieren — gebaut für einen einzelnen Server.

## Stack

**Bot**
- Node.js 20+ mit TypeScript 5.7
- [discord.js v14.26](https://discord.js.org)
- [discord-player v7](https://discord-player.js.org) + yt-dlp für Musik (YouTube, Spotify, SoundCloud)
- ffmpeg-static + mediaplex (gebundlet, kein System-Install nötig)
- @snazzah/davey für Discord DAVE-Voice-Encryption
- pino für Logging

**Dashboard**
- Next.js 15.5 (App Router) + React 19
- NextAuth.js v4 mit Discord-OAuth
- Tailwind CSS v3.4

**Datenbank**
- SQLite via Prisma 5.22 (single-file `dev.db`, später auf Postgres migrierbar)

**Monorepo**
- npm workspaces (`bot/`, `web/`, `packages/db/`)

## Projektstruktur

```
.
├── bot/                # Discord-Bot (Slash-Commands + Events + HTTP-API auf 4001)
├── web/                # Next.js-Dashboard (Port 3000)
├── packages/db/        # Prisma-Schema + Client (geteilt von Bot und Web)
├── package.json        # Workspace-Root
└── .env.example        # Vorlage für Secrets
```

## Features

### Bot (Slash-Commands)
- **Moderation:** `/kick`, `/ban`, `/unban`, `/timeout`, `/warn`
- **Music:** `/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/loop`, `/volume`
- **System:** `/ping`

### Dashboard (`/dashboard/*`)
| Bereich | Funktion |
|---------|----------|
| Mitglieder | Liste, Profil, Rollen-Management, Aktivitäts-Heatmap, Moderation |
| Allgemein | Bot-Status + Server-Config |
| Audit Logs | Lösch-/Edit-/Join-/Leave-/Ban-/Voice-/Rollen-Events |
| Moderation | Aktive Timeouts + Bans, Warnungen-Übersicht |
| AutoMod | Wortfilter, Invite-Blocker (Guild-ID-Whitelist), Mass-Mention, Anti-Spam, Channel-Ausnahmen, Bypass-Rollen |
| Welcome | Welcome- und Leave-Nachrichten, Auto-Rollen, Presets |
| Leveling | XP per Nachricht + Voice, Leaderboard, Level-Up-Channel |
| Achievements | Custom Achievements mit Bild + Auto/Manuelle Vergabe |
| Tickets | Private-Thread-System mit Mod-Reply im Dashboard, Live-Refresh, Auto-Delete |
| Temp-Channels | Join-to-Create Voice mit Control-Panel, mehrere Trigger (+2/+5/+10) |
| Musik | YouTube/Spotify/SoundCloud Player, Live-Now-Playing, Queue, Volume-Slider, DJ-Rollen |
| Free Games | Auto-Posts via GamerPower (Epic, Steam, GOG, Konsolen) mit Ping-Rolle + Footer |
| Nachrichten | Text / Embed / Umfrage / Datei senden mit Bearbeiten + Löschen |

## Schnell-Setup (automatisch)

Nach `git clone` ein einziges Kommando:

```bash
bash scripts/setup.sh
```

Das Skript fragt dich:
- Discord-Credentials (Token, Client-ID, Client-Secret, Guild-ID, Owner-ID)
- ob lokal (Dev) oder mit eigener Domain (Production)
- bei Production: Domain (z. B. `bot.deinedomain.de`), dann Caddy-Setup
  für Reverse-Proxy + Auto-HTTPS, optional pm2 für 24/7-Betrieb

und macht dann automatisch:
- alle 3 Env-Files schreiben (mit auto-generierten Secrets)
- `npm ci` + Prisma `db push` + Slash-Commands registrieren
- bei Production: Build + Caddy installieren/konfigurieren + pm2 starten

Voraussetzungen: Node.js v20+, npm, openssl (auf Linux meist vorinstalliert).
Für Production-Modus zusätzlich: `sudo` + offene Ports 80/443.

## Setup (manuell, Schritt für Schritt)

### 1. Discord-Application anlegen

1. Auf https://discord.com/developers/applications → **New Application**.
2. Im Tab **Bot**: Token kopieren → `DISCORD_TOKEN`.
3. **Privileged Gateway Intents** aktivieren: `Server Members Intent`, `Message Content Intent`.
4. Im Tab **OAuth2** unter **Redirects** hinzufügen:
   `http://localhost:3000/api/auth/callback/discord`
5. Client-ID und Client-Secret kopieren → `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`.

### 2. Bot einladen

OAuth2-URL-Generator → Scopes `bot` + `applications.commands` wählen, gewünschte Bot-Permissions setzen (für den Anfang reicht `Administrator`), URL öffnen und auf deinen Server einladen.

### 3. Env-Files anlegen

Dein Setup hat **drei** `.env`-Files:

```bash
cp .env.example .env                           # Root
cp packages/db/.env.example packages/db/.env   # DB (DATABASE_URL)
nano web/.env.local                            # Web — siehe unten
```

Im Root-`.env` einfüllen: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DISCORD_CLIENT_SECRET`, `NEXTAUTH_SECRET` (`openssl rand -base64 32`), `BOT_API_SECRET` (`openssl rand -hex 32`), optional `OWNER_DISCORD_ID` als Notfall-Zugang.

Im `web/.env.local`:
```env
DISCORD_CLIENT_ID=<gleicher Wert>
DISCORD_CLIENT_SECRET=<gleicher Wert>
NEXTAUTH_SECRET=<gleicher Wert>
NEXTAUTH_URL=http://localhost:3000
BOT_API_SECRET=<gleicher Wert>
BOT_API_URL=http://localhost:4001
DISCORD_GUILD_ID=<gleicher Wert>
OWNER_DISCORD_ID=<gleicher Wert>
```

### 4. Dependencies installieren

```bash
npm ci          # produktiv, exakte Versionen
# oder:
npm install     # bei Erst-Setup
```

### 5. Datenbank initialisieren

```bash
cd packages/db && npx prisma db push && cd ../..
```

Das legt `packages/db/prisma/dev.db` an und erzeugt den Prisma-Client.

### 6. Slash-Commands bei Discord registrieren

```bash
npm --workspace bot run register
```

Einmal nötig und immer, wenn Commands hinzukommen oder sich ihre Signatur ändert.

### 7. Bot und Dashboard starten

In zwei Terminals:

```bash
# Terminal 1 — Bot
npm run bot:dev

# Terminal 2 — Web-Dashboard
npm run web:dev
```

Dashboard: http://localhost:3000

## Production-Deploy (z. B. auf VPS)

```bash
git clone https://github.com/ChristophBentz/discord-bot-final.git
cd discord-bot-final
bash scripts/setup.sh        # → "Online" wählen, Domain eintippen
                             #   Skript installiert Caddy, holt HTTPS-Zertifikat,
                             #   baut TypeScript, startet via pm2
```

Im Discord Developer Portal **vor** dem Setup die Redirect-URL eintragen:
`https://deine-domain.de/api/auth/callback/discord` (das Skript zeigt dir das auch nochmal).

Updates ausrollen:
```bash
git pull
npm ci                                              # bei package.json-Änderungen
cd packages/db && npx prisma db push && cd ../..   # bei Schema-Änderungen
npm --workspace bot run build
npm --workspace web run build
npm --workspace bot run register                    # bei neuen Commands
pm2 restart all                                     # Bot + Web auf einmal
```

pm2-Services sind in `ecosystem.config.cjs` definiert — `pm2 start ecosystem.config.cjs`
startet Bot und Web zusammen.

## Berechtigungen

Login ins Dashboard ist erlaubt für:
- `OWNER_DISCORD_ID` (Notfall-Zugang, optional)
- Server-Owner
- User mit Discord-Permission `Administrator`, `Kick Members`, `Ban Members` oder `Moderate Members`

Member-Rollen werden vom Bot bei `guildMemberUpdate` synchronisiert.

## Nützliche Scripts

| Script | Beschreibung |
| --- | --- |
| `npm run bot:dev` | Bot im Watch-Mode starten (tsx) |
| `npm run web:dev` | Next.js Dev-Server |
| `npm run db:studio` | Prisma Studio (DB-Browser) öffnen |
| `npm --workspace bot run build` | Bot kompilieren |
| `npm --workspace bot run start` | Production-Bot starten |
| `npm --workspace bot run register` | Slash-Commands bei Discord registrieren |

## Hinweise

- **Native Module:** `mediaplex` (Opus/Sodium) und `@snazzah/davey` (DAVE-Encryption) sind Native-Bindings — `npm ci` muss auf der Zielarchitektur ausgeführt werden (also nicht von Mac auf Linux mitnehmen).
- **YouTube-Bot-Detection:** Der Music-Player nutzt yt-dlp mit `player_client=web_safari,android,mweb,tv` als Bypass. Falls YouTube wieder blockt, ggf. yt-dlp aktualisieren oder Player-Client-Reihenfolge anpassen.
- **Single-Guild:** Das Projekt ist explizit für **einen** Discord-Server gebaut (`DISCORD_GUILD_ID`). Multi-Guild-Support müsste das Schema umstellen (jede Tabelle bräuchte eine `guildId`-Spalte).
