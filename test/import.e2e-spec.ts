import 'dotenv/config';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { promises as fs } from 'fs';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ImportService } from '../src/content/import/import.service';

const HEADERS = [
  'lesson_code',
  'lesson_title',
  'topic',
  'level',
  'cefr',
  'skill',
  'item_order',
  'type',
  'prompt',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'answer',
  'accepted_answers',
  'explanation',
  'media_file',
  'passage',
];

async function buildWorkbookFromRows(
  rows: (string | number)[][],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Soal');
  ws.addRow(HEADERS);
  for (const row of rows) ws.addRow(row);
  const arrBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrBuf);
}

async function buildWorkbookWith(
  headers: string[],
  rows: (string | number)[][],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Soal');
  ws.addRow(headers);
  for (const row of rows) ws.addRow(row);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function buildTestWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Soal');
  ws.addRow(HEADERS);
  ws.addRow([
    'TST-01',
    'Perkenalan Diri',
    'Greetings',
    'dasar',
    'A1',
    'vocabulary',
    '1',
    'pilihan_ganda',
    'What does "hello" mean?',
    'Halo',
    'Selamat tinggal',
    'Terima kasih',
    'Tolong',
    'A',
    '',
    'Hello = halo.',
    '',
    '',
  ]);
  ws.addRow([
    'TST-01',
    'Perkenalan Diri',
    'Greetings',
    'dasar',
    'A1',
    'vocabulary',
    '2',
    'isian',
    'I ___ a student.',
    '',
    '',
    '',
    '',
    'am',
    'am;is',
    'Gunakan "am" untuk subjek I.',
    '',
    '',
  ]);
  ws.addRow([
    'TST-02',
    'Kalimat Sehari-hari',
    'Daily Life',
    'menengah',
    'B1',
    'grammar',
    '1',
    'susun_kalimat',
    'Susun: pergi / saya / sekolah / ke',
    '',
    '',
    '',
    '',
    'saya pergi ke sekolah',
    '',
    'Urutan subjek-predikat-objek.',
    '',
    '',
  ]);
  // Baris rusak: type tidak dikenal → 1 error, 1 baris.
  ws.addRow([
    'TST-02',
    'Kalimat Sehari-hari',
    'Daily Life',
    'menengah',
    'B1',
    'grammar',
    '2',
    'tipe_aneh',
    'Soal rusak',
    '',
    '',
    '',
    '',
    'jawaban',
    '',
    'Penjelasan.',
    '',
    '',
  ]);
  const arrBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrBuf);
}

describe('import (service)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'TST-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'TST-' } } });
    await app.close();
  });

  it('import → idempoten → status reset ke DRAFT saat re-import', async () => {
    const svc = app.get(ImportService);
    const buf = await buildTestWorkbook();
    const r1 = await svc.importWorkbook(buf);
    expect(r1).toMatchObject({
      lessonsCreated: 2,
      itemsCreated: 3,
      skippedRows: 1,
    });

    // naikkan satu item ke LIVE lalu import ulang file yang sama
    const item = await prisma.item.findFirst({
      where: { lesson: { code: 'TST-01' } },
    });
    await prisma.item.update({
      where: { id: item!.id },
      data: { status: 'LIVE' },
    });
    const r2 = await svc.importWorkbook(buf);
    expect(r2).toMatchObject({
      lessonsCreated: 0,
      itemsCreated: 0,
      itemsUpdated: 3,
    });
    const after = await prisma.item.findUnique({ where: { id: item!.id } });
    expect(after!.status).toBe('DRAFT'); // re-import → verifikasi ulang
  });

  it('re-import yang mengubah type dari pilihan_ganda ke isian: options lama dibersihkan (di-null-kan)', async () => {
    const svc = app.get(ImportService);
    const asPilihanGanda = await buildWorkbookFromRows([
      [
        'TST-03',
        'Uji Ganti Tipe',
        'Misc',
        'dasar',
        'A1',
        'vocabulary',
        '1',
        'pilihan_ganda',
        'Pilih salah satu',
        'Satu',
        'Dua',
        'Tiga',
        'Empat',
        'A',
        '',
        'Penjelasan.',
        '',
        '',
      ],
    ]);
    await svc.importWorkbook(asPilihanGanda);
    const created = await prisma.item.findFirstOrThrow({
      where: { lesson: { code: 'TST-03' }, order: 1 },
    });
    expect(created.options).toEqual(['Satu', 'Dua', 'Tiga', 'Empat']);

    const asIsian = await buildWorkbookFromRows([
      [
        'TST-03',
        'Uji Ganti Tipe',
        'Misc',
        'dasar',
        'A1',
        'vocabulary',
        '1',
        'isian',
        'Ini ___ contoh.',
        '',
        '',
        '',
        '',
        'sebuah',
        'sebuah;satu',
        'Penjelasan baru.',
        '',
        '',
      ],
    ]);
    const r = await svc.importWorkbook(asIsian);
    expect(r).toMatchObject({ itemsUpdated: 1 });
    const updated = await prisma.item.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(updated.type).toBe('ISIAN');
    // Fix: `options: v.options ?? Prisma.DbNull` membuat Prisma benar-benar
    // meng-null-kan kolom options saat type berubah dari pilihan_ganda,
    // alih-alih meninggalkan array options lama (stale) di kolom tsb.
    expect(updated.options).toBeNull();
  });

  it('import baris ucapan (skill speaking) → item tersimpan type UCAPAN', async () => {
    const svc = app.get(ImportService);
    const buf = await buildWorkbookFromRows([
      [
        'TST-UC',
        'Ucapan Drill',
        'Speaking',
        'dasar',
        'A1',
        'speaking',
        '1',
        'ucapan',
        'Baca kalimat ini dengan lantang.',
        '',
        '',
        '',
        '',
        'I will call you tomorrow',
        '',
        'Latihan pelafalan.',
        '',
        '',
      ],
    ]);
    const r = await svc.importWorkbook(buf);
    expect(r).toMatchObject({ lessonsCreated: 1, itemsCreated: 1 });
    const item = await prisma.item.findFirstOrThrow({
      where: { lesson: { code: 'TST-UC' } },
    });
    expect(item.type).toBe('UCAPAN');
    expect(item.answerKey).toBe('I will call you tomorrow');
    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { code: 'TST-UC' },
    });
    expect(lesson.skill).toBe('SPEAKING');
  });

  it('tts_text: tersimpan; sheet tanpa kolom membiarkannya; sel kosong mengosongkan', async () => {
    const svc = app.get(ImportService);
    const row = [
      'TST-TTS',
      'Listening TTS',
      'Listening',
      'dasar',
      'A1',
      'listening',
      '1',
      'pilihan_ganda',
      'What does the guide say?',
      'Hello',
      'Bye',
      'Thanks',
      'Sorry',
      'A',
      '',
      'Guide menyapa.',
      '',
      '',
    ];
    const ttsText = () =>
      prisma.item
        .findFirstOrThrow({ where: { lesson: { code: 'TST-TTS' } } })
        .then((i) => i.ttsText);

    await svc.importWorkbook(
      await buildWorkbookWith(
        [...HEADERS, 'tts_text'],
        [[...row, 'A: Hello\nB: Hi']],
      ),
    );
    expect(await ttsText()).toBe('A: Hello\nB: Hi');

    await svc.importWorkbook(await buildWorkbookWith(HEADERS, [row]));
    expect(await ttsText()).toBe('A: Hello\nB: Hi');

    await svc.importWorkbook(
      await buildWorkbookWith([...HEADERS, 'tts_text'], [[...row, '']]),
    );
    expect(await ttsText()).toBeNull();
  });
});

describe('import endpoint', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);
    adminToken = login.body.accessToken;
  });

  afterAll(async () => {
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'TST-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'TST-' } } });
    await app.close();
  });

  it('POST /admin/import/questions dengan .xlsx → 201 + ImportResult', async () => {
    const buf = await buildTestWorkbook();
    const res = await request(app.getHttpServer())
      .post('/admin/import/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', buf, 'soal.xlsx')
      .expect(201);

    expect(res.body).toMatchObject({
      lessonsCreated: expect.any(Number),
      lessonsUpdated: expect.any(Number),
      itemsCreated: expect.any(Number),
      itemsUpdated: expect.any(Number),
      skippedRows: expect.any(Number),
      errors: expect.any(Array),
    });
  });

  it('POST /admin/import/questions dengan .txt → 400 + error message', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/import/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('test'), 'soal.txt')
      .expect(400);

    expect(res.body.message).toBe(
      'File harus .xlsx (pakai template yang dikirim)',
    );
  });

  it('POST /admin/import/questions tanpa token → 401', async () => {
    const buf = await buildTestWorkbook();
    await request(app.getHttpServer())
      .post('/admin/import/questions')
      .attach('file', buf, 'soal.xlsx')
      .expect(401);
  });
});

describe('import (round-trip: template deliverable)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  // Hermetik: template disalin lalu lesson_code & media_file ditulis-ulang ke
  // prefix uji, supaya test TIDAK menyentuh konten BUS/LIS/RD milik pengguna
  // dan tidak bergantung pada isi storage (audio_001.mp3 boleh ada/tiada).
  const RT_PREFIX = 'TESTRT-';
  const RT_MEDIA = 'testrt_audio_missing.mp3';

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: RT_PREFIX } } },
    });
    await prisma.lesson.deleteMany({
      where: { code: { startsWith: RT_PREFIX } },
    });
    await app.close();
  });

  it.each(['v1', 'v2'])(
    'template-soal-%s.xlsx (deliverable klien) lolos importer kita sendiri',
    async (ver) => {
      const svc = app.get(ImportService);
      const templatePath = path.resolve(
        __dirname,
        `../../../deliverables/template-soal-${ver}.xlsx`,
      );
      const buf = await fs.readFile(templatePath);

      // salin + tulis-ulang kolom lesson_code & media_file
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
      const ws = wb.worksheets.find((w) => w.name === 'Soal');
      if (!ws) throw new Error('Sheet Soal tidak ditemukan di template');
      const headers: Record<string, number> = {};
      ws.getRow(1).eachCell((c, i) => {
        headers[String(c.value ?? '').trim()] = i;
      });
      ws.eachRow((row, n) => {
        if (n === 1) return;
        const codeCell = row.getCell(headers['lesson_code']);
        if (codeCell.value)
          codeCell.value = `${RT_PREFIX}${ver}-${String(codeCell.value)}`;
        const mediaCell = row.getCell(headers['media_file']);
        if (mediaCell.value && String(mediaCell.value).trim() !== '')
          mediaCell.value = RT_MEDIA;
      });
      const rtBuf = Buffer.from(await wb.xlsx.writeBuffer());

      const result = await svc.importWorkbook(rtBuf);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        column: 'media_file',
        message: `File media '${RT_MEDIA}' belum diunggah`,
      });
      // BUS-01 + RD-01 (LIS-01 gagal: media) + SPK-01 (ucapan); v2 + LIS-02 (tts_text)
      expect(result.lessonsCreated).toBe(ver === 'v1' ? 3 : 4);
      // 3 (BUS) + 1 (RD) + 1 (ucapan SPK); v2 + 1 (LIS-02)
      expect(result.itemsCreated).toBe(ver === 'v1' ? 5 : 6);
      expect(result.skippedRows).toBe(1);
    },
  );
});
