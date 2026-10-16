import { clipId, parseTtsScript, speakableText } from './tts-text';

describe('speakableText', () => {
  it('alternatif " / " jadi jeda koma', () => {
    expect(speakableText('Hey! / Hi there! / Hiya!')).toBe('Hey!, Hi there!, Hiya!');
  });

  it('buang penanda Markdown inline dan rapikan spasi', () => {
    expect(speakableText('  **Good**   *morning*  ')).toBe('Good morning');
    expect(speakableText('Say `hello` now')).toBe('Say hello now');
  });

  it('elipsis tunggal jadi tiga titik', () => {
    expect(speakableText('Wait…')).toBe('Wait...');
  });

  it('teks tanpa huruf/angka jadi kosong', () => {
    expect(speakableText('🔊')).toBe('');
    expect(speakableText(' -- ')).toBe('');
  });
});

describe('parseTtsScript', () => {
  it('narasi biasa → satu segmen suara narator', () => {
    expect(parseTtsScript('Good morning, everyone.')).toEqual({
      segments: [{ voice: 'af_heart', text: 'Good morning, everyone.' }],
    });
  });

  it('dialog dua pembicara → suara kiri lalu kanan, nama dibuang', () => {
    expect(parseTtsScript('Rina (Tour Leader): Hello!\nMr. Lee: Hi, Rina.')).toEqual({
      segments: [
        { voice: 'af_heart', text: 'Hello!' },
        { voice: 'am_michael', text: 'Hi, Rina.' },
      ],
    });
  });

  it('pembicara yang sama selalu memakai suara yang sama', () => {
    const r = parseTtsScript('A: one\nB: two\nA: three');
    expect(r).toEqual({
      segments: [
        { voice: 'af_heart', text: 'one' },
        { voice: 'am_michael', text: 'two' },
        { voice: 'af_heart', text: 'three' },
      ],
    });
  });

  it('tiga pembicara → error', () => {
    expect(parseTtsScript('A: one\nB: two\nC: three')).toEqual({
      error: 'Teks audio maksimal 2 pembicara',
    });
  });

  it('ada baris tanpa pembicara → dibaca sebagai narasi', () => {
    const r = parseTtsScript('A: hello\nthis line has no speaker');
    expect('segments' in r && r.segments).toHaveLength(1);
    expect('segments' in r && r.segments[0].voice).toBe('af_heart');
  });

  it('teks kosong setelah normalisasi → tanpa segmen', () => {
    expect(parseTtsScript('🔊')).toEqual({ segments: [] });
  });
});

describe('clipId', () => {
  const seg = [{ voice: 'af_heart', text: 'How was your flight here?' }];

  it('stabil dan 32 hex', () => {
    expect(clipId(seg)).toBe(clipId([...seg]));
    expect(clipId(seg)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('berubah bila suara atau teks berubah', () => {
    expect(clipId([{ ...seg[0], voice: 'am_michael' }])).not.toBe(clipId(seg));
    expect(clipId([{ ...seg[0], text: 'How was your trip here?' }])).not.toBe(clipId(seg));
  });
});
