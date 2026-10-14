// apps/api/test/session-module.e2e-spec.ts
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Prefix SMO- / smo-.
const PASSWORD = 'Password123!';

describe('POST /session/module (kuis bab)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  let chQuiz: string; // lesson 2 item, belum tuntas
  let chDone: string; // lesson sudah tuntas lewat Perjalanan
  let chReading: string; // tanpa lesson
  let chDraftModule: string;
  let quizItemIds: string[] = [];
  const stamp = Date.now();

  const post = (p: string, body: object) =>
    request(app.getHttpServer())
      .post(p)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  const get = (p: string) =>
    request(app.getHttpServer()).get(p).set('Authorization', `Bearer ${token}`);

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
          code: `SMO-${code}-${stamp}`,
          title: `Kuis ${code}`,
          topic: 'SMO',
          level: 'DASAR',
          cefr: 'A2',
          skill: 'VOCABULARY',
          order: 1,
          status: 'LIVE',
        },
      });
      const ids: string[] = [];
      for (let k = 1; k <= n; k++) {
        ids.push(
          (
            await prisma.item.create({
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
            })
          ).id,
        );
      }
      return { l, ids };
    };
    const q = await lesson('Q', 2);
    const d = await lesson('D', 1);
    quizItemIds = q.ids;

    const mod = await prisma.module.create({
      data: {
        slug: `smo-${stamp}`,
        title: 'SMO',
        summary: 's',
        level: 'DASAR',
        cefr: 'A2',
        order: 1,
        status: 'LIVE',
      },
    });
    const mk = (order: number, lessonId?: string) =>
      prisma.moduleChapter.create({
        data: {
          moduleId: mod.id,
          order,
          title: `Bab ${order}`,
          estMinutes: 5,
          body: 'x',
          blocks: [],
          lessonId,
        },
      });
    chQuiz = (await mk(1, q.l.id)).id;
    chDone = (await mk(2, d.l.id)).id;
    chReading = (await mk(3)).id;
    const draft = await prisma.module.create({
      data: {
        slug: `smo-d-${stamp}`,
        title: 'SMO D',
        summary: 's',
        level: 'DASAR',
        cefr: 'A2',
        order: 2,
      },
    });
    chDraftModule = (
      await prisma.moduleChapter.create({
        data: {
          moduleId: draft.id,
          order: 1,
          title: 'X',
          estMinutes: 5,
          body: 'x',
          blocks: [],
          lessonId: (await lesson('X', 1)).l.id,
        },
      })
    ).id;

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const u = await prisma.user.create({
      data: {
        name: 'SMO',
        email: `smo-${stamp}@ex.com`,
        role: 'USER',
        level: 'DASAR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    userId = u.id;
    const old = await prisma.session.create({
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
        itemId: d.ids[0],
        sessionId: old.id,
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
    const users = { user: { email: { startsWith: 'smo-' } } };
    await prisma.attempt.deleteMany({ where: users });
    await prisma.sessionItem.deleteMany({ where: { session: users } });
    await prisma.session.deleteMany({ where: users });
    await prisma.reviewQueue.deleteMany({ where: users });
    await prisma.moduleChapter.deleteMany({
      where: { module: { slug: { startsWith: 'smo-' } } },
    });
    await prisma.module.deleteMany({ where: { slug: { startsWith: 'smo-' } } });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'SMO-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'SMO-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'smo-' } } });
    await app.close();
  });

  let sessionId: string;

  it('lesson belum tuntas → sesi MODULE berisi item lesson, urut, tanpa review', async () => {
    const res = await post('/session/module', { chapterId: chQuiz }).expect(
      201,
    );
    sessionId = res.body.id;
    expect(res.body.kind).toBe('MODULE');
    expect(res.body.lessonTitle).toBe('Bab 1');
    expect(res.body.moduleSlug).toBe(`smo-${stamp}`);
    expect(res.body.chapterOrder).toBe(1);
    expect(res.body.items.map((i: any) => i.itemId)).toEqual(quizItemIds);
    expect(res.body.items.every((i: any) => i.source === 'LESSON')).toBe(true);
  });

  it('dipanggil lagi → resume sesi yang sama; sesi DAILY tidak terganggu', async () => {
    const again = await post('/session/module', { chapterId: chQuiz }).expect(
      201,
    );
    expect(again.body.id).toBe(sessionId);
    const daily = await post('/session/today', {});
    expect(daily.body.id).not.toBe(sessionId);
  });

  it('selesai → bonus XP, target harian & bab ✓', async () => {
    let last: any;
    for (const itemId of quizItemIds) {
      last = (
        await post(`/session/${sessionId}/answer`, {
          itemId,
          answer: 'A',
        }).expect(201)
      ).body;
    }
    expect(last.summary).not.toBeNull();
    const s = await prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(s.status).toBe('COMPLETED');
    expect(s.xpAwarded).toBeGreaterThan(0);
    const summary = await get('/me/summary').expect(200);
    expect(summary.body.sessionsCompletedToday).toBeGreaterThanOrEqual(1);
    const detail = await get(`/modules/smo-${stamp}`).expect(200);
    expect(detail.body.chapters[0]).toMatchObject({
      done: true,
      accuracy: 100,
    });
  });

  it('lesson sudah tuntas (lewat Perjalanan) → REPLAY tanpa bonus', async () => {
    const res = await post('/session/module', { chapterId: chDone }).expect(
      201,
    );
    expect(res.body.kind).toBe('REPLAY');
    const last = (
      await post(`/session/${res.body.id}/answer`, {
        itemId: res.body.items[0].itemId,
        answer: 'A',
      }).expect(201)
    ).body;
    expect(last.summary).not.toBeNull();
    const s = await prisma.session.findUniqueOrThrow({
      where: { id: res.body.id },
    });
    expect(s.xpAwarded).toBe(0);
  });

  it('bab bacaan → 409; modul DRAFT → 404; chapterId tak valid → 400/404', async () => {
    const r = await post('/session/module', { chapterId: chReading }).expect(
      409,
    );
    expect(r.body.message).toBe('Kuis bab ini belum tersedia');
    await post('/session/module', { chapterId: chDraftModule }).expect(404);
    await post('/session/module', { chapterId: 'tidak-ada' }).expect(404);
    await post('/session/module', {}).expect(400);
  });
});
