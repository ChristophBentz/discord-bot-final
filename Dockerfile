# syntax=docker/dockerfile:1.7

# ─── Build-Stage ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Build-Tools für native Module (better-sqlite3, mediaplex etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Lockfile + workspace package.jsons zuerst kopieren — bessere Cache-Nutzung
COPY package.json package-lock.json* ./
COPY bot/package.json ./bot/
COPY web/package.json ./web/
COPY packages/db/package.json ./packages/db/

RUN npm ci

# Rest des Codes
COPY . .

# DB-Client generieren + alles bauen (db → bot → web)
RUN npm run build

# Production-Dependencies in separatem Layer
RUN npm prune --omit=dev


# ─── Runtime-Stage ──────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

WORKDIR /app

# Runtime-Deps: ffmpeg + yt-dlp für Musik-Feature, openssl für Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3-pip openssl ca-certificates \
    && pip3 install --break-system-packages --no-cache-dir yt-dlp \
    && rm -rf /var/lib/apt/lists/*

# PM2 global für Process-Management (Bot + Web parallel)
RUN npm install -g pm2

# Built Artifacts kopieren
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/bot/dist ./bot/dist
COPY --from=builder /app/bot/package.json ./bot/
COPY --from=builder /app/web/.next ./web/.next
COPY --from=builder /app/web/public ./web/public
COPY --from=builder /app/web/package.json ./web/
COPY --from=builder /app/web/next.config.* ./web/
COPY ecosystem.config.cjs package.json ./

# DB-Volume liegt in /data — DATABASE_URL muss darauf zeigen
RUN mkdir -p /data
ENV DATABASE_URL=file:/data/dev.db
ENV NODE_ENV=production

# Bot-API + Next.js Web
EXPOSE 3000 4001

# Entrypoint: Migrations applien, dann PM2 starten
RUN printf '#!/bin/sh\nset -e\ncd /app/packages/db && npx prisma migrate deploy\ncd /app && exec pm2-runtime start ecosystem.config.cjs\n' > /entrypoint.sh \
    && chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
