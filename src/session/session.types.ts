// Kontrak FE — JANGAN bocorkan answerKey/acceptedAnswers/explanation di sini.
export interface SessionItemView {
  itemId: string;
  source: 'LESSON' | 'REVIEW';
  order: number;
  type: 'PILIHAN_GANDA' | 'ISIAN' | 'SUSUN_KALIMAT' | 'UCAPAN';
  prompt: string;
  options: string[] | null;
  mediaUrl: string | null; // dari StorageService.getUrl(mediaFile) bila ada
  passage: string | null;
  chips: string[] | null; // SUSUN_KALIMAT: kata answerKey di-shuffle DI BE
  targetText: string | null; // UCAPAN: kalimat yang harus diucapkan (== answerKey; bocor sengaja, bukan rahasia utk tipe ini)
  answeredCorrect: boolean;
}

export interface SessionView {
  id: string;
  kind: 'DAILY' | 'REPLAY' | 'SPEAKING' | 'MODULE';
  status: 'IN_PROGRESS' | 'COMPLETED';
  lessonTitle: string | null;
  /** terisi untuk sesi kuis bab (MODULE/REPLAY dari modul) — tombol kembali ke modul */
  moduleSlug: string | null;
  chapterOrder: number | null;
  items: SessionItemView[];
  progress: { answered: number; total: number };
}
