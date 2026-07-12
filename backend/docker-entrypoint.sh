#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations…"
npx prisma migrate deploy

echo "[entrypoint] Running seed (admin, invite code, demo stream)…"
node dist/prisma/seed.js || echo "[entrypoint] seed skipped (may already exist)"

echo "[entrypoint] Starting backend…"
exec "$@"
