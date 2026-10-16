import 'dotenv/config';
import * as ExcelJS from 'exceljs';
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

const LESSON_CODE = 'CRUD-01';

async function buildSeedWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Soal');
  ws.addRow(HEADERS);
  ws.addRow([
    LESSON_CODE,
    'Lesson CRUD',
    'Topic CRUD',
    'dasar',
    'A1',
    'vocabulary',
    1,
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
    LESSON_CODE,
    'Lesson CRUD',
    'Topic CRUD',
    'dasar',
    'A1',
    'vocabulary',
    2,
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
    LESSON_CODE,
    'Lesson CRUD',
    'Topic CRUD',
    'dasar',
    'A1',
    'vocabulary',
    3,
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
  const arrBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrBuf);
}

describe('content CRUD (admin lessons/items)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let lessonId: string;
  let pgItemId: string;
  let isianItemId: string;

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

    const svc = app.get(ImportService);
    await svc.importWorkbook(await buildSeedWorkbook());

    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { code: LESSON_CODE },
    });
    lessonId = lesson.id;
    const pgItem = await prisma.item.findFirstOrThrow({
      where: { lessonId, order: 1 },
    });
    pgItemId = pgItem.id;
    const isianItem = await prisma.item.findFirstOrThrow({
      where: { lessonId, order: 2 },
    });
    isianItemId = isianItem.id;
  });

  afterAll(async () => {
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'CRUD-' } } },
    });
    await prisma.lesson.deleteMany({
      where: { code: { startsWith: 'CRUD-' } },
    });
    await app.close();
  });

  it('GET /admin/lessons berisi lesson hasil import dengan itemCount benar', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/lessons')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const found = res.body.find((l: any) => l.code === LESSON_CODE);
    expect(found).toBeDefined();
    expect(found).toMatchObject({
      code: LESSON_CODE,
      title: 'Lesson CRUD',
      topic: 'Topic CRUD',
      level: 'DASAR',
      cefr: 'A1',
      status: 'DRAFT',
      itemCount: 3,
      liveItemCount: 0,
    });
  });

  it('GET /admin/lessons/:id/items berisi item lengkap urut order', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/lessons/${lessonId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.map((i: any) => i.order)).toEqual([1, 2, 3]);
  });

  it('PATCH /admin/items/:id explanation berubah dan persist', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/items/${pgItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ explanation: 'Penjelasan baru.' })
      .expect(200);
    expect(res.body.explanation).toBe('Penjelasan baru.');

    const item = await prisma.item.findUniqueOrThrow({
      where: { id: pgItemId },
    });
    expect(item.explanation).toBe('Penjelasan baru.');
  });

  it('PATCH status item DRAFT→LIVE sukses', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/items/${isianItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'LIVE' })
      .expect(200);
    expect(res.body.status).toBe('LIVE');

    const item = await prisma.item.findUniqueOrThrow({
      where: { id: isianItemId },
    });
    expect(item.status).toBe('LIVE');
  });

  it('PATCH status item DRAFT→RETIRED → 400 dengan pesan transisi', async () => {
    const susunItem = await prisma.item.findFirstOrThrow({
      where: { lessonId, order: 3 },
    });
    expect(susunItem.status).toBe('DRAFT');
    const res = await request(app.getHttpServer())
      .patch(`/admin/items/${susunItem.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RETIRED' })
      .expect(400);
    expect(res.body.message).toBe(
      'Transisi status DRAFT→RETIRED tidak diizinkan',
    );
  });

  it('PATCH pilihan_ganda dengan answerKey E → 400', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/items/${pgItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ answerKey: 'E' })
      .expect(400);
    expect(res.body.message).toBeDefined();
  });

  it('PATCH isian answerKey saja → acceptedAnswers ternormalisasi tersimpan di DB', async () => {
    const before = await prisma.item.findUniqueOrThrow({
      where: { id: isianItemId },
    });
    expect(before.acceptedAnswers).toEqual(['am', 'is']);

    const res = await request(app.getHttpServer())
      .patch(`/admin/items/${isianItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ answerKey: 'was' })
      .expect(200);
    expect(res.body.answerKey).toBe('was');
    expect(res.body.acceptedAnswers).toEqual(['was', 'am', 'is']);

    const item = await prisma.item.findUniqueOrThrow({
      where: { id: isianItemId },
    });
    expect(item.answerKey).toBe('was');
    expect(item.acceptedAnswers).toEqual(['was', 'am', 'is']);
  });

  it('PATCH tidak bisa menyelundupkan `type` untuk mengubah aturan validasi', async () => {
    // `type` bukan bagian ItemPatch — mengirimnya tidak boleh mengubah tipe
    // item yang dipakai untuk revalidasi (mis. lolos validasi pilihan_ganda
    // padahal item sebenarnya isian).
    const before = await prisma.item.findUniqueOrThrow({
      where: { id: isianItemId },
    });
    expect(before.type).toBe('ISIAN');

    await request(app.getHttpServer())
      .patch(`/admin/items/${isianItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'PILIHAN_GANDA', explanation: 'Tetap isian.' })
      .expect(200);

    const item = await prisma.item.findUniqueOrThrow({
      where: { id: isianItemId },
    });
    expect(item.type).toBe('ISIAN');
    expect(item.explanation).toBe('Tetap isian.');
  });

  it('PATCH lesson title/topic/order/status subset berhasil', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Lesson CRUD Updated' })
      .expect(200);
    expect(res.body.title).toBe('Lesson CRUD Updated');
  });

  // C2(c) regresi: lesson DRAFT tanpa item LIVE sama sekali tidak boleh bisa
  // diterbitkan — kalau lolos, session.service.ts getOrCreateToday akan
  // memilihnya sebagai "lesson berikutnya" dan merakit sesi kosong yang
  // tidak pernah bisa diselesaikan (lockout permanen).
  it('PATCH lesson DRAFT→LIVE tanpa item LIVE → 400, lesson lain dengan item LIVE tetap boleh', async () => {
    const emptyLesson = await prisma.lesson.create({
      data: {
        code: `CRUD-EMPTY-${Date.now()}`,
        title: 'Lesson Tanpa Item LIVE',
        topic: 'Topic CRUD',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'VOCABULARY',
        order: 99,
        status: 'DRAFT',
      },
    });
    await prisma.item.create({
      data: {
        lessonId: emptyLesson.id,
        type: 'PILIHAN_GANDA',
        prompt: 'Item draft saja',
        options: ['A', 'B', 'C', 'D'],
        answerKey: 'A',
        explanation: 'x',
        order: 1,
        status: 'DRAFT',
      },
    });

    const res = await request(app.getHttpServer())
      .patch(`/admin/lessons/${emptyLesson.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'LIVE' })
      .expect(400);
    expect(res.body.message).toBe(
      'Lesson tanpa soal LIVE tidak bisa diterbitkan',
    );

    const stillDraft = await prisma.lesson.findUniqueOrThrow({
      where: { id: emptyLesson.id },
    });
    expect(stillDraft.status).toBe('DRAFT');

    // lessonId (fixture utama file ini) sudah punya item LIVE (isianItemId,
    // di-set LIVE di test sebelumnya) — pastikan itu tidak ikut terblokir.
    await request(app.getHttpServer())
      .patch(`/admin/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'LIVE' })
      .expect(200);

    const liveLesson = await prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
    });
    expect(liveLesson.status).toBe('LIVE');

    await prisma.item.deleteMany({ where: { lessonId: emptyLesson.id } });
    await prisma.lesson.delete({ where: { id: emptyLesson.id } });
  });

  it('PATCH item UCAPAN di lesson SPEAKING → 200 dan answerKey tersimpan', async () => {
    const lesson = await prisma.lesson.create({
      data: {
        code: 'CRUD-SPK',
        title: 'Speaking CRUD',
        topic: 'Topic CRUD',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'SPEAKING',
        order: 9001,
        status: 'DRAFT',
      },
    });
    const item = await prisma.item.create({
      data: {
        lessonId: lesson.id,
        order: 1,
        type: 'UCAPAN',
        prompt: 'Baca kalimat ini dengan lantang.',
        answerKey: 'Good morning everyone',
        explanation: 'Salam pagi.',
      },
    });

    await request(app.getHttpServer())
      .patch(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ answerKey: 'Good evening everyone' })
      .expect(200);

    const saved = await prisma.item.findUniqueOrThrow({ where: { id: item.id } });
    expect(saved.answerKey).toBe('Good evening everyone');
  });

  it('tidak ada route DELETE untuk lessons/items', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/admin/items/${pgItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('tanpa token → 401', async () => {
    await request(app.getHttpServer()).get('/admin/lessons').expect(401);
  });
});
