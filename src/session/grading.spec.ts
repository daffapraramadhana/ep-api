import { gradeAnswer, wordOverlapRatio } from './grading';

describe('gradeAnswer', () => {
  it('PILIHAN_GANDA benar, huruf kecil', () => {
    expect(
      gradeAnswer(
        { type: 'PILIHAN_GANDA', answerKey: 'B', acceptedAnswers: [] },
        'b',
      ),
    ).toBe(true);
  });

  it('PILIHAN_GANDA salah', () => {
    expect(
      gradeAnswer(
        { type: 'PILIHAN_GANDA', answerKey: 'B', acceptedAnswers: [] },
        'C',
      ),
    ).toBe(false);
  });

  it('ISIAN benar via variasi acceptedAnswers + kapital/spasi', () => {
    expect(
      gradeAnswer(
        { type: 'ISIAN', answerKey: 'am', acceptedAnswers: ['am', "i'm"] },
        "  I'M  ",
      ),
    ).toBe(true);
  });

  it('ISIAN salah', () => {
    expect(
      gradeAnswer(
        { type: 'ISIAN', answerKey: 'am', acceptedAnswers: ['am'] },
        'is',
      ),
    ).toBe(false);
  });

  it('SUSUN_KALIMAT benar', () => {
    expect(
      gradeAnswer(
        {
          type: 'SUSUN_KALIMAT',
          answerKey: 'I go to school today',
          acceptedAnswers: [],
        },
        'I go to school today',
      ),
    ).toBe(true);
  });

  it('SUSUN_KALIMAT beda urutan kata → salah', () => {
    expect(
      gradeAnswer(
        {
          type: 'SUSUN_KALIMAT',
          answerKey: 'I go to school today',
          acceptedAnswers: [],
        },
        'I go school to today',
      ),
    ).toBe(false);
  });

  it('normalisasi spasi ganda tetap dianggap benar', () => {
    expect(
      gradeAnswer(
        {
          type: 'SUSUN_KALIMAT',
          answerKey: 'I go to school today',
          acceptedAnswers: [],
        },
        'I   go  to   school   today',
      ),
    ).toBe(true);
  });

  it('answer kosong → salah', () => {
    expect(
      gradeAnswer(
        { type: 'ISIAN', answerKey: 'am', acceptedAnswers: ['am'] },
        '',
      ),
    ).toBe(false);
  });

  describe('wordOverlapRatio', () => {
    it('kalimat identik → 1', () => {
      expect(
        wordOverlapRatio('I went to the store', 'I went to the store'),
      ).toBe(1);
    });

    it('satu kata hilang → 4/5', () => {
      expect(wordOverlapRatio('I went to the store', 'I went the store')).toBe(
        0.8,
      );
    });

    it('urutan kata terbalik → skor rendah (urutan diperhitungkan)', () => {
      expect(
        wordOverlapRatio('I went to the store', 'store the to went I'),
      ).toBe(0.2); // LCS = 1 kata dari 5
    });

    it('dua kata bertukar posisi → tetap tinggi (4/5)', () => {
      expect(
        wordOverlapRatio('I went to the store', 'I went the to store'),
      ).toBe(0.8);
    });

    it('filler tidak menurunkan skor', () => {
      expect(
        wordOverlapRatio('I went to the store', 'I um went to the uh store'),
      ).toBe(1);
    });

    it('referensi kosong → 0', () => {
      expect(wordOverlapRatio('', 'anything')).toBe(0);
    });

    it('tanda baca diabaikan', () => {
      expect(
        wordOverlapRatio("It's a good day", "Its a good day."),
      ).toBe(1);
    });
  });

  describe('gradeAnswer UCAPAN', () => {
    it('transcript pas di atas ambang default → benar', () => {
      expect(
        gradeAnswer(
          { type: 'UCAPAN', answerKey: 'I went to the store', acceptedAnswers: [] },
          'I went to the store',
        ),
      ).toBe(true);
    });

    it('banyak kata hilang di bawah ambang → salah', () => {
      expect(
        gradeAnswer(
          { type: 'UCAPAN', answerKey: 'I went to the store', acceptedAnswers: [] },
          'I went store',
        ),
      ).toBe(false);
    });

    it('ambang custom 100 → hanya kalimat identik benar', () => {
      const item = {
        type: 'UCAPAN' as const,
        answerKey: 'I went to the store',
        acceptedAnswers: [],
        threshold: 100,
      };
      expect(gradeAnswer(item, 'I went to the store')).toBe(true);
      expect(gradeAnswer(item, 'I went to store')).toBe(false);
    });

    it('transcript kosong → salah', () => {
      expect(
        gradeAnswer(
          { type: 'UCAPAN', answerKey: 'I went to the store', acceptedAnswers: [] },
          '',
        ),
      ).toBe(false);
    });
  });
});
