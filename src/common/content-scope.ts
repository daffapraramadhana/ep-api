// apps/api/src/common/content-scope.ts
import { Prisma, SessionKind } from '@prisma/client';

/**
 * Jenis sesi yang dihitung ke target harian, streak, dan aktivitas
 * monitoring. REPLAY sengaja tidak (ulangan). Satu sumber — jangan tulis
 * ulang daftar ini di query.
 */
export const COUNTED_SESSION_KINDS: SessionKind[] = ['DAILY', 'SPEAKING', 'MODULE'];

/**
 * Lesson "jalur harian" = lesson yang TIDAK ditautkan ke bab modul. Dipakai
 * di semua query lesson untuk Perjalanan, perakitan sesi harian/berbicara,
 * penguatan, dan hitungan "materi selesai".
 */
export const PATH_LESSON: Prisma.LessonWhereInput = { moduleChapter: { is: null } };
