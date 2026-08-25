# English App — API

Backend for the Daily English Learning Platform: a NestJS + Prisma
(PostgreSQL) service that owns all business logic (grading, XP, spaced
review, content import/CRUD, auth). `apps/web` is deliberately a thin
view layer on top of this API — see the workspace spec for the full
product/architecture rationale:
`../../docs/superpowers/specs/2026-08-25-english-app-foundation-design.md`
(if this checkout doesn't have that path, it lives in the sibling
workspace repo, `english-app/docs/superpowers/specs/`). The implementation
plan and per-task reports live under
`../../.superpowers/sdd/2026-08-25-fase-1-fondasi-dan-admin/` in that
same workspace repo.

## Environment setup

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string, e.g. `postgresql://app:app@localhost:5432/english_app`. |
| `JWT_SECRET` | Signs auth tokens. Any long random string locally; a real secret in production. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded admin login (see `prisma/seed.ts`). |
| `STORAGE_DRIVER` | `local` (default) or `s3`. |
| `STORAGE_DIR` | Local driver only — where uploaded media is written/read (default `./storage`). |
| `S3_*` (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_URL`, optional `S3_REGION`) | Required only when `STORAGE_DRIVER=s3`. The app fails fast at boot (`src/env-check.ts`) if any are missing while the S3 driver is selected. |
| `WEB_ORIGIN` | Allowed CORS origin for the web app, e.g. `http://localhost:3000`. |
| `PORT` | HTTP port (default `3001`). |

`DATABASE_URL`, `JWT_SECRET`, and `WEB_ORIGIN` are always required —
the app exits immediately with a clear message listing what's missing
if any of them (or the S3 set, when applicable) aren't set. This is
deliberate: better a loud crash at boot than CORS silently failing open
or an obscure S3 SDK error on the first upload.

## Local Postgres

A local Postgres instance is required (no Docker needed for day-to-day
development). Create the role and database `DATABASE_URL` above points
at, e.g.:

```bash
createuser -s app                 # or: psql -c "CREATE ROLE app LOGIN PASSWORD 'app' SUPERUSER;"
createdb -O app english_app
```

Adjust to match whatever `DATABASE_URL` you put in `.env`.

## Install, migrate, seed

```bash
npm install
npx prisma migrate dev   # applies migrations, prompts for a name on schema changes
npx prisma db seed       # idempotent: config rows + ADMIN_EMAIL/ADMIN_PASSWORD admin user
```

`prisma db seed` runs `prisma/seed.ts` via `ts-node`, wired through
`prisma.config.ts`. In production the same seed logic runs compiled
(`dist/prisma/seed.js`, no ts-node) from `docker-entrypoint.sh` on every
container boot — see `../../infra/README.md` §3.

## Run

```bash
npm run start:dev   # watch mode, local development
npm run start       # single run, no watch
npm run build        # nest build → dist/
npm run start:prod   # node dist/src/main.js — what the Docker image runs
```

## Test

```bash
npm run test         # unit tests (jest, no external services)
npm run test:e2e     # e2e tests (supertest against a real Nest app instance)
npm run test:cov     # unit tests with coverage
```

**`test:e2e` needs a live Postgres** matching `.env`'s `DATABASE_URL`,
migrated and seeded (see above) — it exercises real HTTP requests
(auth, content CRUD, media upload, imports) against real Prisma
queries, not mocks.

## A note on `prisma` as a runtime dependency

`prisma` (the CLI package) is listed in `dependencies`, not
`devDependencies` — **do not move it to devDependencies.** The
production Docker image's entrypoint runs `npx prisma migrate deploy`
at container boot to apply pending migrations before the server starts
(see `docker-entrypoint.sh`, `Dockerfile`'s `prod-deps` stage which
installs with `--omit=dev`). If `prisma` were a devDependency it would
be absent from that stage and the container would fail to boot.

## Deployment

This service is deployed via the workspace's `infra/` repo
(`docker-compose.prod.yml` + `Dockerfile` + `docker-entrypoint.sh`) —
see `../../infra/README.md` for the full runbook (env contract, deploy
steps, backups, JWT rotation, known limitations).
