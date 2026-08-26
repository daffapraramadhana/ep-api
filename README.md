# ep-api — Fluen (Backend)

API untuk platform belajar bahasa Inggris harian karyawan. **Seluruh logika bisnis hidup di sini** — auth + undangan, importer soal (xlsx) & karyawan (CSV), media, CRUD konten, engine sesi harian, penilaian 3 tipe soal, XP/streak/review queue, agregasi journey & progress. Frontend ([ep-web](https://github.com/daffapraramadhana/ep-web)) adalah lapisan tampilan tipis di atas API ini.

Dokumen produk & spesifikasi lengkap: repo [ep-workflow](https://github.com/daffapraramadhana/ep-workflow).

**Stack:** NestJS 11 · Prisma 6 · PostgreSQL 16+ · JWT.

## Prasyarat

- Node 20+
- PostgreSQL lokal (tanpa Docker untuk pengembangan harian):

```bash
createuser -s app
createdb -O app english_app
```

## Setup

```bash
npm install
cp .env.example .env          # lalu sesuaikan
npx prisma migrate dev        # terapkan migrasi
npx prisma db seed            # idempoten: config XP + akun admin dari env
npm run seed:demo             # opsional: 1 modul demo "Daily Conversation" (4 lesson/32 soal + audio TTS), LIVE
npm run start:dev             # http://localhost:3001
```

## Environment

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Koneksi Postgres, mis. `postgresql://app:app@localhost:5432/english_app` |
| `JWT_SECRET` | Secret penandatangan token |
| `WEB_ORIGIN` | Origin CORS frontend, mis. `http://localhost:3000` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Akun admin hasil seed |
| `STORAGE_DRIVER` | `local` (default) atau `s3` |
| `STORAGE_DIR` | Driver local: folder media (default `./storage`) |
| `S3_*` | Wajib saat `STORAGE_DRIVER=s3` (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_URL`) |
| `PORT` | Default `3001` |

App **fail-fast saat boot** (`src/env-check.ts`) bila variabel wajib kosong — lebih baik crash bersuara daripada CORS diam-diam terbuka.

## Test

```bash
npm run test        # unit — tanpa layanan eksternal
npm run test:e2e    # e2e — BUTUH Postgres hidup + termigrasi + ter-seed
```

E2e menguji HTTP nyata (auth, import, sesi, grading, streak) terhadap Prisma sungguhan, bukan mock.

## Struktur modul

```
src/
├── auth/       login JWT, guard role, undangan
├── users/      import CSV karyawan
├── content/    importer soal, CRUD lesson/item, lapor soal
├── storage/    driver media local/S3
├── media/      upload & serve media
├── session/    perakitan sesi, penilaian, XP, review queue
├── me/         profil, streak + freeze, summary
├── journey/    peta belajar per topic
└── progress/   agregasi skill/kalender/total
```

## Catatan penting

- **`prisma` sengaja di `dependencies`, jangan dipindah ke devDependencies** — image produksi menjalankan `prisma migrate deploy` saat boot (`docker-entrypoint.sh`) dari instalasi `--omit=dev`.
- Seed produksi berjalan terkompilasi (`dist/prisma/seed.js`) di setiap boot container — idempoten.
- Deploy: lihat runbook `infra/README.md` di repo ep-workflow.
