# Features

Jedes Feature lebt in einem eigenen Ordner. Konvention:

```
features/<name>/
├── commands/   # Slash-Commands dieses Features (werden automatisch geladen)
├── events/     # Event-Handler dieses Features (werden automatisch geladen)
└── service.ts  # interne Business-Logik (DB-Zugriffe, Helper)
```

Geplante Features:

- `moderation/` — Kick, Ban, Mute (Timeout), Warn
- `welcome/` — Welcome-/Leave-Messages + Auto-Rollen
- `leveling/` — XP-System, Rank-Card, Leaderboard, Level-Rewards
- `tickets/` — Support-Ticket-System mit Buttons
- `customCommands/` — vom Dashboard definierbare Text-Commands
- `music/` — Voice + Musik-Queue (zuletzt zu implementieren — am komplexesten)
- `auditLog/` — vollständiges Logging in einen konfigurierbaren Channel

Aktuell sind die Ordner leer und werden Feature für Feature gefüllt.
