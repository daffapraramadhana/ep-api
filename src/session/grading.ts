// Fungsi murni: tanpa Nest/Prisma. Menilai satu jawaban terhadap satu item.
export interface GradableItem {
  type: string;
  answerKey: string;
  acceptedAnswers: string[];
}

const normal = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

export function gradeAnswer(item: GradableItem, answer: string): boolean {
  switch (item.type) {
    case 'PILIHAN_GANDA':
      return normal(answer) === normal(item.answerKey);
    case 'ISIAN':
      return item.acceptedAnswers.map(normal).includes(normal(answer));
    case 'SUSUN_KALIMAT':
      return normal(answer) === normal(item.answerKey);
    default:
      return false;
  }
}
