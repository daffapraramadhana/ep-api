// apps/api/src/common/content-scope.ts
import { Prisma, SessionKind } from '@prisma/client';

/**
 * Jenis sesi yang dihitung ke target harian, streak, dan aktivitas
 * monitoring. REPLAY sengaja tidak (ulangan). Satu sumber — jangan tulis
 * ulang daftar ini di query.
 */
export const COUNTED_SESSION_KINDS: SessionKind[] = [
  'DAILY',
  'SPEAKING',
  'MODULE',
];

/**
 * Lesson "jalur" (Perjalanan, sesi harian/berbicara, penguatan, hitungan
 * "materi selesai", monitoring) = lesson yang punya ≥1 item LIVE; selalu
 * dipakai bersama `status: 'LIVE'`. Sejak spec satu-perjalanan semua modul
 * LIVE ikut jalur (kuis babnya jadi unit modul) — tidak ada lagi pengecualian
 * per-modul. Urutan langkah: `groupPath` (path-order.ts).
 */
export const PATH_LESSON: Prisma.LessonWhereInput = {
  items: { some: { status: 'LIVE' } },
};
