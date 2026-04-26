#!/bin/sh
set -e

case "$1" in
  web)
    echo "[entrypoint] Running Prisma migrations..."
    npx prisma migrate deploy
    echo "[entrypoint] Starting Next.js..."
    exec node_modules/.bin/next start -p "${PORT:-3000}"
    ;;
  worker)
    echo "[entrypoint] Starting analysis worker..."
    exec npx tsx src/worker/analysis-worker.ts
    ;;
  migrate)
    echo "[entrypoint] Running Prisma migrations..."
    exec npx prisma migrate deploy
    ;;
  *)
    exec "$@"
    ;;
esac
