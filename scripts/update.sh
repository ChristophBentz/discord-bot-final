#!/usr/bin/env bash
#
# Self-Update für Native-Deployments (pm2).
# Wird vom Dashboard-Button getriggert ODER kann manuell gestartet werden:
#   bash scripts/update.sh
#
# Schreibt Fortschritt nach $STATUS_FILE als JSON — vom Bot-API-Endpoint gelesen.
#
# Sicherheit:
#  - DB wird vorher gesichert (.bak)
#  - bei Build-Fehler: git reset --hard auf vorherigen Stand + DB-Restore
#  - Lock-File verhindert parallele Runs

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STATUS_FILE="${BOT_UPDATE_STATUS_FILE:-$ROOT/.update-status.json}"
LOCK_FILE="$ROOT/.update.lock"
DB_FILE="$ROOT/packages/db/prisma/dev.db"

# ─── JSON-Status-Helfer ─────────────────────────────────────────────────────
LOG_LINES=()

write_status() {
  local step="$1"
  local error="${2:-}"
  local finished="${3:-false}"
  local logs_json
  logs_json=$(printf '%s\n' "${LOG_LINES[@]}" | jq -R . | jq -s .)
  jq -n \
    --arg step "$step" \
    --arg startedAt "$STARTED_AT" \
    --arg finishedAt "$( [ "$finished" = "true" ] && date -u +%FT%TZ || echo "" )" \
    --arg error "$error" \
    --argjson logs "$logs_json" \
    '{ step:$step, startedAt:$startedAt, finishedAt:(if $finishedAt=="" then null else $finishedAt end), error:(if $error=="" then null else $error end), log:$logs }' \
    > "$STATUS_FILE"
}

log() {
  local msg="$*"
  LOG_LINES+=("$(date +%H:%M:%S) $msg")
  echo "$msg"
}

step() {
  local name="$1"
  log "▸ $name"
  CURRENT_STEP="$name"
  write_status "$CURRENT_STEP"
}

fail() {
  local msg="$1"
  log "✗ $msg"
  write_status "error" "$msg" true
  rm -f "$LOCK_FILE"
  exit 1
}

# ─── Voraussetzungen ────────────────────────────────────────────────────────
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq nicht installiert — apt install jq (oder brew install jq)" >&2
  exit 1
fi

# Lock-File
if [ -e "$LOCK_FILE" ]; then
  echo "ERROR: Update läuft bereits (Lock-File $LOCK_FILE)" >&2
  exit 1
fi
touch "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

STARTED_AT="$(date -u +%FT%TZ)"
CURRENT_STEP="start"
write_status "$CURRENT_STEP"

# Erinnere alten Git-SHA für Rollback
OLD_SHA="$(git rev-parse HEAD 2>/dev/null || echo "")"
[ -z "$OLD_SHA" ] && fail "Kein Git-Repo — Update nicht möglich"

# ─── 1. DB-Backup ───────────────────────────────────────────────────────────
step "backup"
if [ -f "$DB_FILE" ]; then
  cp "$DB_FILE" "${DB_FILE}.bak" || fail "DB-Backup fehlgeschlagen"
  log "DB gesichert nach ${DB_FILE}.bak"
fi

# ─── 2. git pull ────────────────────────────────────────────────────────────
step "pull"
GIT_OUT=$(git pull 2>&1) || {
  log "$GIT_OUT"
  fail "git pull fehlgeschlagen"
}
log "$GIT_OUT"
NEW_SHA="$(git rev-parse HEAD)"
if [ "$OLD_SHA" = "$NEW_SHA" ]; then
  log "Schon auf neuestem Stand — nichts zu tun."
  write_status "done" "" true
  rm -f "$LOCK_FILE"
  exit 0
fi
log "Update: $OLD_SHA → $NEW_SHA"

# ─── 3. Dependencies ────────────────────────────────────────────────────────
step "install"
INSTALL_OUT=$(npm ci 2>&1) || {
  log "$INSTALL_OUT" | tail -30
  git reset --hard "$OLD_SHA"
  fail "npm ci fehlgeschlagen — git zurückgesetzt"
}
log "Dependencies installiert."

# ─── 4. Migrate ─────────────────────────────────────────────────────────────
step "migrate"
MIG_OUT=$(cd packages/db && npx prisma migrate deploy 2>&1) || {
  log "$MIG_OUT"
  [ -f "${DB_FILE}.bak" ] && cp "${DB_FILE}.bak" "$DB_FILE"
  git reset --hard "$OLD_SHA"
  fail "Prisma-Migration fehlgeschlagen — git + DB zurückgesetzt"
}
log "DB-Migrationen angewendet."

# ─── 5. Build ───────────────────────────────────────────────────────────────
step "build"
BUILD_OUT=$(npm run build 2>&1) || {
  log "$BUILD_OUT" | tail -30
  [ -f "${DB_FILE}.bak" ] && cp "${DB_FILE}.bak" "$DB_FILE"
  git reset --hard "$OLD_SHA"
  fail "Build fehlgeschlagen — git + DB zurückgesetzt"
}
log "Build OK."

# ─── 6. Slash-Commands registrieren (idempotent, billig) ────────────────────
step "register"
REG_OUT=$(npm --workspace bot run register 2>&1) || log "Warn: register fehlgeschlagen — $REG_OUT"

# ─── 7. PM2-Restart ─────────────────────────────────────────────────────────
step "restart"
log "PM2 restart läuft — Bot/Web werden gleich neu gestartet."
write_status "restart"
# Erfolgreich markieren BEVOR wir den eigenen Parent-Prozess killen
write_status "done" "" true

# Wichtig: pm2 restart killt den Bot, der dieses Skript per spawn() gestartet hat.
# Skript ist detached (über setsid im Caller), läuft also weiter.
pm2 restart all >/dev/null 2>&1 || {
  log "pm2 restart fehlgeschlagen — bitte manuell: pm2 restart all"
}

rm -f "$LOCK_FILE"
exit 0
