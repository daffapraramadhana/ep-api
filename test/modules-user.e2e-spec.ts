// apps/api/test/modules-user.e2e-spec.ts
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { parseChapter } from '../src/modules/chapter-parser';

// Prefix MUS- / mus-.
const PASSWORD = 'Password123!';

describe('modul untuk user', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  const stamp = Date.now();
  const slugA = `mus-a-${stamp}`; // MAHIR, 3 bab: kuis (sudah tuntas), kuis (belum), bacaan
  const slugB = `mus-b-${stamp}`; // DASAR
  const slugDraft = `mus-d-${stamp}`;
  const slugEmpty = `mus-e-${stamp}`; // LIVE tanpa bab
  let doneItemId: string;

  const get = (p: string) =>
    request(app.getHttpServer()).get(p).set('Authorization', `Bearer ${token}`);
  const blocks = (body: string) => {
    const r = parseChapter(body);
    if (!r.ok) throw new Error('fixture invalid');
    return r.blocks as any;
  };

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const lesson = async (code: string, n: number) => {
      const l = await prisma.lesson.create({
        data: {
          code: `MUS-${code}-${stamp}`,
          title: code,
          topic: 'MUS',
          level: 'MAHIR',
          cefr: 'C1',
          skill: 'VOCABULARY',
          order: 1,
          status: 'LIVE',
        },
      });
      const ids: string[] = [];
      for (let k = 1; k <= n; k++) {
        const it = await prisma.item.create({
          data: {
            lessonId: l.id,
            type: 'PILIHAN_GANDA',
            prompt: 'p',
            options: ['A', 'B', 'C', 'D'],
            answerKey: 'A',
            explanation: 'e',
            order: k,
            status: 'LIVE',
          },
        });
        ids.push(it.id);
      }
      return { l, ids };
    };
    const l1 = await lesson('L1', 1);
    const l2 = await lesson('L2', 2);
    doneItemId = l1.ids[0];

    const a = await prisma.module.create({
      data: {
        slug: slugA,
        title: 'MUS A',
        summary: 'sa',
        level: 'MAHIR',
        cefr: 'C1',
        order: 1,
        status: 'LIVE',
      },
    });
    await prisma.moduleChapter.createMany({
      data: [
        {
          moduleId: a.id,
          order: 1,
          title: 'Satu',
          estMinutes: 5,
          body: 'Satu',
          blocks: blocks('Satu'),
          lessonId: l1.l.id,
        },
        {
          moduleId: a.id,
          order: 2,
          title: 'Dua',
          estMinutes: 4,
          body: ':::tip\nT\n:::',
          blocks: blocks(':::tip\nT\n:::'),
          lessonId: l2.l.id,
        },
        {
          moduleId: a.id,
          order: 3,
          title: 'Tiga',
          estMinutes: 3,
          body: 'Baca',
          blocks: blocks('Baca'),
        },
      ],
    });
    const b = await prisma.module.create({
      data: {
        slug: slugB,
        title: 'MUS B',
        summary: 'sb',
        level: 'DASAR',
        cefr: 'A2',
        order: 2,
        status: 'LIVE',
      },
    });
    await prisma.moduleChapter.create({
      data: {
        moduleId: b.id,
        order: 1,
        title: 'B1',
        estMinutes: 5,
        body: 'B',
        blocks: blocks('B'),
      },
    });
    // Celah urutan (bab 2..4 pernah dihapus): label harus memakai posisi.
    await prisma.moduleChapter.create({
      data: {
        moduleId: b.id,
        order: 5,
        title: 'B5',
        estMinutes: 5,
        body: 'B',
        blocks: blocks('B'),
      },
    });
    const d = await prisma.module.create({
      data: {
        slug: slugDraft,
        title: 'MUS D',
        summary: 'sd',
        level: 'MAHIR',
        cefr: 'C1',
        order: 3,
      },
    });
    await prisma.moduleChapter.create({
      data: {
        moduleId: d.id,
        order: 1,
        title: 'D1',
        estMinutes: 5,
        body: 'D',
        blocks: blocks('D'),
      },
    });
    await prisma.module.create({
      data: {
        slug: slugEmpty,
        title: 'MUS E',
        summary: 'se',
        level: 'MAHIR',
        cefr: 'C1',
        order: 4,
        status: 'LIVE',
      },
    });

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const u = await prisma.user.create({
      data: {
        name: 'MUS',
        email: `mus-${stamp}@ex.com`,
        role: 'USER',
        level: 'MAHIR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    userId = u.id;
    // Bab 1 tuntas lewat "jalur lain": attempt benar percobaan pertama.
    const s = await prisma.session.create({
      data: {
        userId,
        date: new Date('2026-10-01'),
        kind: 'DAILY',
        status: 'COMPLETED',
      },
    });
    await prisma.attempt.create({
      data: {
        userId,
        itemId: doneItemId,
        sessionId: s.id,
        answer: 'A',
        correct: true,
        firstTry: true,
      },
    });

    token = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: u.email, password: PASSWORD })
        .expect(201)
    ).body.accessToken;
  });

  afterAll(async () => {
    const users = { user: { email: { startsWith: 'mus-' } } };
    await prisma.attempt.deleteMany({ where: users });
    await prisma.sessionItem.deleteMany({ where: { session: users } });
    await prisma.session.deleteMany({ where: users });
    await prisma.moduleChapter.deleteMany({
      where: { module: { slug: { startsWith: 'mus-' } } },
    });
    await prisma.module.deleteMany({ where: { slug: { startsWith: 'mus-' } } });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'MUS-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'MUS-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'mus-' } } });
    await app.close();
  });

  it('GET /modules: forYou sesuai level, others level lain, tanpa DRAFT & tanpa modul kosong', async () => {
    const res = await get('/modules').expect(200);
    const slugs = (xs: any[]) => xs.map((x) => x.slug);
    expect(slugs(res.body.forYou)).toContain(slugA);
    expect(slugs(res.body.others)).toContain(slugB);
    const all = [...slugs(res.body.forYou), ...slugs(res.body.others)];
    expect(all).not.toContain(slugDraft);
    expect(all).not.toContain(slugEmpty);
    const a = res.body.forYou.find((x: any) => x.slug === slugA);
    expect(a).toMatchObject({
      chapterCount: 3,
      quizChapterCount: 2,
      doneCount: 1,
      estMinutes: 12,
    });
    expect(res.body.inProgress.slug).toBe(slugA);
  });

  it('GET /modules/:slug: status per bab + nextOrder', async () => {
    const res = await get(`/modules/${slugA}`).expect(200);
    expect(res.body.nextOrder).toBe(2);
    expect(res.body.chapters).toEqual([
      expect.objectContaining({
        order: 1,
        kind: 'quiz',
        done: true,
        accuracy: 100,
        itemCount: 1,
      }),
      expect.objectContaining({
        order: 2,
        kind: 'quiz',
        done: false,
        accuracy: null,
        itemCount: 2,
      }),
      expect.objectContaining({
        order: 3,
        kind: 'reading',
        done: false,
        itemCount: 0,
      }),
    ]);
  });

  it('GET /modules/:slug/chapters/:order: blocks + kuis + navigasi', async () => {
    const res = await get(`/modules/${slugA}/chapters/2`).expect(200);
    expect(res.body.blocks).toEqual([{ type: 'tip', text: [[{ t: 'T' }]] }]);
    expect(res.body.quiz).toMatchObject({ itemCount: 2, done: false });
    expect(res.body.quiz.estXp).toBeGreaterThan(0);
    expect(res.body).toMatchObject({
      prevOrder: 1,
      nextOrder: 3,
      chapterCount: 3,
      moduleSlug: slugA,
    });
    const done = await get(`/modules/${slugA}/chapters/1`).expect(200);
    expect(done.body.quiz).toMatchObject({ done: true, estXp: null });
    const reading = await get(`/modules/${slugA}/chapters/3`).expect(200);
    expect(reading.body.quiz).toBeNull();
  });

  it('404 untuk modul DRAFT, slug tak dikenal, bab tak ada', async () => {
    const d = await get(`/modules/${slugDraft}`).expect(404);
    expect(d.body.message).toBe('Modul atau bab tidak ditemukan');
    await get(`/modules/${slugDraft}/chapters/1`).expect(404);
    await get('/modules/tidak-ada').expect(404);
    const c = await get(`/modules/${slugA}/chapters/9`).expect(404);
    expect(c.body.message).toBe('Modul atau bab tidak ditemukan');
    await get(`/modules/${slugA}/chapters/abc`).expect(404);
  });

  it('lesson kuis jadi DRAFT → bab dianggap Bacaan', async () => {
    const ch = await prisma.moduleChapter.findFirstOrThrow({
      where: { module: { slug: slugA }, order: 2 },
    });
    await prisma.lesson.update({
      where: { id: ch.lessonId! },
      data: { status: 'DRAFT' },
    });
    const res = await get(`/modules/${slugA}`).expect(200);
    expect(res.body.chapters[1]).toMatchObject({ kind: 'reading' });
    await prisma.lesson.update({
      where: { id: ch.lessonId! },
      data: { status: 'LIVE' },
    });
  });

  it('summary.moduleInProgress menunjuk bab berikutnya', async () => {
    const res = await get('/me/summary').expect(200);
    expect(res.body.moduleInProgress).toEqual({
      slug: slugA,
      title: 'MUS A',
      nextOrder: 2,
      nextPosition: 2,
      nextTitle: 'Dua',
    });
  });

  it('posisi bab (1-based) dipakai untuk label, bukan order', async () => {
    const ch = await get(`/modules/${slugB}/chapters/5`).expect(200);
    expect(ch.body).toMatchObject({
      order: 5,
      position: 2,
      chapterCount: 2,
      prevOrder: 1,
    });
    const d = await get(`/modules/${slugB}`).expect(200);
    expect(d.body.chapters.map((c: any) => c.position)).toEqual([1, 2]);
  });
});
