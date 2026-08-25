import 'dotenv/config';
import * as ExcelJS from 'exceljs';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
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

  it('re-import yang mengubah type dari pilihan_ganda ke isian: options lama TIDAK terhapus (keterbatasan diketahui)', async () => {
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
    // Keterbatasan diketahui: `options: v.options ?? undefined` membuat Prisma
    // MENGABAIKAN field ini pada update (bukan meng-null-kannya), sehingga
    // array options lama dari pilihan_ganda tetap tersisa meski type sudah isian.
    expect(updated.options).toEqual(['Satu', 'Dua', 'Tiga', 'Empat']);
  });
});
