#!/bin/sh
set -e

# Apply pending migrations before the API starts serving traffic.
npx prisma migrate deploy

# Seed is idempotent (upserts config + admin user), so running it on every
# boot is safe — this is what actually bootstraps a fresh deploy (first-run
# migrate deploy alone creates empty tables; nothing else creates the admin
# login). Runs the compiled JS directly (not `prisma db seed`, which needs
# ts-node + prisma.config.ts — dev-only, not shipped in this image).
node dist/prisma/seed.js

exec node dist/src/main.js
