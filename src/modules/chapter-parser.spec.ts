// apps/api/src/modules/chapter-parser.spec.ts
import { parseChapter } from './chapter-parser';

function ok(body: string) {
  const r = parseChapter(body);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r;
}
function errs(body: string) {
  const r = parseChapter(body);
  if (r.ok) throw new Error('harusnya gagal');
  return r.errors;
}

describe('parseChapter', () => {
  it('paragraf dengan inline tebal/miring/kode/tautan', () => {
    const { blocks } = ok(
      'Halo **tebal** dan *miring*, `kode`, [link](https://x.id).',
    );
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        text: [
          { t: 'Halo ' },
          { t: 'tebal', b: true },
          { t: ' dan ' },
          { t: 'miring', i: true },
          { t: ', ' },
          { t: 'kode', code: true },
          { t: ', ' },
          { t: 'link', href: 'https://x.id' },
          { t: '.' },
        ],
      },
    ]);
  });

  it('heading: # dan ## → level 2, ### ke bawah → level 3', () => {
    const { blocks } = ok('# A\n\n## B\n\n#### C');
    expect(blocks.map((b) => (b.type === 'heading' ? b.level : 0))).toEqual([
      2, 2, 3,
    ]);
  });

  it('daftar berurut & tidak berurut', () => {
    const { blocks } = ok('- satu\n- dua\n\n1. a\n2. b');
    expect(blocks).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [[{ t: 'satu' }], [{ t: 'dua' }]],
      },
      { type: 'list', ordered: true, items: [[{ t: 'a' }], [{ t: 'b' }]] },
    ]);
  });

  it('tabel GFM', () => {
    const { blocks } = ok(
      '| Nonformal | Formal |\n|---|---|\n| Fix it. | Could you fix it? |',
    );
    expect(blocks).toEqual([
      {
        type: 'table',
        head: [[{ t: 'Nonformal' }], [{ t: 'Formal' }]],
        rows: [[[{ t: 'Fix it.' }], [{ t: 'Could you fix it?' }]]],
      },
    ]);
  });

  it('gambar & audio dari media: menjadi blok + tercatat di media', () => {
    const r = ok(
      'Teks\n\n![Kantor](media:kantor.png)\n\n![audio](media:sapa.mp3)',
    );
    expect(r.blocks.slice(1)).toEqual([
      { type: 'image', file: 'kantor.png', alt: 'Kantor' },
      { type: 'audio', file: 'sapa.mp3' },
    ]);
    expect(r.media).toEqual([
      { file: 'kantor.png', line: 3 },
      { file: 'sapa.mp3', line: 5 },
    ]);
  });

  it(':::phrases dengan catatan opsional', () => {
    const { blocks } = ok(
      ':::phrases\n- Could you help? | Bisa bantu?\n- Sorry. | Maaf. | santai\n:::',
    );
    expect(blocks).toEqual([
      {
        type: 'phrases',
        items: [
          { en: 'Could you help?', id: 'Bisa bantu?' },
          { en: 'Sorry.', id: 'Maaf.', note: 'santai' },
        ],
      },
    ]);
  });

  it(':::dialog — pembicara pertama kiri, kedua kanan, peran opsional', () => {
    const { blocks } = ok(
      ':::dialog\nRina (Finance): Invoice salah.\nKamu: Maaf, nomornya?\nRina (Finance): INV-1.\n:::',
    );
    expect(blocks).toEqual([
      {
        type: 'dialog',
        lines: [
          {
            speaker: 'Rina',
            role: 'Finance',
            side: 'left',
            text: 'Invoice salah.',
          },
          { speaker: 'Kamu', side: 'right', text: 'Maaf, nomornya?' },
          { speaker: 'Rina', role: 'Finance', side: 'left', text: 'INV-1.' },
        ],
      },
    ]);
  });

  it(':::tip berisi paragraf inline', () => {
    const { blocks } = ok(':::tip\nPakai **Could you**.\n:::');
    expect(blocks).toEqual([
      {
        type: 'tip',
        text: [[{ t: 'Pakai ' }, { t: 'Could you', b: true }, { t: '.' }]],
      },
    ]);
  });

  it('urutan blok markdown dan directive terjaga', () => {
    const { blocks } = ok('## Frasa\n\n:::tip\nA\n:::\n\nPenutup');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'tip', 'paragraph']);
  });

  it('CRLF diperlakukan sama dengan LF', () => {
    const { blocks } = ok(':::tip\r\nA\r\n:::\r\n');
    expect(blocks).toEqual([{ type: 'tip', text: [[{ t: 'A' }]] }]);
  });

  it('HTML mentah tidak dirender — tetap teks', () => {
    const { blocks } = ok('<b>x</b>');
    expect(blocks).toEqual([{ type: 'paragraph', text: [{ t: '<b>x</b>' }] }]);
  });

  // --- error bernomor baris ---
  it('body kosong', () => {
    expect(errs('  \n ')).toEqual([
      { line: 1, message: 'Isi bab masih kosong' },
    ]);
  });

  it('blok tidak ditutup', () => {
    expect(errs('Intro\n\n:::dialog\nA: hai')).toEqual([
      { line: 3, message: 'Blok ":::dialog" belum ditutup dengan ":::"' },
    ]);
  });

  it('blok tidak ditutup lalu ada blok lain — satu error, blok berikutnya dilewati utuh', () => {
    expect(errs(':::tip\nA\n:::phrases\n- a | b\n:::')).toEqual([
      { line: 1, message: 'Blok ":::tip" belum ditutup dengan ":::"' },
    ]);
  });

  it('penutup tanpa pembuka', () => {
    expect(errs('Teks\n:::')).toEqual([
      { line: 2, message: '":::" penutup tanpa blok pembuka' },
    ]);
  });

  it('directive tak dikenal', () => {
    expect(errs(':::quiz\nx\n:::')).toEqual([
      {
        line: 1,
        message:
          'Blok ":::quiz" tidak dikenal (pakai phrases, dialog, atau tip)',
      },
    ]);
  });

  it('frasa tanpa | atau sisi kosong', () => {
    expect(errs(':::phrases\n- tanpa pemisah\n- EN |\n:::')).toEqual([
      { line: 2, message: 'Frasa harus berformat "EN | arti"' },
      { line: 3, message: 'Frasa harus berformat "EN | arti"' },
    ]);
  });

  it('dialog tanpa ":" dan pembicara ketiga', () => {
    expect(
      errs(':::dialog\nA: hai\nB: halo\nbaris rusak\nC: aku\n:::'),
    ).toEqual([
      { line: 4, message: 'Baris dialog harus berformat "Nama (peran): teks"' },
      { line: 5, message: 'Dialog maksimal 2 pembicara per blok' },
    ]);
  });

  it('blok directive kosong', () => {
    expect(errs(':::phrases\n\n:::')).toEqual([
      { line: 1, message: 'Blok ":::phrases" masih kosong' },
    ]);
  });

  it('tautan non-http(s) ditolak', () => {
    expect(errs('Klik [x](javascript:alert(1))')).toEqual([
      { line: 1, message: 'Tautan harus diawali http:// atau https://' },
    ]);
  });

  it('gambar bukan dari media: ditolak', () => {
    expect(errs('![a](https://x.id/a.png)')).toEqual([
      {
        line: 1,
        message:
          'Gambar/audio harus dari Media: tulis ![keterangan](media:nama-file)',
      },
    ]);
  });

  it('format yang belum didukung (kutipan, blok kode, garis)', () => {
    expect(errs('> kutip\n\n```\nkode\n```\n\n---')).toEqual([
      { line: 1, message: 'Format "kutipan" belum didukung di bab' },
      { line: 3, message: 'Format "blok kode" belum didukung di bab' },
      { line: 7, message: 'Format "garis pemisah" belum didukung di bab' },
    ]);
  });

  it('daftar bertingkat ditolak', () => {
    expect(errs('- a\n  - b')).toEqual([
      { line: 1, message: 'Daftar bertingkat belum didukung' },
    ]);
  });

  // --- temuan review akhir ---
  it('pembuka directive dengan spasi (::: tip) dikenali', () => {
    const { blocks } = ok('Intro\n\n::: tip\nA\n:::');
    expect(blocks).toEqual([
      { type: 'paragraph', text: [{ t: 'Intro' }] },
      { type: 'tip', text: [[{ t: 'A' }]] },
    ]);
  });

  it('media: dengan nama berspasi / non-ASCII di-decode', () => {
    const r = ok('![a](<media:Contoh Email.png>)\n\n![b](media:café.png)');
    expect(r.media.map((m) => m.file)).toEqual([
      'Contoh Email.png',
      'café.png',
    ]);
    expect(r.blocks[0]).toEqual({
      type: 'image',
      file: 'Contoh Email.png',
      alt: 'a',
    });
  });

  it('blok kode di dalam item daftar ditolak, bukan dibuang diam-diam', () => {
    expect(errs('- satu\n\n      kode\n- dua')).toEqual([
      { line: 3, message: 'Format "blok kode" belum didukung di dalam daftar' },
    ]);
  });

  it('kutipan di dalam item daftar ditolak', () => {
    expect(errs('- satu\n  > kutip\n- dua')).toEqual([
      { line: 2, message: 'Format "kutipan" belum didukung di dalam daftar' },
    ]);
  });

  it('item daftar dengan lebih dari satu paragraf ditolak', () => {
    expect(errs('- satu\n\n  lanjutan\n- dua')).toEqual([
      { line: 3, message: 'Satu butir daftar hanya boleh satu paragraf' },
    ]);
  });

  it('error di baris tabel menunjuk baris yang salah, bukan baris pertama tabel', () => {
    expect(
      errs('| A | B |\n|---|---|\n| x | y |\n| [z](javascript:1) | w |'),
    ).toEqual([
      { line: 4, message: 'Tautan harus diawali http:// atau https://' },
    ]);
  });

  it('frasa bernomor "1. " / "1) " dibersihkan', () => {
    const { blocks } = ok(
      ':::phrases\n1. Sorry. | Maaf.\n2) Thanks. | Terima kasih.\n:::',
    );
    expect(blocks).toEqual([
      {
        type: 'phrases',
        items: [
          { en: 'Sorry.', id: 'Maaf.' },
          { en: 'Thanks.', id: 'Terima kasih.' },
        ],
      },
    ]);
  });

  it('penanda tebal/miring/kode di frasa & dialog dibuang (bukan tampil literal)', () => {
    const { blocks } = ok(
      ':::phrases\n- **Sorry** for *that*. | Maaf `ya`.\n:::\n\n:::dialog\nA: I am **sure**.\n:::',
    );
    expect(blocks).toEqual([
      { type: 'phrases', items: [{ en: 'Sorry for that.', id: 'Maaf ya.' }] },
      {
        type: 'dialog',
        lines: [{ speaker: 'A', side: 'left', text: 'I am sure.' }],
      },
    ]);
  });
});
