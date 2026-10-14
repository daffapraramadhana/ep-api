// apps/api/test/modules-admin.e2e-spec.ts
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

// Prefix judul "MAD " → slug mad-…; lesson MAD-… / MOD-MAD-….
describe('admin modul', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  const stamp = Date.now();
  // Nama tetap: StorageService tak punya delete, jadi fixture ditimpa tiap run, tidak menumpuk.
  const mediaName = 'mad-e2e-fixture.png';

  const req = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${admin}`);

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await app.get(StorageService).put(mediaName, Buffer.from('png'));
    const login = await req()
      .post('/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);
    admin = login.body.accessToken;
  });

  afterAll(async () => {
    const mods = { module: { slug: { startsWith: 'mad-' } } };
    await prisma.moduleChapter.deleteMany({ where: mods });
    await prisma.module.deleteMany({ where: { slug: { startsWith: 'mad-' } } });
    await prisma.lesson.deleteMany({
      where: {
        OR: [
          { code: { startsWith: 'MAD-' } },
          { code: { startsWith: 'MOD-MAD-' } },
        ],
      },
    });
    await app.close();
  });

  let moduleId: string;
  let ch1: string;
  let ch2: string;

  it('non-admin ditolak', async () => {
    await req().get('/admin/modules').expect(401);
  });

  it('membuat modul: slug otomatis, status DRAFT; slug ganda 409', async () => {
    const res = await auth(req().post('/admin/modules'))
      .send({
        title: `MAD ${stamp}`,
        summary: 'Ringkas',
        level: 'MENENGAH',
        cefr: 'B1',
      })
      .expect(201);
    moduleId = res.body.id;
    expect(res.body.slug).toBe(`mad-${stamp}`);
    expect(res.body.status).toBe('DRAFT');
    await auth(req().post('/admin/modules'))
      .send({
        title: `MAD ${stamp}`,
        summary: 'x',
        level: 'MENENGAH',
        cefr: 'B1',
      })
      .expect(409);
    await auth(req().post('/admin/modules'))
      .send({ title: '', summary: 'x', level: 'X', cefr: 'B1' })
      .expect(400);
  });

  it('pratinjau: valid → blocks, invalid → errors (tanpa menyimpan)', async () => {
    const good = await auth(req().post('/admin/modules/preview'))
      .send({ body: `Halo\n\n![k](media:${mediaName})` })
      .expect(201);
    expect(good.body.blocks[1]).toEqual({
      type: 'image',
      url: expect.stringContaining(mediaName),
      alt: 'k',
    });
    const bad = await auth(req().post('/admin/modules/preview'))
      .send({ body: 'A\n\n![k](media:tidak-ada.png)' })
      .expect(201);
    expect(bad.body.errors).toEqual([
      { line: 3, message: 'File media tidak ditemukan: tidak-ada.png' },
    ]);
  });

  it('membuat bab: Markdown invalid → 400 "Baris N"; valid → blocks tersimpan', async () => {
    const bad = await auth(req().post(`/admin/modules/${moduleId}/chapters`))
      .send({ title: 'B1', estMinutes: 5, body: ':::tip\nA' })
      .expect(400);
    expect(bad.body.message[0]).toBe(
      'Baris 1: Blok ":::tip" belum ditutup dengan ":::"',
    );
    expect(await prisma.moduleChapter.count({ where: { moduleId } })).toBe(0);

    const a = await auth(req().post(`/admin/modules/${moduleId}/chapters`))
      .send({ title: 'Bab satu', estMinutes: 5, body: ':::tip\nA\n:::' })
      .expect(201);
    const b = await auth(req().post(`/admin/modules/${moduleId}/chapters`))
      .send({ title: 'Bab dua', estMinutes: 4, body: 'Dua' })
      .expect(201);
    ch1 = a.body.id;
    ch2 = b.body.id;
    expect(a.body.order).toBe(1);
    expect(b.body.order).toBe(2);
    const row = await prisma.moduleChapter.findUniqueOrThrow({
      where: { id: ch1 },
    });
    expect(row.blocks).toEqual([{ type: 'tip', text: [[{ t: 'A' }]] }]);
  });

  it('mengubah bab memperbarui body & blocks bersamaan', async () => {
    const res = await auth(req().patch(`/admin/chapters/${ch2}`))
      .send({ body: '## Judul' })
      .expect(200);
    expect(res.body.body).toBe('## Judul');
    const row = await prisma.moduleChapter.findUniqueOrThrow({
      where: { id: ch2 },
    });
    expect((row.blocks as any[])[0].type).toBe('heading');
  });

  it('memindah urutan bab', async () => {
    const res = await auth(req().post(`/admin/chapters/${ch2}/move`))
      .send({ direction: 'up' })
      .expect(201);
    expect(res.body.chapters.map((c: any) => c.id)).toEqual([ch2, ch1]);
    await auth(req().post(`/admin/chapters/${ch2}/move`))
      .send({ direction: 'up' })
      .expect(201); // sudah paling atas → no-op
  });

  it('buat kuis → lesson MOD-… DRAFT tertaut; kedua kalinya 409', async () => {
    const res = await auth(req().post(`/admin/chapters/${ch1}/quiz`)).expect(
      201,
    );
    expect(res.body.code).toBe(`MOD-MAD-${stamp}-2`.toUpperCase()); // ch1 kini order 2
    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { id: res.body.lessonId },
    });
    expect(lesson.status).toBe('DRAFT');
    expect(lesson.level).toBe('MENENGAH');
    await auth(req().post(`/admin/chapters/${ch1}/quiz`)).expect(409);
  });

  it('tautkan lesson yang ada; lesson milik bab lain 409; lepas tautan', async () => {
    const free = await prisma.lesson.create({
      data: {
        code: `MAD-FREE-${stamp}`,
        title: 'F',
        topic: 'T',
        level: 'MENENGAH',
        cefr: 'B1',
        skill: 'GRAMMAR',
        order: 1,
      },
    });
    const linked = await prisma.moduleChapter.findUniqueOrThrow({
      where: { id: ch1 },
    });
    await auth(req().patch(`/admin/chapters/${ch2}/quiz`))
      .send({ lessonId: linked.lessonId })
      .expect(409);
    const res = await auth(req().patch(`/admin/chapters/${ch2}/quiz`))
      .send({ lessonId: free.id })
      .expect(200);
    expect(res.body.lesson.code).toBe(`MAD-FREE-${stamp}`);
    const un = await auth(req().patch(`/admin/chapters/${ch2}/quiz`))
      .send({ lessonId: null })
      .expect(200);
    expect(un.body.lesson).toBeNull();
  });

  it('/admin/lessons memberi badge moduleChapter', async () => {
    const res = await auth(req().get('/admin/lessons')).expect(200);
    const row = res.body.find(
      (l: any) => l.code === `MOD-MAD-${stamp}-2`.toUpperCase(),
    );
    expect(row.moduleChapter).toEqual({
      moduleTitle: `MAD ${stamp}`,
      order: 2,
    });
  });

  it('detail modul: hitungan bab', async () => {
    const list = await auth(req().get('/admin/modules')).expect(200);
    const row = list.body.find((m: any) => m.id === moduleId);
    expect(row).toMatchObject({
      chapterCount: 2,
      quizChapterCount: 0,
      pendingQuizCount: 1,
      readingCount: 1,
    });
  });

  it('status LIVE lalu hapus bab ditolak; DRAFT tanpa sesi boleh', async () => {
    await auth(req().patch(`/admin/modules/${moduleId}`))
      .send({ status: 'LIVE' })
      .expect(200);
    await auth(req().delete(`/admin/chapters/${ch2}`)).expect(409);
    await auth(req().patch(`/admin/modules/${moduleId}`))
      .send({ status: 'DRAFT' })
      .expect(200);
    await auth(req().delete(`/admin/chapters/${ch2}`)).expect(200);
    await auth(req().patch(`/admin/modules/${moduleId}`))
      .send({ status: 'RETIRED' })
      .expect(400); // DRAFT→RETIRED tak diizinkan
  });
});
