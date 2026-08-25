import { gradeAnswer } from './grading';

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
});
