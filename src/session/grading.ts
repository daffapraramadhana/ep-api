// Fungsi murni: tanpa Nest/Prisma. Menilai satu jawaban terhadap satu item.
export interface GradableItem {
  type: string;
  answerKey: string;
  acceptedAnswers: string[];
  /** UCAPAN saja: ambang kecocokan 0-100, default 70. */
  threshold?: number;
}

const normal = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

/**
 * Normalisasi ucapan: huruf kecil, buang apostrof (STT sering menghilangkan-
 * nya: "it's" ↔ "its" dihitung sama), tanda baca lain → spasi, pecah per kata.
 */
function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Rasio kata referensi yang muncul di transcript (bag-per-kata, urutan
 * diabaikan). Filler ("uh", "um", pengulangan) dan kata tambahan tidak
 * menurunkan skor — cocok untuk drill membaca.
 * ponytail: skor presisi & urutan kata bisa ditambahkan bila laporan pilot
 * menunjukkan false-positive; cukup ubah fungsi ini, ambang tetap di config.
 */
export function wordOverlapRatio(reference: string, transcript: string): number {
  const ref = words(reference);
  const trans = words(transcript);
  if (ref.length === 0) return 0;
  const bag = new Map<string, number>();
  for (const w of trans) bag.set(w, (bag.get(w) ?? 0) + 1);
  let hit = 0;
  for (const w of ref) {
    const n = bag.get(w) ?? 0;
    if (n > 0) {
      hit++;
      bag.set(w, n - 1);
    }
  }
  return hit / ref.length;
}

export function gradeAnswer(item: GradableItem, answer: string): boolean {
  switch (item.type) {
    case 'PILIHAN_GANDA':
      return normal(answer) === normal(item.answerKey);
    case 'ISIAN':
      return item.acceptedAnswers.map(normal).includes(normal(answer));
    case 'SUSUN_KALIMAT':
      return normal(answer) === normal(item.answerKey);
    case 'UCAPAN':
      return wordOverlapRatio(item.answerKey, answer) * 100 >= (item.threshold ?? 70);
    default:
      return false;
  }
}
