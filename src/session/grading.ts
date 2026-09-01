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
 * Rasio kecocokan kata berurutan (LCS per-kata ÷ jumlah kata referensi).
 * Menghitung kata yang muncul DAN tetap dalam urutan relatif yang sama
 * terhadap kalimat referensi — membaca terbalik/acak dihukum. Filler ("uh",
 * "um", pengulangan) dan kata tambahan tetap gratis: LCS melewati token yang
 * tidak cocok, tidak menurunkan skor. Ambang tetap di config.
 */
export function wordOverlapRatio(reference: string, transcript: string): number {
  const ref = words(reference);
  const trans = words(transcript);
  if (ref.length === 0) return 0;
  const n = ref.length;
  const m = trans.length;
  // DP LCS word-level. Transcript pendek (satu kalimat) — O(n*m) aman.
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        ref[i - 1] === trans[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[n][m] / ref.length;
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
