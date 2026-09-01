// Pure function: no Nest/Prisma imports. Validates one parsed spreadsheet
// sheet's rows against the question-import template contract.

export interface RawRow {
  [col: string]: string;
} // semua nilai string ter-trim

export interface RowError {
  row: number;
  column: string;
  message: string;
}

export interface NormalizedRow {
  lessonCode: string;
  lessonTitle: string;
  topic: string;
  level: 'DASAR' | 'MENENGAH' | 'MAHIR';
  cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  skill: 'VOCABULARY' | 'GRAMMAR' | 'LISTENING' | 'READING' | 'SPEAKING';
  itemOrder: number;
  type: 'PILIHAN_GANDA' | 'ISIAN' | 'SUSUN_KALIMAT' | 'UCAPAN';
  prompt: string;
  options: string[] | null;
  answerKey: string;
  acceptedAnswers: string[];
  explanation: string;
  mediaFile: string | null;
  passage: string | null;
  sourceRow: number;
}

const LEVELS: Record<string, NormalizedRow['level']> = {
  dasar: 'DASAR',
  menengah: 'MENENGAH',
  mahir: 'MAHIR',
};
const CEFRS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const SKILLS: Record<string, NormalizedRow['skill']> = {
  vocabulary: 'VOCABULARY',
  grammar: 'GRAMMAR',
  listening: 'LISTENING',
  reading: 'READING',
  speaking: 'SPEAKING',
};
const TYPES: Record<string, NormalizedRow['type']> = {
  pilihan_ganda: 'PILIHAN_GANDA',
  isian: 'ISIAN',
  susun_kalimat: 'SUSUN_KALIMAT',
  ucapan: 'UCAPAN',
};
const REQUIRED = [
  'lesson_code',
  'lesson_title',
  'topic',
  'level',
  'cefr',
  'skill',
  'item_order',
  'type',
  'prompt',
  'answer',
  'explanation',
];

export function validateRows(
  rows: RawRow[],
  mediaNames: Set<string>,
): { valid: NormalizedRow[]; errors: RowError[] } {
  const valid: NormalizedRow[] = [];
  const errors: RowError[] = [];
  const lessonMeta = new Map<string, { row: number; sig: string }>();
  const seenOrder = new Set<string>();

  rows.forEach((r, i) => {
    const row = i + 2;
    const errsBefore = errors.length;
    const err = (column: string, message: string) =>
      errors.push({ row, column, message });

    for (const col of REQUIRED)
      if (!r[col]) err(col, `Kolom '${col}' wajib diisi`);

    const level = LEVELS[(r.level ?? '').toLowerCase()];
    if (r.level && !level)
      err('level', `Nilai level harus dasar/menengah/mahir, bukan '${r.level}'`);
    const cefr = (r.cefr ?? '').toUpperCase();
    if (r.cefr && !CEFRS.has(cefr))
      err('cefr', `Nilai cefr harus A1–C2, bukan '${r.cefr}'`);
    const skill = SKILLS[(r.skill ?? '').toLowerCase()];
    if (r.skill && !skill) err('skill', `Nilai skill tidak dikenal: '${r.skill}'`);
    const type = TYPES[(r.type ?? '').toLowerCase()];
    if (r.type && !type) err('type', `Nilai type tidak dikenal: '${r.type}'`);

    const itemOrder = Number(r.item_order);
    if (r.item_order && (!Number.isInteger(itemOrder) || itemOrder < 1))
      err(
        'item_order',
        `item_order harus bilangan bulat ≥ 1, bukan '${r.item_order}'`,
      );

    let options: string[] | null = null;
    let answerKey = (r.answer ?? '').trim();
    let acceptedAnswers: string[] = [];

    if (type === 'PILIHAN_GANDA') {
      options = [r.option_a, r.option_b, r.option_c, r.option_d].map((o) =>
        (o ?? '').trim(),
      );
      options.forEach((o, oi) => {
        if (!o)
          err(`option_${'abcd'[oi]}`, 'Opsi wajib diisi untuk pilihan_ganda');
      });
      answerKey = answerKey.toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(answerKey))
        err('answer', `Kunci pilihan_ganda harus A/B/C/D, bukan '${r.answer}'`);
    } else if (type === 'ISIAN') {
      if (r.prompt && !r.prompt.includes('___'))
        err('prompt', "Soal isian harus mengandung '___'");
      acceptedAnswers = (r.accepted_answers ?? '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      if (
        answerKey &&
        !acceptedAnswers.some((a) => a.toLowerCase() === answerKey.toLowerCase())
      )
        acceptedAnswers.unshift(answerKey);
      if (!acceptedAnswers.length)
        err('accepted_answers', 'Soal isian butuh minimal satu jawaban sah');
    } else if (type === 'SUSUN_KALIMAT') {
      if (answerKey.split(/\s+/).filter(Boolean).length < 3)
        err('answer', 'Kalimat susun_kalimat minimal 3 kata');
    } else if (type === 'UCAPAN') {
      // answer = kalimat yang harus diucapkan user. Minimal 2 kata supaya
      // ada sesuatu yang benar-benar "diucapkan" (bukan satu kata yang bisa
      // diterka). accepted_answers diabaikan untuk tipe ini.
      if (answerKey.split(/\s+/).filter(Boolean).length < 2)
        err('answer', 'Kalimat ucapan minimal 2 kata');
    }

    const mediaFile = (r.media_file ?? '').trim() || null;
    if (mediaFile && !mediaNames.has(mediaFile))
      err('media_file', `File media '${mediaFile}' belum diunggah`);

    const code = (r.lesson_code ?? '').trim();
    if (code) {
      const sig = [
        r.lesson_title,
        r.topic,
        (r.level ?? '').toLowerCase(),
        cefr,
        (r.skill ?? '').toLowerCase(),
      ].join('|');
      const first = lessonMeta.get(code);
      if (!first) lessonMeta.set(code, { row, sig });
      else if (first.sig !== sig) {
        const cols = ['lesson_title', 'topic', 'level', 'cefr', 'skill'];
        const firstFields = first.sig.split('|');
        const newFields = sig.split('|');
        const diff =
          cols.find((_, ci) => firstFields[ci] !== newFields[ci]) ?? 'lesson_title';
        err(diff, `Metadata lesson '${code}' berbeda dari baris ${first.row}`);
      }
      const key = `${code}#${itemOrder}`;
      if (r.item_order && seenOrder.has(key))
        err(
          'item_order',
          `Duplikat: lesson '${code}' sudah punya item_order ${itemOrder}`,
        );
      seenOrder.add(key);
    }

    if (errors.length === errsBefore)
      valid.push({
        lessonCode: code,
        lessonTitle: r.lesson_title.trim(),
        topic: r.topic.trim(),
        level: level!,
        cefr: cefr as NormalizedRow['cefr'],
        skill: skill!,
        itemOrder,
        type: type!,
        prompt: r.prompt.trim(),
        options,
        answerKey,
        acceptedAnswers,
        explanation: r.explanation.trim(),
        mediaFile,
        passage: (r.passage ?? '').trim() || null,
        sourceRow: row,
      });
  });
  return { valid, errors };
}
