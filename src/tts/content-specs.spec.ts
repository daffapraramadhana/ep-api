import type { StoredBlock } from '../modules/chapter-parser';
import { chapterSpecs, itemSpecs } from './content-specs';

const base = {
  answerKey: 'Good morning everyone',
  ttsText: null,
  mediaFile: null,
};

describe('itemSpecs', () => {
  it('UCAPAN tanpa ttsText → target dari answerKey', () => {
    const r = itemSpecs({ ...base, type: 'UCAPAN' });
    expect(r.target?.segments).toEqual([
      { voice: 'af_heart', text: 'Good morning everyone' },
    ]);
    expect(r.media).toBeNull();
  });

  it('UCAPAN dengan ttsText → tidak mendapat media (contoh tidak diputar otomatis)', () => {
    const r = itemSpecs({ ...base, type: 'UCAPAN', ttsText: 'Good morning!' });
    expect(r.media).toBeNull();
  });

  it('UCAPAN dengan ttsText → target dari ttsText', () => {
    const r = itemSpecs({
      ...base,
      type: 'UCAPAN',
      ttsText: 'Good morning, everyone!',
    });
    expect(r.target?.segments[0].text).toBe('Good morning, everyone!');
  });

  it('soal non-UCAPAN dengan ttsText tanpa mediaFile → media, tanpa target', () => {
    const r = itemSpecs({
      ...base,
      type: 'PILIHAN_GANDA',
      ttsText: 'A: Hi\nB: Hello',
    });
    expect(r.target).toBeNull();
    expect(r.media?.segments.map((s) => s.voice)).toEqual([
      'af_heart',
      'am_michael',
    ]);
  });

  it('soal dengan mediaFile → media null (rekaman unggahan menang)', () => {
    const r = itemSpecs({
      ...base,
      type: 'PILIHAN_GANDA',
      ttsText: 'Hello',
      mediaFile: 'rekaman.mp3',
    });
    expect(r.media).toBeNull();
  });

  it('ttsText yang kosong setelah normalisasi → tanpa audio', () => {
    expect(
      itemSpecs({ ...base, type: 'ISIAN', ttsText: '🔊' }).media,
    ).toBeNull();
  });

  it('ttsText dengan 3 pembicara → tanpa audio', () => {
    expect(
      itemSpecs({ ...base, type: 'ISIAN', ttsText: 'A: 1\nB: 2\nC: 3' }).media,
    ).toBeNull();
  });
});

describe('chapterSpecs', () => {
  it('urut dokumen: frasa lalu baris dialog, suara mengikuti sisi', () => {
    const blocks: StoredBlock[] = [
      { type: 'paragraph', text: [{ t: 'Intro' }] },
      {
        type: 'phrases',
        items: [
          { en: 'Hey! / Hi there!', id: 'Hai!' },
          { en: 'Good morning.', id: 'Selamat pagi.' },
        ],
      },
      {
        type: 'dialog',
        lines: [
          { speaker: 'Kamu', side: 'left', text: 'Hello!' },
          { speaker: 'Tamu', side: 'right', text: 'Hi!' },
        ],
      },
    ];
    const specs = chapterSpecs(blocks);
    expect(specs.map((s) => s.segments[0])).toEqual([
      { voice: 'af_heart', text: 'Hey!, Hi there!' },
      { voice: 'af_heart', text: 'Good morning.' },
      { voice: 'af_heart', text: 'Hello!' },
      { voice: 'am_michael', text: 'Hi!' },
    ]);
  });

  it('frasa tanpa teks yang bisa diucapkan → spec kosong (indeks tetap sejajar)', () => {
    const specs = chapterSpecs([
      { type: 'phrases', items: [{ en: '🔊', id: 'x' }] },
    ]);
    expect(specs).toEqual([{ segments: [] }]);
  });
});
