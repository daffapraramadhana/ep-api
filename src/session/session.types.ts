// Kontrak FE — JANGAN bocorkan answerKey/acceptedAnswers/explanation di sini.
export interface SessionItemView {
  itemId: string;
  source: 'LESSON' | 'REVIEW';
  order: number;
  type: 'PILIHAN_GANDA' | 'ISIAN' | 'SUSUN_KALIMAT';
  prompt: string;
  options: string[] | null;
  mediaUrl: string | null; // dari StorageService.getUrl(mediaFile) bila ada
  passage: string | null;
  chips: string[] | null; // SUSUN_KALIMAT: kata answerKey di-shuffle DI BE
  answeredCorrect: boolean;
}

export interface SessionView {
  id: string;
  kind: 'DAILY' | 'REPLAY';
  status: 'IN_PROGRESS' | 'COMPLETED';
  lessonTitle: string | null;
  items: SessionItemView[];
  progress: { answered: number; total: number };
}
