// apps/api/prisma/seed-tts-entries.ts
import { MODULES } from './seed-demo';
import { LESSONS } from './seed-complaints';
import { def as eftl1 } from './seed-eftl-1';

/**
 * Teks TTS per soal dari semua seeder (kode lesson + urutan item = indeks + 1,
 * sama dengan loop seeder). Dipakai `tts:adopt-seed-audio` untuk memindahkan
 * audio `say`/senyap lama ke Item.ttsText.
 */
export function seedTtsEntries(): {
  code: string;
  order: number;
  tts: string;
}[] {
  const lessons = [
    ...MODULES.flatMap((m) => m.lessons),
    ...LESSONS,
    ...eftl1.chapters,
  ];
  return lessons.flatMap((l) =>
    l.items.flatMap((it, i) =>
      it.tts ? [{ code: l.code, order: i + 1, tts: it.tts }] : [],
    ),
  );
}
