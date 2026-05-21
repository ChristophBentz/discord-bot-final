#!/usr/bin/env bash
#
# Interaktives Setup-Skript für Discord Bot Final.
# Frag die nötigen Discord-Credentials ab, erzeugt Secrets, schreibt alle env-Files,
# installiert Dependencies, baut die DB und registriert Slash-Commands.
#
# Aufruf nach `git clone`:
#   bash scripts/setup.sh
#

set -euo pipefail

# ─── Farben ─────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  C_BLUE=$'\033[1;34m'; C_GREEN=$'\033[1;32m'; C_YELLOW=$'\033[1;33m'
  C_RED=$'\033[1;31m'; C_DIM=$'\033[2m'; C_RESET=$'\033[0m'
else
  C_BLUE=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_DIM=""; C_RESET=""
fi

step()   { echo; echo "${C_BLUE}▸ $*${C_RESET}"; }
ok()     { echo "${C_GREEN}  ✓ $*${C_RESET}"; }
warn()   { echo "${C_YELLOW}  ! $*${C_RESET}"; }
err()    { echo "${C_RED}  ✗ $*${C_RESET}" >&2; }
dim()    { echo "${C_DIM}  $*${C_RESET}"; }

# ─── Working Directory: Projekt-Root ─────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cat <<EOF

${C_BLUE}╭──────────────────────────────────────────────╮
│   Discord Bot Final — Interaktives Setup     │
╰──────────────────────────────────────────────╯${C_RESET}

Dieses Skript führt dich durch das komplette Setup:
  1. Discord-Credentials abfragen
  2. Secrets generieren (NEXTAUTH_SECRET, BOT_API_SECRET)
  3. Env-Files schreiben (.env, packages/db/.env, web/.env.local)
  4. npm-Dependencies installieren
  5. Datenbank initialisieren (Prisma db push)
  6. Slash-Commands bei Discord registrieren

EOF

# ─── Prerequisites prüfen ────────────────────────────────────────────────────
step "Prüfe Voraussetzungen"

if ! command -v node >/dev/null 2>&1; then
  err "Node.js ist nicht installiert. Installier mit:"
  echo "    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
  echo "    sudo apt install -y nodejs"
  exit 1
fi
NODE_MAJOR=$(node --version | sed -E 's/v([0-9]+).*/\1/')
if (( NODE_MAJOR < 20 )); then
  err "Node.js v$(node --version) ist zu alt. Mindestens v20 benötigt."
  exit 1
fi
ok "Node.js $(node --version)"

if ! command -v npm >/dev/null 2>&1; then
  err "npm fehlt."
  exit 1
fi
ok "npm $(npm --version)"

if ! command -v openssl >/dev/null 2>&1; then
  err "openssl fehlt — wird zum Generieren von Secrets gebraucht."
  exit 1
fi
ok "openssl"

# ─── Discord-Credentials abfragen ────────────────────────────────────────────
step "Discord-Credentials"
cat <<EOF

  ${C_DIM}Falls du noch keine hast, anlegen unter:
    https://discord.com/developers/applications

  Was du brauchst:
    • Bot-Token         (Tab "Bot" → "Reset Token" → kopieren)
    • Application-ID    (Tab "General Information" → Application ID)
    • Client-Secret     (Tab "OAuth2" → "Reset Secret")
    • Guild-ID          (Discord: Rechtsklick auf Server → ID kopieren)
                         Entwicklermodus muss in Discord-Einstellungen an sein.
    • Deine User-ID     (Discord: Rechtsklick auf dich → ID kopieren) — optional${C_RESET}

EOF

prompt_required() {
  local var_name=$1
  local label=$2
  local validation=$3
  local value=""
  while [[ -z "$value" ]]; do
    read -r -p "  ${label}: " value
    if [[ -z "$value" ]]; then
      warn "Pflichtfeld, bitte ausfüllen."
      continue
    fi
    if [[ -n "$validation" && ! "$value" =~ $validation ]]; then
      warn "Format passt nicht (erwartet: $validation). Nochmal."
      value=""
    fi
  done
  printf -v "$var_name" '%s' "$value"
}

prompt_optional() {
  local var_name=$1
  local label=$2
  read -r -p "  ${label}: " value
  printf -v "$var_name" '%s' "$value"
}

prompt_required DISCORD_TOKEN     "DISCORD_TOKEN      " ""
prompt_required DISCORD_CLIENT_ID "DISCORD_CLIENT_ID  " "^[0-9]{17,20}$"
prompt_required DISCORD_CLIENT_SECRET "DISCORD_CLIENT_SECRET" ""
prompt_required DISCORD_GUILD_ID  "DISCORD_GUILD_ID   " "^[0-9]{17,20}$"
prompt_optional OWNER_DISCORD_ID  "OWNER_DISCORD_ID   (optional)"

# NEXTAUTH_URL — Default localhost, optional anpassbar
read -r -p "  NEXTAUTH_URL       [http://localhost:3000]: " NEXTAUTH_URL
NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"

# Bot-API Port — Default 4001
read -r -p "  BOT_API_PORT       [4001]: " BOT_API_PORT
BOT_API_PORT="${BOT_API_PORT:-4001}"

# ─── Secrets generieren ──────────────────────────────────────────────────────
step "Generiere Secrets"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
BOT_API_SECRET=$(openssl rand -hex 32)
ok "NEXTAUTH_SECRET (base64, 32 bytes)"
ok "BOT_API_SECRET  (hex, 32 bytes)"

# ─── Env-Files schreiben ─────────────────────────────────────────────────────
step "Schreibe Env-Files"

confirm_overwrite() {
  local file=$1
  if [[ -f "$file" ]]; then
    read -r -p "  ${C_YELLOW}!${C_RESET} ${file} existiert bereits. Überschreiben? [y/N] " ans
    [[ "${ans,,}" == "y" || "${ans,,}" == "yes" ]]
    return $?
  fi
  return 0
}

# Root .env
if confirm_overwrite ".env"; then
  cat > .env <<EOF
# Auto-generiert von scripts/setup.sh

DISCORD_TOKEN=$DISCORD_TOKEN
DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET
DISCORD_GUILD_ID=$DISCORD_GUILD_ID

NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=$NEXTAUTH_URL

OWNER_DISCORD_ID=$OWNER_DISCORD_ID

BOT_API_SECRET=$BOT_API_SECRET
BOT_API_URL=http://localhost:$BOT_API_PORT
BOT_API_PORT=$BOT_API_PORT

DATABASE_URL="file:./dev.db"
EOF
  ok ".env geschrieben"
else
  warn ".env unverändert gelassen"
fi

# DB .env
mkdir -p packages/db
if confirm_overwrite "packages/db/.env"; then
  cat > packages/db/.env <<EOF
# Auto-generiert von scripts/setup.sh
DATABASE_URL="file:./dev.db"
EOF
  ok "packages/db/.env geschrieben"
else
  warn "packages/db/.env unverändert gelassen"
fi

# Web .env.local
mkdir -p web
if confirm_overwrite "web/.env.local"; then
  cat > web/.env.local <<EOF
# Auto-generiert von scripts/setup.sh

DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET
DISCORD_GUILD_ID=$DISCORD_GUILD_ID

NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=$NEXTAUTH_URL

OWNER_DISCORD_ID=$OWNER_DISCORD_ID

BOT_API_SECRET=$BOT_API_SECRET
BOT_API_URL=http://localhost:$BOT_API_PORT
EOF
  ok "web/.env.local geschrieben"
else
  warn "web/.env.local unverändert gelassen"
fi

# ─── npm-Dependencies ────────────────────────────────────────────────────────
step "Installiere npm-Dependencies (npm ci) — dauert 1-3 Min"

if [[ -f package-lock.json ]]; then
  npm ci
else
  warn "package-lock.json fehlt → nutze npm install"
  npm install
fi
ok "Dependencies installiert"

# ─── Datenbank initialisieren ────────────────────────────────────────────────
step "Initialisiere Datenbank (Prisma db push)"
(cd packages/db && npx prisma db push --skip-generate >/dev/null 2>&1) || {
  err "prisma db push fehlgeschlagen"
  (cd packages/db && npx prisma db push)
  exit 1
}
ok "DB-Schema synchronisiert"
(cd packages/db && npx prisma generate >/dev/null 2>&1)
ok "Prisma-Client generiert"

# ─── Slash-Commands registrieren ─────────────────────────────────────────────
step "Registriere Slash-Commands bei Discord"
if npm --workspace bot run register 2>&1 | tail -5; then
  ok "Slash-Commands registriert"
else
  err "Slash-Command-Registrierung fehlgeschlagen — Token/Client-ID/Guild-ID korrekt?"
  exit 1
fi

# ─── Fertig ──────────────────────────────────────────────────────────────────
cat <<EOF

${C_GREEN}╭──────────────────────────────────────────────╮
│   ✓ Setup fertig!                            │
╰──────────────────────────────────────────────╯${C_RESET}

Jetzt starten:

  ${C_BLUE}Development${C_RESET}  (Hot-Reload, zwei Terminals)
    Terminal 1:  npm run bot:dev
    Terminal 2:  npm run web:dev
    Dashboard:   $NEXTAUTH_URL

  ${C_BLUE}Production${C_RESET}  (mit pm2, einmalig: sudo npm i -g pm2)
    npm --workspace bot run build
    npm --workspace web run build
    pm2 start "npm --workspace bot run start"  --name discord-bot
    pm2 start "npm --workspace web run start"  --name discord-web --cwd web
    pm2 save && pm2 startup

${C_DIM}Bei Problemen: git pull && bash scripts/setup.sh${C_RESET}

EOF
