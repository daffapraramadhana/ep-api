import { chunkText, clipId, parseTtsScript, speakableText } from './tts-text';

describe('speakableText', () => {
  it('alternatif " / " jadi jeda koma', () => {
    expect(speakableText('Hey! / Hi there! / Hiya!')).toBe(
      'Hey!, Hi there!, Hiya!',
    );
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
    expect(
      parseTtsScript('Rina (Tour Leader): Hello!\nMr. Lee: Hi, Rina.'),
    ).toEqual({
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
    expect(clipId([{ ...seg[0], text: 'How was your trip here?' }])).not.toBe(
      clipId(seg),
    );
  });
});

describe('parseTtsScript — jam & rasio bukan pembicara', () => {
  it('baris berisi jam (9:30) tetap narasi utuh', () => {
    expect(
      parseTtsScript('The train leaves at 9:30.\nPlease arrive by 9:15.'),
    ).toEqual({
      segments: [
        {
          voice: 'af_heart',
          text: 'The train leaves at 9:30. Please arrive by 9:15.',
        },
      ],
    });
  });

  it('rasio (1:2) tanpa spasi setelah titik dua bukan pembicara', () => {
    const r = parseTtsScript('Mix it 1:2 with water\nThen stir 3:1 again');
    expect('segments' in r && r.segments).toHaveLength(1);
  });

  it('nama pembicara panjang (> 4 kata) bukan pembicara', () => {
    const r = parseTtsScript(
      'Please remember the following rule: be on time\nAnd one more important thing to note: smile',
    );
    expect('segments' in r && r.segments).toHaveLength(1);
  });
});

describe('chunkText', () => {
  const sentence = 'The guests will visit the old palace in the morning. ';

  it('teks pendek tidak dipecah', () => {
    expect(chunkText('How was your flight here?')).toEqual([
      'How was your flight here?',
    ]);
  });

  it('teks 600 karakter dipecah di batas kalimat, tiap potong ≤ 300, tanpa kata hilang', () => {
    const text = sentence.repeat(12).trim();
    expect(text.length).toBeGreaterThan(600);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(300);
    for (const c of chunks) expect(c.endsWith('.')).toBe(true);
    expect(chunks.join(' ')).toBe(text);
  });

  it('kalimat tunggal tanpa titik dipecah di koma lalu di spasi', () => {
    const words = Array.from({ length: 90 }, (_, i) => `word${i}`);
    const withCommas = words.join(' ').replace(/(word\d*9) /g, '$1, ');
    for (const text of [withCommas, words.join(' ')]) {
      const chunks = chunkText(text);
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) expect(c.length).toBeLessThanOrEqual(300);
      expect(chunks.join(' ')).toBe(text);
    }
  });
});

describe('parseTtsScript — suara mengikuti sapaan', () => {
  it('Mr. bicara duluan → tetap suara laki-laki; Rina → suara perempuan', () => {
    expect(
      parseTtsScript('Mr. Davis: Is the bus far?\nRina: Not at all.'),
    ).toEqual({
      segments: [
        { voice: 'am_michael', text: 'Is the bus far?' },
        { voice: 'af_heart', text: 'Not at all.' },
      ],
    });
  });

  it('Mrs./Ms./Madam → perempuan, Sir → laki-laki', () => {
    const r = parseTtsScript('Sir: Hello.\nMrs. Clark: Hi there.');
    expect('segments' in r && r.segments.map((s) => s.voice)).toEqual([
      'am_michael',
      'af_heart',
    ]);
  });

  it('dua pembicara bergender sama tetap dibedakan suaranya', () => {
    const r = parseTtsScript('Mr. Lee: Hello.\nMr. Tanaka: Good morning.');
    expect('segments' in r && r.segments.map((s) => s.voice)).toEqual([
      'am_michael',
      'af_heart',
    ]);
  });
});
