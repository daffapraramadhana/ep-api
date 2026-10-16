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
 * Lesson "jalur harian" = lesson yang TIDAK menjadi kuis bab modul LIVE,
 * kecuali modulnya ditandai `showInPath` (mis. modul EFTL: kuisnya juga
 * soal Perjalanan — progres sama, tanpa duplikat).
 * Lesson yang ditautkan ke modul DRAFT/RETIRED tetap di jalur — menyusun
 * modul tidak boleh diam-diam menarik konten dari Perjalanan karyawan.
 * Dipakai di semua query lesson untuk Perjalanan, perakitan sesi
 * harian/berbicara, penguatan, dan hitungan "materi selesai".
 */
export const PATH_LESSON: Prisma.LessonWhereInput = {
  OR: [
    { moduleChapter: { is: null } },
    { moduleChapter: { is: { module: { status: { not: 'LIVE' } } } } },
    { moduleChapter: { is: { module: { showInPath: true } } } },
  ],
};
