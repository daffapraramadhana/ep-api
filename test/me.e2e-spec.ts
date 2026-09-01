import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB, addDays, weekStartWIB } from '../src/common/wib';

const PASSWORD = 'Password123!';

describe('GET/PATCH /me, GET /me/summary', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();

  function get(path: string, token: string) {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);
  }
  function patch(path: string, body: Record<string, unknown>, token: string) {
    return request(app.getHttpServer())
      .patch(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  async function makeUser(
    name: string,
    email: string,
    extra: Record<string, unknown> = {},
  ) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: 'USER',
        passwordHash,
        inviteStatus: 'ACCEPTED',
        ...extra,
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);
    return { id: user.id, token: login.body.accessToken as string };
  }

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // FK-safe cleanup, scoped to this file's own 'p2c-me-' sub-prefix — NOT
    // the bare 'p2c-' family prefix, so this doesn't race and delete
    // test/streak.e2e-spec.ts's concurrently-running 'p2c-streak-' fixtures
    // (both files run in parallel Jest workers against the same real DB).
    // Never touches admin.
    await prisma.attempt.deleteMany({
      where: { user: { email: { startsWith: 'p2c-me-' } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { session: { user: { email: { startsWith: 'p2c-me-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p2c-me-' } } },
    });
    await prisma.reviewQueue.deleteMany({
      where: { user: { email: { startsWith: 'p2c-me-' } } },
    });
    await prisma.streakFreeze.deleteMany({
      where: { user: { email: { startsWith: 'p2c-me-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'P2C-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'P2C-' } } });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'p2c-me-' } },
    });
    await app.close();
  });

  describe('GET/PATCH /me — profil & onboarding', () => {
    it('GET sebelum PATCH → onboarded:false; PATCH level+target → onboarded:true & persist', async () => {
      const user = await makeUser('P2C Me User', `p2c-me-${stamp}@ex.com`);

      const before = await get('/me', user.token).expect(200);
      expect(before.body).toMatchObject({
        name: 'P2C Me User',
        email: `p2c-me-${stamp}@ex.com`,
        level: null,
        dailyTargetSessions: 1,
        soundOn: true,
        onboarded: false,
      });

      const patched = await patch(
        '/me',
        { level: 'DASAR', dailyTargetSessions: 2 },
        user.token,
      ).expect(200);
      expect(patched.body.level).toBe('DASAR');
      expect(patched.body.dailyTargetSessions).toBe(2);
      expect(patched.body.onboarded).toBe(true);

      const after = await get('/me', user.token).expect(200);
      expect(after.body.onboarded).toBe(true);
      expect(after.body.level).toBe('DASAR');
      expect(after.body.dailyTargetSessions).toBe(2);

      // A later PATCH that only touches soundOn must not un-onboard the user.
      const soundPatch = await patch(
        '/me',
        { soundOn: false },
        user.token,
      ).expect(200);
      expect(soundPatch.body.onboarded).toBe(true);
      expect(soundPatch.body.soundOn).toBe(false);
    });

    it('PATCH dailyTargetSessions invalid (bukan 1|2) → 400', async () => {
      const user = await makeUser('P2C Me User2', `p2c-me-2-${stamp}@ex.com`);
      const res = await patch(
        '/me',
        { dailyTargetSessions: 3 },
        user.token,
      ).expect(400);
      expect(res.body.message).toBeDefined();
    });

    // I5: tanpa ValidationPipe, `soundOn` non-boolean sebelumnya lolos ke
    // prisma.user.update apa adanya — guard typeof eksplisit di
    // me.controller.ts sekarang menolaknya dengan 400 yang jelas.
    it('PATCH soundOn bukan boolean (string) → 400', async () => {
      const user = await makeUser('P2C Me User2b', `p2c-me-2b-${stamp}@ex.com`);
      const res = await patch(
        '/me',
        { soundOn: 'yes' },
        user.token,
      ).expect(400);
      expect(res.body.message).toBeDefined();
    });

    it('PATCH soundOn saja (level belum diisi) → onboarded tetap false', async () => {
      const user = await makeUser('P2C Me User3', `p2c-me-3-${stamp}@ex.com`);
      const res = await patch('/me', { soundOn: false }, user.token).expect(
        200,
      );
      expect(res.body.soundOn).toBe(false);
      expect(res.body.onboarded).toBe(false);
    });

    it('PATCH voiceConsent → voiceConsentAt terisi sekali, permanen (PATCH kedua tidak mengubah)', async () => {
      const user = await makeUser('P2C Me Voice', `p2c-me-voice-${stamp}@ex.com`);
      const before = await get('/me', user.token).expect(200);
      expect(before.body.voiceConsentAt).toBeNull();

      const first = await patch('/me', { voiceConsent: true }, user.token).expect(
        200,
      );
      expect(typeof first.body.voiceConsentAt).toBe('string');

      const second = await patch('/me', { voiceConsent: true }, user.token).expect(
        200,
      );
      expect(second.body.voiceConsentAt).toBe(first.body.voiceConsentAt);

      const after = await get('/me', user.token).expect(200);
      expect(after.body.voiceConsentAt).toBe(first.body.voiceConsentAt);
    });

    // Tanpa ValidationPipe, guard typeof eksplisit (pola I5) menolak body
    // non-boolean supaya tidak lolos tak-terkontrol ke prisma.user.update.
    it('PATCH voiceConsent bukan boolean → 400', async () => {
      const user = await makeUser(
        'P2C Me Voice2',
        `p2c-me-voice2-${stamp}@ex.com`,
      );
      const res = await patch(
        '/me',
        { voiceConsent: 'yes' },
        user.token,
      ).expect(400);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('GET /me/summary', () => {
    it('xpTotal = attempt+session xp milik user sendiri; sessionsCompletedToday; reviewsDue; freezeAvailableThisWeek', async () => {
      const user = await makeUser(
        'P2C Summary User',
        `p2c-me-summary-${stamp}@ex.com`,
        { level: 'DASAR', dailyTargetSessions: 1 },
      );

      const lesson = await prisma.lesson.create({
        data: {
          code: `P2C-SUM-${stamp}`,
          title: 'P2C Summary Lesson',
          topic: 'x',
          level: 'DASAR',
          cefr: 'A1',
          skill: 'VOCABULARY',
          order: 900,
          status: 'LIVE',
        },
      });
      const item1 = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Q1',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'x',
          order: 1,
          status: 'LIVE',
        },
      });
      const item2 = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Q2',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'x',
          order: 2,
          status: 'LIVE',
        },
      });
      const reviewItem = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Review Q',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'x',
          order: 3,
          status: 'LIVE',
        },
      });
      await prisma.reviewQueue.create({
        data: {
          userId: user.id,
          itemId: reviewItem.id,
          dueDate: todayWIB(),
          correctStreak: 0,
        },
      });

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          date: todayWIB(),
          kind: 'DAILY',
          status: 'COMPLETED',
          xpAwarded: 20,
          completedAt: new Date(),
        },
      });
      await prisma.sessionItem.createMany({
        data: [
          {
            sessionId: session.id,
            itemId: item1.id,
            source: 'LESSON',
            order: 0,
          },
          {
            sessionId: session.id,
            itemId: item2.id,
            source: 'LESSON',
            order: 1,
          },
        ],
      });
      await prisma.attempt.create({
        data: {
          userId: user.id,
          itemId: item1.id,
          sessionId: session.id,
          answer: 'a',
          correct: true,
          firstTry: true,
          xpAwarded: 10,
        },
      });
      await prisma.attempt.create({
        data: {
          userId: user.id,
          itemId: item2.id,
          sessionId: session.id,
          answer: 'a',
          correct: true,
          firstTry: true,
          xpAwarded: 10,
        },
      });

      const res = await get('/me/summary', user.token).expect(200);
      expect(res.body.name).toBe('P2C Summary User');
      expect(res.body.xpTotal).toBe(40); // 10 + 10 (attempts) + 20 (session bonus)
      expect(res.body.sessionsCompletedToday).toBe(1);
      expect(res.body.dailyTarget).toBe(1);
      expect(res.body.reviewsDue).toBe(1);
      expect(res.body.freezeAvailableThisWeek).toBe(true);
      expect(typeof res.body.streak).toBe('number');

      // Consuming this week's freeze flips freezeAvailableThisWeek to false.
      await prisma.streakFreeze.create({
        data: {
          userId: user.id,
          weekStart: weekStartWIB(todayWIB()),
          coveredDate: addDays(todayWIB(), -1),
        },
      });
      const res2 = await get('/me/summary', user.token).expect(200);
      expect(res2.body.freezeAvailableThisWeek).toBe(false);
    });

    it('nextLesson = lesson belum selesai pertama (lesson yang sudah selesai dilewati)', async () => {
      const user = await makeUser(
        'P2C Next User',
        `p2c-me-next-${stamp}@ex.com`,
        {
          level: 'DASAR',
        },
      );

      // Very low order so this always sorts before any other DASAR fixture
      // another e2e file might have LIVE at the same moment (see
      // session-answer.e2e-spec.ts's own comment on this exact hazard).
      const lessonDone = await prisma.lesson.create({
        data: {
          code: `P2C-DONE-${stamp}`,
          title: 'Selesai',
          topic: 'x',
          level: 'DASAR',
          cefr: 'A1',
          skill: 'VOCABULARY',
          order: -1000,
          status: 'LIVE',
        },
      });
      const doneItem = await prisma.item.create({
        data: {
          lessonId: lessonDone.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Done Q',
          options: ['A', 'B'],
          answerKey: 'A',
          explanation: 'x',
          order: 1,
          status: 'LIVE',
        },
      });
      const doneSession = await prisma.session.create({
        data: { userId: user.id, date: todayWIB(), status: 'COMPLETED' },
      });
      await prisma.attempt.create({
        data: {
          userId: user.id,
          itemId: doneItem.id,
          sessionId: doneSession.id,
          answer: 'a',
          correct: true,
          firstTry: true,
          xpAwarded: 10,
        },
      });

      const lessonNext = await prisma.lesson.create({
        data: {
          code: `P2C-NEXT-${stamp}`,
          title: 'Berikutnya',
          topic: 'x',
          level: 'DASAR',
          cefr: 'A1',
          skill: 'VOCABULARY',
          order: -999,
          status: 'LIVE',
        },
      });
      await prisma.item.create({
        data: {
          lessonId: lessonNext.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Next Q1',
          options: ['A', 'B'],
          answerKey: 'A',
          explanation: 'x',
          order: 1,
          status: 'LIVE',
        },
      });
      await prisma.item.create({
        data: {
          lessonId: lessonNext.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Next Q2',
          options: ['A', 'B'],
          answerKey: 'A',
          explanation: 'x',
          order: 2,
          status: 'LIVE',
        },
      });

      const res = await get('/me/summary', user.token).expect(200);
      expect(res.body.contentExhausted).toBe(false);
      expect(res.body.nextLesson).not.toBeNull();
      expect(res.body.nextLesson.id).toBe(lessonNext.id);
      expect(res.body.nextLesson.title).toBe('Berikutnya');
      expect(res.body.nextLesson.topic).toBe('x');
      expect(res.body.nextLesson.itemCount).toBe(2);
      expect(res.body.nextLesson.estMinutes).toBe(2); // ceil(2*0.75) = 2
      expect(res.body.nextLesson.xpEstimate).toBe(2 * 10 + 20 + 15); // 55
    });

    it('contentExhausted true & nextLesson null bila tak ada lesson LIVE di level user (MAHIR sengaja dibiarkan kosong)', async () => {
      // session-assembly.e2e-spec.ts already relies on MAHIR having zero LIVE
      // lessons for its own 409 case — reusing that same convention here
      // instead of seeding a lesson keeps this test from racing that file.
      const user = await makeUser(
        'P2C Exhausted User',
        `p2c-me-exhausted-${stamp}@ex.com`,
        { level: 'MAHIR' },
      );
      const res = await get('/me/summary', user.token).expect(200);
      expect(res.body.contentExhausted).toBe(true);
      expect(res.body.nextLesson).toBeNull();
    });
  });
});
