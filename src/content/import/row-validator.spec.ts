import { RawRow, validateRows } from './row-validator';

const base: RawRow = {
  lesson_code: 'BUS-01',
  lesson_title: 'Email Perkenalan',
  topic: 'Business',
  level: 'menengah',
  cefr: 'B1',
  skill: 'vocabulary',
  item_order: '1',
  type: 'pilihan_ganda',
  prompt: 'What does "schedule" mean?',
  option_a: 'Jadwal',
  option_b: 'Pertemuan',
  option_c: 'Perjalanan',
  option_d: 'Tujuan',
  answer: 'a',
  accepted_answers: '',
  explanation: 'Schedule = jadwal.',
  media_file: '',
  passage: '',
};

const isianBase: RawRow = {
  lesson_code: 'BUS-02',
  lesson_title: 'Isian Kosakata',
  topic: 'Business',
  level: 'dasar',
  cefr: 'A2',
  skill: 'grammar',
  item_order: '1',
  type: 'isian',
  prompt: 'She ___ to work every day.',
  answer: 'goes',
  accepted_answers: 'go;go to',
  explanation: 'Present tense.',
  media_file: '',
  passage: '',
};

describe('validateRows', () => {
  // (a) MC valid row -> normalized, no errors
  it('baris pilihan_ganda valid dinormalkan', () => {
    const { valid, errors } = validateRows([base], new Set());
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({
      lessonCode: 'BUS-01',
      lessonTitle: 'Email Perkenalan',
      topic: 'Business',
      level: 'MENENGAH',
      cefr: 'B1',
      skill: 'VOCABULARY',
      itemOrder: 1,
      type: 'PILIHAN_GANDA',
      answerKey: 'A',
      options: ['Jadwal', 'Pertemuan', 'Perjalanan', 'Tujuan'],
      sourceRow: 2,
    });
  });

  // (b) MC missing option_c -> error on option_c
  it('pilihan_ganda tanpa option_c -> error', () => {
    const row = { ...base, option_c: '' };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'option_c' }),
    );
  });

  // (c) answer 'E' -> invalid MC answer key
  it('pilihan_ganda dengan answer E -> error', () => {
    const row = { ...base, answer: 'E' };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'answer' }),
    );
  });

  // (d) isian without '___' -> error on prompt
  it('isian tanpa "___" pada prompt -> error', () => {
    const row = { ...isianBase, prompt: 'She goes to work every day.' };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'prompt' }),
    );
  });

  // (e) isian: accepted_answers split, answer merged in if not already present
  it('isian: accepted_answers dipecah dan answer tergabung', () => {
    const row = { ...isianBase, answer: 'goes', accepted_answers: 'go;go to' };
    const { valid, errors } = validateRows([row], new Set());
    expect(errors).toHaveLength(0);
    expect(valid[0].acceptedAnswers).toEqual(['goes', 'go', 'go to']);
  });

  it('isian: answer sudah ada di accepted_answers, tidak diduplikasi', () => {
    const row = { ...isianBase, answer: 'goes', accepted_answers: 'goes;go' };
    const { valid, errors } = validateRows([row], new Set());
    expect(errors).toHaveLength(0);
    expect(valid[0].acceptedAnswers).toEqual(['goes', 'go']);
  });

  // (f) susun_kalimat 2 words -> error
  it('susun_kalimat dengan 2 kata -> error', () => {
    const row: RawRow = {
      ...base,
      type: 'susun_kalimat',
      answer: 'hello world',
    };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'answer' }),
    );
  });

  it('susun_kalimat dengan 3 kata -> valid', () => {
    const row: RawRow = {
      ...base,
      type: 'susun_kalimat',
      answer: 'hello brave world',
    };
    const { valid, errors } = validateRows([row], new Set());
    expect(errors).toHaveLength(0);
    expect(valid[0].type).toBe('SUSUN_KALIMAT');
  });

  // (g) level 'Pemula' -> enum error
  it('level tidak dikenal -> error enum', () => {
    const row = { ...base, level: 'Pemula' };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'level' }),
    );
  });

  // (h) media_file missing from mediaNames -> error
  it('media_file belum diunggah -> error', () => {
    const row = { ...base, media_file: 'audio-01.mp3' };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({
        row: 2,
        column: 'media_file',
        message: "File media 'audio-01.mp3' belum diunggah",
      }),
    );
  });

  it('media_file ada di mediaNames -> valid', () => {
    const row = { ...base, media_file: 'audio-01.mp3' };
    const { valid, errors } = validateRows([row], new Set(['audio-01.mp3']));
    expect(errors).toHaveLength(0);
    expect(valid[0].mediaFile).toBe('audio-01.mp3');
  });

  // (i) duplicate (lesson_code, item_order) -> error on SECOND row, first stays valid
  it('duplikat lesson_code + item_order -> error di baris kedua, baris pertama tetap valid', () => {
    const r2 = { ...base }; // same lesson_code, same item_order '1'
    const { valid, errors } = validateRows([base, r2], new Set());
    expect(valid).toHaveLength(1);
    expect(valid[0].sourceRow).toBe(2);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 3, column: 'item_order' }),
    );
  });

  // (j) metadata lesson conflict -> error on the deviating row, reporting the right column
  it('metadata lesson konflik pada level -> error di baris menyimpang dengan column level', () => {
    const r2 = { ...base, item_order: '2', level: 'dasar' };
    const { valid, errors } = validateRows([base, r2], new Set());
    expect(valid).toHaveLength(1);
    expect(errors[0]).toMatchObject({ row: 3, column: 'level' });
    expect(errors[0].message).toContain('BUS-01');
    expect(errors[0].message).toContain('baris 2');
  });

  it('metadata lesson konflik pada topic -> column topic dilaporkan', () => {
    const r2 = { ...base, item_order: '2', topic: 'Travel' };
    const { valid, errors } = validateRows([base, r2], new Set());
    expect(valid).toHaveLength(1);
    expect(errors[0]).toMatchObject({ row: 3, column: 'topic' });
  });

  // (k) item_order 'abc' -> not an integer
  it('item_order bukan angka -> error', () => {
    const row = { ...base, item_order: 'abc' };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'item_order' }),
    );
  });

  it('item_order 0 -> error (harus >= 1)', () => {
    const row = { ...base, item_order: '0' };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'item_order' }),
    );
  });

  // Required-field checks (rule 1) run on raw strings and must never crash,
  // even when 'prompt' is missing for an isian row (guarded .includes check).
  it('kolom wajib kosong tidak membuat proses crash (prompt kosong pada isian)', () => {
    const row = { ...isianBase, prompt: '' };
    expect(() => validateRows([row], new Set())).not.toThrow();
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'prompt' }),
    );
  });

  it('semua kolom wajib kosong -> error untuk setiap kolom wajib', () => {
    const empty: RawRow = {
      lesson_code: '',
      lesson_title: '',
      topic: '',
      level: '',
      cefr: '',
      skill: '',
      item_order: '',
      type: '',
      prompt: '',
      answer: '',
      explanation: '',
    };
    const { valid, errors } = validateRows([empty], new Set());
    expect(valid).toHaveLength(0);
    const requiredCols = [
      'lesson_code', 'lesson_title', 'topic', 'level', 'cefr', 'skill',
      'item_order', 'type', 'prompt', 'answer', 'explanation',
    ];
    for (const col of requiredCols) {
      expect(errors).toContainEqual(expect.objectContaining({ row: 2, column: col }));
    }
  });

  it('cefr tidak valid -> error enum', () => {
    const row = { ...base, cefr: 'Z9' };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'cefr' }),
    );
  });

  it('skill tidak dikenal -> error enum', () => {
    const row = { ...base, skill: 'writing' };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'skill' }),
    );
  });

  it('type tidak dikenal -> error enum', () => {
    const row = { ...base, type: 'quiz' };
    const { valid, errors } = validateRows([row], new Set());
    expect(valid).toHaveLength(0);
    expect(errors).toContainEqual(
      expect.objectContaining({ row: 2, column: 'type' }),
    );
  });

  it('passage kosong dinormalkan menjadi null', () => {
    const { valid } = validateRows([base], new Set());
    expect(valid[0].passage).toBeNull();
  });

  it('prompt, explanation, lesson_title, topic di-trim pada baris valid', () => {
    const row = {
      ...base,
      prompt: '  What does "schedule" mean?  ',
      explanation: '  Schedule = jadwal.  ',
      lesson_title: '  Email Perkenalan  ',
      topic: '  Business  ',
    };
    const { valid, errors } = validateRows([row], new Set());
    expect(errors).toHaveLength(0);
    expect(valid[0].prompt).toBe('What does "schedule" mean?');
    expect(valid[0].explanation).toBe('Schedule = jadwal.');
    expect(valid[0].lessonTitle).toBe('Email Perkenalan');
    expect(valid[0].topic).toBe('Business');
  });
});
