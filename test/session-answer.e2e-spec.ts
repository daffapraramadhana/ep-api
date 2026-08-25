import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB, addDays } from '../src/common/wib';

const PASSWORD = 'Password123!';

describe('POST /session/:id/answer (grading, xp, review queue, completion)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  function post(path: string, body: Record<string, unknown>, token: string) {
    return request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  const stamp = Date.now();

  async function makeUser(name: string, email: string) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: 'USER',
        level: 'DASAR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);
    return { id: user.id, token: login.body.accessToken as string };
  }

  async function makeLesson(code: string, order: number) {
    return prisma.lesson.create({
      data: {
        code,
        title: code,
        topic: 'P2B Topic',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'VOCABULARY',
        order,
        status: 'LIVE',
      },
    });
  }

  // Task 4 grades answers on top of an EXISTING session — assembly itself
  // (which lesson/review items land in a session) is Task 3's job and is
  // already covered by session-assembly.e2e-spec.ts. That assembly picks the
  // user's earliest-incomplete lesson *for the whole level*, scanning across
  // every LIVE lesson at that level in the DB — not just this file's fixture
  // — so driving it through the real /session/today or /session/replay here
  // would make these tests depend on global level state and race other e2e
  // files when Jest runs suites in parallel. Seeding the session directly
  // keeps this suite scoped to answer.service.ts and safe under parallel runs.
  async function makeSession(
    userId: string,
    kind: 'DAILY' | 'REPLAY',
    rows: { itemId: string; source: 'LESSON' | 'REVIEW' }[],
  ) {
    const session = await prisma.session.create({
      data: { userId, date: todayWIB(), kind, status: 'IN_PROGRESS' },
    });
    await prisma.sessionItem.createMany({
      data: rows.map((r, i) => ({ sessionId: session.id, ...r, order: i })),
    });
    return session.id;
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
    // FK-safe: attempt -> session_item -> session -> review_queue -> item -> lesson -> user
    await prisma.attempt.deleteMany({
      where: { user: { email: { startsWith: 'p2b-' } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { session: { user: { email: { startsWith: 'p2b-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p2b-' } } },
    });
    await prisma.reviewQueue.deleteMany({
      where: { user: { email: { startsWith: 'p2b-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'P2B-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'P2B-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'p2b-' } } });
    await app.close();
  });

  describe('alur inti: benar/salah/retry/already-answered/completion', () => {
    let userA: { id: string; token: string };
    let itemMcId: string;
    let itemIsianId: string;
    let itemSusunId: string;
    let sessionId: string;

    beforeAll(async () => {
      userA = await makeUser('P2B User A', `p2b-usera-${stamp}@ex.com`);
      const lesson = await makeLesson(`P2B-L1-${stamp}`, 1);

      const mc = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Apa arti "cat"?',
          options: ['Kucing', 'Anjing', 'Ikan', 'Burung'],
          answerKey: 'A',
          explanation: 'cat = kucing (opsi A)',
          order: 1,
          status: 'LIVE',
        },
      });
      itemMcId = mc.id;

      const isian = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'ISIAN',
          prompt: 'I ___ a student.',
          answerKey: 'am',
          acceptedAnswers: ['am'],
          explanation: 'Gunakan am.',
          order: 2,
          status: 'LIVE',
        },
      });
      itemIsianId = isian.id;

      const susun = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'SUSUN_KALIMAT',
          prompt: 'Susun kalimat.',
          answerKey: 'I go to school today',
          explanation: 'SPOK.',
          order: 3,
          status: 'LIVE',
        },
      });
      itemSusunId = susun.id;

      sessionId = await makeSession(userA.id, 'DAILY', [
        { itemId: itemMcId, source: 'LESSON' },
        { itemId: itemIsianId, source: 'LESSON' },
        { itemId: itemSusunId, source: 'LESSON' },
      ]);
    });

    it('jawab benar (first try) → correct:true, xpAwarded:10, attempt firstTry tercatat', async () => {
      const res = await post(
        `/session/${sessionId}/answer`,
        { itemId: itemMcId, answer: 'a' },
        userA.token,
      ).expect(201);
      expect(res.body.correct).toBe(true);
      expect(res.body.xpAwarded).toBe(10);
      expect(res.body.correctAnswer).toBeNull();
      expect(res.body.sessionCompleted).toBe(false);

      const attempt = await prisma.attempt.findFirst({
        where: { sessionId, itemId: itemMcId, userId: userA.id },
      });
      expect(attempt?.correct).toBe(true);
      expect(attempt?.firstTry).toBe(true);
      expect(attempt?.xpAwarded).toBe(10);
    });

    it('item sudah dijawab benar → 400', async () => {
      const res = await post(
        `/session/${sessionId}/answer`,
        { itemId: itemMcId, answer: 'a' },
        userA.token,
      ).expect(400);
      expect(res.body.message).toBe('Soal ini sudah dijawab benar');
    });

    it('jawab salah → correctAnswer terisi + review_queue due besok', async () => {
      const res = await post(
        `/session/${sessionId}/answer`,
        { itemId: itemIsianId, answer: 'is' },
        userA.token,
      ).expect(201);
      expect(res.body.correct).toBe(false);
      expect(res.body.xpAwarded).toBe(0);
      expect(res.body.correctAnswer).toBe('am');
      expect(res.body.sessionCompleted).toBe(false);

      const rq = await prisma.reviewQueue.findUnique({
        where: { userId_itemId: { userId: userA.id, itemId: itemIsianId } },
      });
      expect(rq).not.toBeNull();
      expect(rq?.correctStreak).toBe(0);
      expect(rq?.dueDate.toISOString()).toBe(
        addDays(todayWIB(), 1).toISOString(),
      );
    });

    it('jawab ulang benar → xp 2 (firstTry false)', async () => {
      const res = await post(
        `/session/${sessionId}/answer`,
        { itemId: itemIsianId, answer: 'AM' },
        userA.token,
      ).expect(201);
      expect(res.body.correct).toBe(true);
      expect(res.body.xpAwarded).toBe(2);

      const attempt = await prisma.attempt.findFirst({
        where: {
          sessionId,
          itemId: itemIsianId,
          userId: userA.id,
          correct: true,
        },
      });
      expect(attempt?.firstTry).toBe(false);
      expect(attempt?.xpAwarded).toBe(2);
    });

    it('menyelesaikan semua item → sessionCompleted true, accuracyFirstTry & xpAwarded sesi benar', async () => {
      const res = await post(
        `/session/${sessionId}/answer`,
        { itemId: itemSusunId, answer: 'I go to school today' },
        userA.token,
      ).expect(201);
      expect(res.body.sessionCompleted).toBe(true);
      expect(res.body.summary).not.toBeNull();
      // item1 (MC) benar first-try, item2 (ISIAN) SALAH first-try lalu retry
      // benar, item3 (SUSUN) benar first-try → 2/3 first-try-in-session benar.
      expect(res.body.summary.accuracyFirstTry).toBe(67);
      // userA is fresh (no prior DAILY-completed sessions) with the default
      // dailyTargetSessions=1, so this very completion is what makes today
      // "met" for the first time: streak becomes exactly 1 and streakChanged
      // is true (real StreakService, not the Task-5 stub).
      expect(res.body.summary.streak).toBe(1);
      expect(res.body.summary.streakChanged).toBe(true);
      expect(res.body.summary.milestone).toBeNull();

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });
      expect(session?.status).toBe('COMPLETED');
      expect(session?.completedAt).not.toBeNull();
      // Bukan sesi perfect (item ISIAN sempat salah) → hanya XP_SESSION_COMPLETE
      // pada session.xpAwarded (kolom bonus-saja, tidak berubah oleh I1).
      expect(session?.xpAwarded).toBe(20);
      // I1: summary.xpSession = SUM(attempt.xpAwarded di sesi ini) + bonus,
      // bukan bonus saja. Attempt xp di sesi ini: MC 10 (first-try) + ISIAN
      // 0 (salah) + ISIAN 2 (retry benar) + SUSUN 10 (first-try) = 22;
      // bonus xpSessionComplete = 20 (bukan perfect) → 22 + 20 = 42.
      expect(res.body.summary.xpSession).toBe(42);
    });
  });

  describe('sesi perfect (semua benar first-try) → bonus XP_PERFECT_SESSION', () => {
    it('xpAwarded sesi = 20 + 15', async () => {
      const userB = await makeUser('P2B User B', `p2b-userb-${stamp}@ex.com`);
      const lesson = await makeLesson(`P2B-L2-${stamp}`, 2);
      const item1 = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Q1',
          options: ['Kucing', 'Anjing', 'Ikan', 'Burung'],
          answerKey: 'B',
          explanation: 'x',
          order: 1,
          status: 'LIVE',
        },
      });
      const item2 = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'ISIAN',
          prompt: 'Q2',
          answerKey: 'is',
          acceptedAnswers: ['is'],
          explanation: 'x',
          order: 2,
          status: 'LIVE',
        },
      });

      const sessionId = await makeSession(userB.id, 'DAILY', [
        { itemId: item1.id, source: 'LESSON' },
        { itemId: item2.id, source: 'LESSON' },
      ]);

      await post(
        `/session/${sessionId}/answer`,
        { itemId: item1.id, answer: 'b' },
        userB.token,
      ).expect(201);
      const final = await post(
        `/session/${sessionId}/answer`,
        { itemId: item2.id, answer: 'IS' },
        userB.token,
      ).expect(201);

      expect(final.body.sessionCompleted).toBe(true);
      expect(final.body.summary.accuracyFirstTry).toBe(100);
      // I1: attempt xp di sesi ini = item1 10 + item2 10 = 20 (keduanya
      // first-try benar); bonus = xpSessionComplete 20 + xpPerfectSession 15
      // = 35 → xpSession = 20 + 35 = 55.
      expect(final.body.summary.xpSession).toBe(55);

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });
      // session.xpAwarded tetap kolom bonus-saja (tidak berubah oleh I1).
      expect(session?.xpAwarded).toBe(35);
    });
  });

  describe('sesi REPLAY selesai → tanpa bonus completion/perfect', () => {
    it('session.xpAwarded tetap 0 meski semua benar first-try', async () => {
      const userC = await makeUser('P2B User C', `p2b-userc-${stamp}@ex.com`);
      const lesson = await makeLesson(`P2B-L3-${stamp}`, 3);
      const item1 = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Q1',
          options: ['Kucing', 'Anjing', 'Ikan', 'Burung'],
          answerKey: 'C',
          explanation: 'x',
          order: 1,
          status: 'LIVE',
        },
      });

      // Sesi REPLAY nyata selalu berisi item source=LESSON (lihat
      // SessionService.replay di session.service.ts) — seed langsung dengan
      // kind='REPLAY' supaya perilaku "tanpa bonus" answer.service.ts yang
      // diuji, bukan validasi "lesson belum selesai" milik Task 3.
      const replaySessionId = await makeSession(userC.id, 'REPLAY', [
        { itemId: item1.id, source: 'LESSON' },
      ]);

      const final = await post(
        `/session/${replaySessionId}/answer`,
        { itemId: item1.id, answer: 'c' },
        userC.token,
      ).expect(201);
      expect(final.body.sessionCompleted).toBe(true);
      // I1: REPLAY tidak dapat bonus (bonusXp = 0), tapi attempt xp tetap
      // dihitung — item1 first-try benar = xpFirstTry 10 → xpSession = 10,
      // BUKAN 0. Sebelum fix ini adalah kasus yang paling kentara: replay
      // sesi selesai penuh dulu selalu tampil 0 XP di layar perayaan.
      expect(final.body.summary.xpSession).toBe(10);

      const replaySession = await prisma.session.findUnique({
        where: { id: replaySessionId },
      });
      // session.xpAwarded (kolom bonus-saja) tetap 0 untuk REPLAY.
      expect(replaySession?.xpAwarded).toBe(0);
    });
  });

  describe('cap review harian (XP_DAILY_REVIEW_CAP)', () => {
    it('xp jawaban REVIEW = 0 saat total xp review hari ini sudah >= cap', async () => {
      const userD = await makeUser('P2B User D', `p2b-userd-${stamp}@ex.com`);
      const lesson = await makeLesson(`P2B-L4-${stamp}`, 4);
      const priorItem = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Prior review item',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'x',
          order: 1,
          status: 'LIVE',
        },
      });
      const capItem = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Cap-test review item',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'x',
          order: 2,
          status: 'LIVE',
        },
      });

      // Seed a REVIEW-sourced attempt earlier today already worth the full
      // XP_DAILY_REVIEW_CAP (100), attached to its own (completed) session so
      // reviewXpToday() sees it as "used up" before the real API call.
      const priorSession = await prisma.session.create({
        data: { userId: userD.id, date: todayWIB(), status: 'COMPLETED' },
      });
      await prisma.sessionItem.create({
        data: {
          sessionId: priorSession.id,
          itemId: priorItem.id,
          source: 'REVIEW',
          order: 0,
        },
      });
      await prisma.attempt.create({
        data: {
          userId: userD.id,
          itemId: priorItem.id,
          sessionId: priorSession.id,
          answer: 'A',
          correct: true,
          firstTry: true,
          xpAwarded: 100,
        },
      });

      // Build a fresh IN_PROGRESS session with a REVIEW-sourced item to
      // answer through the real endpoint.
      const capSession = await prisma.session.create({
        data: { userId: userD.id, date: todayWIB(), status: 'IN_PROGRESS' },
      });
      await prisma.sessionItem.create({
        data: {
          sessionId: capSession.id,
          itemId: capItem.id,
          source: 'REVIEW',
          order: 0,
        },
      });

      const res = await post(
        `/session/${capSession.id}/answer`,
        { itemId: capItem.id, answer: 'a' },
        userD.token,
      ).expect(201);
      expect(res.body.correct).toBe(true);
      expect(res.body.xpAwarded).toBe(0);
    });
  });

  describe('review_queue: progres benar berturut-turut (SM-2-ish)', () => {
    // Ladder ruling: the "due tomorrow" set when an item was first answered
    // wrong already counts as rung 1 of [1,3,7]. So a CORRECT review answer
    // indexes the ladder by the POST-increment streak: first correct review
    // (streak 0→1) lands on rung 2 (+3 days), second (1→2) on rung 3
    // (+7 days), third (2→3) masters the item (row deleted).
    it('benar pertama di REVIEW: correctStreak 0→1, dueDate = +3 hari', async () => {
      const userE = await makeUser('P2B User E', `p2b-usere-${stamp}@ex.com`);
      const lesson = await makeLesson(`P2B-L5-${stamp}`, 5);
      const item = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Review streak item',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'x',
          order: 1,
          status: 'LIVE',
        },
      });
      await prisma.reviewQueue.create({
        data: {
          userId: userE.id,
          itemId: item.id,
          dueDate: todayWIB(),
          correctStreak: 0,
        },
      });
      const session = await prisma.session.create({
        data: { userId: userE.id, date: todayWIB(), status: 'IN_PROGRESS' },
      });
      await prisma.sessionItem.create({
        data: {
          sessionId: session.id,
          itemId: item.id,
          source: 'REVIEW',
          order: 0,
        },
      });

      await post(
        `/session/${session.id}/answer`,
        { itemId: item.id, answer: 'a' },
        userE.token,
      ).expect(201);

      const rq = await prisma.reviewQueue.findUnique({
        where: { userId_itemId: { userId: userE.id, itemId: item.id } },
      });
      expect(rq?.correctStreak).toBe(1);
      expect(rq?.dueDate.toISOString()).toBe(
        addDays(todayWIB(), 3).toISOString(),
      );
    });

    it('benar kedua di REVIEW: correctStreak 1→2, dueDate = +7 hari', async () => {
      const userG = await makeUser('P2B User G', `p2b-userg-${stamp}@ex.com`);
      const lesson = await makeLesson(`P2B-L7-${stamp}`, 7);
      const item = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Review streak item 2',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'x',
          order: 1,
          status: 'LIVE',
        },
      });
      await prisma.reviewQueue.create({
        data: {
          userId: userG.id,
          itemId: item.id,
          dueDate: todayWIB(),
          correctStreak: 1,
        },
      });
      const session = await prisma.session.create({
        data: { userId: userG.id, date: todayWIB(), status: 'IN_PROGRESS' },
      });
      await prisma.sessionItem.create({
        data: {
          sessionId: session.id,
          itemId: item.id,
          source: 'REVIEW',
          order: 0,
        },
      });

      await post(
        `/session/${session.id}/answer`,
        { itemId: item.id, answer: 'a' },
        userG.token,
      ).expect(201);

      const rq = await prisma.reviewQueue.findUnique({
        where: { userId_itemId: { userId: userG.id, itemId: item.id } },
      });
      expect(rq?.correctStreak).toBe(2);
      expect(rq?.dueDate.toISOString()).toBe(
        addDays(todayWIB(), 7).toISOString(),
      );
    });

    it('correctStreak sudah 2, benar lagi → streak baru 3 → baris dihapus (mastered)', async () => {
      const userF = await makeUser('P2B User F', `p2b-userf-${stamp}@ex.com`);
      const lesson = await makeLesson(`P2B-L6-${stamp}`, 6);
      const item = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Review mastery item',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'x',
          order: 1,
          status: 'LIVE',
        },
      });
      await prisma.reviewQueue.create({
        data: {
          userId: userF.id,
          itemId: item.id,
          dueDate: todayWIB(),
          correctStreak: 2,
        },
      });
      const session = await prisma.session.create({
        data: { userId: userF.id, date: todayWIB(), status: 'IN_PROGRESS' },
      });
      await prisma.sessionItem.create({
        data: {
          sessionId: session.id,
          itemId: item.id,
          source: 'REVIEW',
          order: 0,
        },
      });

      await post(
        `/session/${session.id}/answer`,
        { itemId: item.id, answer: 'a' },
        userF.token,
      ).expect(201);

      const rq = await prisma.reviewQueue.findUnique({
        where: { userId_itemId: { userId: userF.id, itemId: item.id } },
      });
      expect(rq).toBeNull();
    });
  });
});
