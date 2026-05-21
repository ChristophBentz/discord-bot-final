# Discord Bot Final

Discord-Bot mit Web-Dashboard zum Konfigurieren — gebaut für einen einzelnen Server.

## Stack

- **Bot:** Node.js + TypeScript, [discord.js v14](https://discord.js.org)
- **Dashboard:** Next.js 15 (App Router), Tailwind, NextAuth.js mit Discord-OAuth
- **Datenbank:** SQLite via Prisma (später auf Postgres migrierbar)
- **Monorepo:** npm workspaces (`bot/`, `web/`, `packages/db/`)

## Projektstruktur

```
.
├── bot/                # Discord-Bot
├── web/                # Next.js-Dashboard
├── packages/db/        # Prisma-Schema + Client (geteilt)
├── package.json        # Workspace-Root
└── .env.example        # Vorlage für lokale Secrets
```

## Setup

### 1. Discord-Application anlegen

1. Auf https://discord.com/developers/applications → **New Application**.
2. Im Tab **Bot**: Token kopieren → `DISCORD_TOKEN`.
3. **Privileged Gateway Intents** aktivieren: `Server Members Intent`, `Message Content Intent`.
4. Im Tab **OAuth2** unter **Redirects** hinzufügen:
   `http://localhost:3000/api/auth/callback/discord`
5. Client-ID und Client-Secret kopieren → `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`.

### 2. Bot einladen

OAuth2-URL-Generator → Scopes `bot` + `applications.commands` wählen, gewünschte Bot-Permissions setzen (für den Anfang reicht `Administrator`), URL öffnen und auf deinen Server einladen.

### 3. .env ausfüllen

```bash
cp .env.example .env
```

Trage `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` (deine Server-ID), `DISCORD_CLIENT_SECRET`, `NEXTAUTH_SECRET` (mit `openssl rand -base64 32`) und `OWNER_DISCORD_ID` (deine eigene User-ID) ein.

### 4. Dependencies installieren

```bash
npm install
```

### 5. Datenbank initialisieren

```bash
npm run db:migrate
```

Das legt `packages/db/prisma/dev.db` an und erzeugt den Prisma-Client.

### 6. Slash-Commands bei Discord registrieren

```bash
cd bot && npm run register
```

Nur einmal nötig — und immer, wenn Commands hinzukommen oder sich ihre Signatur ändert.

### 7. Bot und Dashboard starten

In zwei Terminals:

```bash
# Terminal 1 — Bot
npm run bot:dev

# Terminal 2 — Web-Dashboard
npm run web:dev
```

Dashboard: http://localhost:3000

## Nützliche Scripts

| Script | Beschreibung |
| --- | --- |
| `npm run bot:dev` | Bot im Watch-Mode starten |
| `npm run web:dev` | Next.js-Dev-Server |
| `npm run db:migrate` | Prisma-Migration anwenden |
| `npm run db:studio` | Prisma Studio (DB-Browser) öffnen |

## Geplante Features

- [x] Projektgerüst
- [ ] Moderation: Kick, Ban, Mute, Warn
- [ ] Welcome/Leave + Auto-Rollen
- [ ] Leveling / XP
- [ ] Tickets
- [ ] Custom Commands
- [ ] Audit-Log
- [ ] Musik (zuletzt — am komplexesten)
