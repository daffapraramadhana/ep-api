import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB, addDays, weekStartWIB } from '../src/common/wib';

const PASSWORD = 'Password123!';
const stamp = Date.now();

// DASAR is used by several other e2e files (real LIVE content coexists in
// the DB while Jest runs suites in parallel), but none of them depend on
// DASAR being *exhausted* (unlike MENENGAH — relied on by
// session-assembly.e2e-spec.ts's "sesi penguatan" case — or MAHIR — relied
// on by that same file's 409 case and by me.e2e-spec.ts's contentExhausted
// case — both of which assert on a level having *zero* LIVE lessons for a
// fresh user). Adding a few more LIVE DASAR lessons here doesn't break any
// of those. me.e2e-spec.ts's own DASAR fixture there deliberately uses
// order -1000/-999 to always win the "earliest not-done lesson" pick
// against whatever *else* is LIVE at DASAR — we stay clear of (never go
// more negative than) that range so we don't steal its pick.
const LEVEL = 'DASAR' as const;

describe('Journey / Progress / Item Report (Task 6)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  function get(path: string, token: string) {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);
  }
  function post(path: string, body: Record<string, unknown>, token: string) {
    return request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  async function makeUser(
    name: string,
    email: string,
    role: 'USER' | 'ADMIN' = 'USER',
  ) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        level: LEVEL,
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

  async function makeLesson(
    code: string,
    topic: string,
    order: number,
    skill: 'VOCABULARY' | 'GRAMMAR' | 'LISTENING' | 'READING' = 'VOCABULARY',
  ) {
    return prisma.lesson.create({
      data: {
        code,
        title: code,
        topic,
        level: LEVEL,
        cefr: 'A1',
        skill,
        order,
        status: 'LIVE',
      },
    });
  }

  async function makeItem(lessonId: string, order: number) {
    return prisma.item.create({
      data: {
        lessonId,
        type: 'PILIHAN_GANDA',
        prompt: `Prompt ${order}`,
        options: ['A', 'B', 'C', 'D'],
        answerKey: 'A',
        explanation: 'x',
        order,
        status: 'LIVE',
      },
    });
  }

  async function makeSession(userId: string) {
    return prisma.session.create({ data: { userId, date: todayWIB() } });
  }

  async function makeAttempt(
    userId: string,
    itemId: string,
    sessionId: string,
    correct: boolean,
    firstTry: boolean,
  ) {
    return prisma.attempt.create({
      data: { userId, itemId, sessionId, answer: 'x', correct, firstTry },
    });
  }

  /**
   * GET /journey ranks lesson state ('done'/'now'/'locked') by walking
   * *every* LIVE lesson at the user's level in GLOBAL order — not just the
   * ones this test created. DASAR already has real LIVE content from other
   * concurrently-running e2e files, and a brand-new user has never
   * attempted any of it, so without this helper those foreign lessons
   * would be seen as "not done" and could wrongly become this test's
   * 'now'/'locked' cutoff ahead of its own fixtures (`excludeLessonIds`,
   * i.e. never touching this test's own carefully-partial-completed
   * fixtures). Marking every OTHER currently-LIVE DASAR item first-try
   * correct for this test's own (otherwise untouched) user neutralizes
   * that — it only adds Attempt rows keyed by *this* userId, so it has
   * zero effect on any other file's own users/tests.
   *
   * Runs as a converging loop (re-checking what's still missing) rather
   * than a single snapshot, and is called as the LAST step right before
   * the actual request, to shrink — not eliminate, but make practically
   * negligible — the window in which a concurrently-running file could add
   * a brand-new LIVE lesson this helper hasn't seen yet.
   */
  async function completeAllOtherLiveLessons(
    userId: string,
    sessionId: string,
    excludeLessonIds: string[],
  ) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const lessons = await prisma.lesson.findMany({
        where: {
          level: LEVEL,
          status: 'LIVE',
          id: { notIn: excludeLessonIds },
        },
        select: { items: { where: { status: 'LIVE' }, select: { id: true } } },
      });
      const itemIds = lessons.flatMap((l) => l.items.map((i) => i.id));
      if (!itemIds.length) return;

      const already = await prisma.attempt.findMany({
        where: { userId, itemId: { in: itemIds }, correct: true },
        select: { itemId: true },
      });
      const alreadySet = new Set(already.map((a) => a.itemId));
      const missing = itemIds.filter((id) => !alreadySet.has(id));
      if (!missing.length) return; // converged: nothing left to complete

      await prisma.attempt.createMany({
        data: missing.map((itemId) => ({
          userId,
          itemId,
          sessionId,
          answer: 'x',
          correct: true,
          firstTry: true,
        })),
      });
    }
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
    // FK-safe cleanup, scoped to this file's own 'p2d-' / 'P2D-' prefixes.
    await prisma.itemReport.deleteMany({
      where: { user: { email: { startsWith: 'p2d-' } } },
    });
    await prisma.attempt.deleteMany({
      where: { user: { email: { startsWith: 'p2d-' } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { session: { user: { email: { startsWith: 'p2d-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p2d-' } } },
    });
    await prisma.streakFreeze.deleteMany({
      where: { user: { email: { startsWith: 'p2d-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'P2D-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'P2D-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'p2d-' } } });
    await app.close();
  });

  describe('GET /journey', () => {
    const topicGreet = `P2D-Greetings-${stamp}`;
    const topicFam = `P2D-Family-${stamp}`;

    it('topics diurutkan by min lesson order; states & accuracy sesuai aturan global order', async () => {
      const user = await makeUser(
        'P2D Journey User',
        `p2d-journey-${stamp}@ex.com`,
      );
      const session = await makeSession(user.id);

      // L1: Greetings, order 101 — fully done, both items firstTry-correct
      // -> accuracy 100.
      const l1 = await makeLesson(`P2D-J1-${stamp}`, topicGreet, 101);
      const i1a = await makeItem(l1.id, 1);
      const i1b = await makeItem(l1.id, 2);
      await makeAttempt(user.id, i1a.id, session.id, true, true);
      await makeAttempt(user.id, i1b.id, session.id, true, true);
      const lessonGreet1Id = l1.id;

      // L2: Family, order 102 — fully done (every item has a correct
      // attempt) but one item was only correct on a RETRY, not firstTry
      // -> accuracy 50 (1 of 2 items firstTry-correct).
      const l2 = await makeLesson(`P2D-F1-${stamp}`, topicFam, 102);
      const i2a = await makeItem(l2.id, 1);
      const i2b = await makeItem(l2.id, 2);
      await makeAttempt(user.id, i2a.id, session.id, true, true);
      await makeAttempt(user.id, i2b.id, session.id, false, true);
      await makeAttempt(user.id, i2b.id, session.id, true, false);
      const lessonFam1Id = l2.id;

      // L3: Greetings, order 103 — NOT done (item still wrong) -> this is
      // the first not-done lesson in GLOBAL order -> state 'now'.
      const l3 = await makeLesson(`P2D-J2-${stamp}`, topicGreet, 103);
      const i3a = await makeItem(l3.id, 1);
      await makeAttempt(user.id, i3a.id, session.id, false, true);
      const lessonGreet2Id = l3.id;

      // L4: Family, order 104 — fully done, BUT comes after the 'now'
      // lesson in global order -> state must still be 'locked', and
      // accuracy must be null even though it is actually done.
      const l4 = await makeLesson(`P2D-F2-${stamp}`, topicFam, 104);
      const i4a = await makeItem(l4.id, 1);
      await makeAttempt(user.id, i4a.id, session.id, true, true);
      const lessonFam2Id = l4.id;

      // Neutralize every OTHER file's LIVE DASAR content for this fresh
      // user right before the request — see helper doc above. A brand new
      // lesson from a concurrently-running file could in principle still
      // land in the tiny gap between that neutralization and this request;
      // detect that (lessonGreet1 would wrongly show up as 'locked'
      // instead of 'done') and re-neutralize + retry, converging almost
      // certainly within a couple of attempts.
      async function requestJourneyConverged() {
        let last = await get('/journey', user.token).expect(200);
        for (let attempt = 0; attempt < 2; attempt++) {
          const greetSoFar = last.body.topics.find(
            (t: any) => t.topic === topicGreet,
          );
          const g1SoFar = greetSoFar?.lessons.find(
            (l: any) => l.id === lessonGreet1Id,
          );
          if (g1SoFar?.state === 'done') break;
          await completeAllOtherLiveLessons(user.id, session.id, [
            l1.id,
            l2.id,
            l3.id,
            l4.id,
          ]);
          last = await get('/journey', user.token).expect(200);
        }
        return last;
      }

      await completeAllOtherLiveLessons(user.id, session.id, [
        l1.id,
        l2.id,
        l3.id,
        l4.id,
      ]);
      const res = await requestJourneyConverged();

      const topicNames: string[] = res.body.topics.map((t: any) => t.topic);
      // Only assert the RELATIVE order of our own two topics — other
      // concurrently-live DASAR topics (from other e2e files) may also be
      // present in the response and are irrelevant here.
      const ourTopicIndexes = [topicGreet, topicFam].map((t) =>
        topicNames.indexOf(t),
      );
      expect(ourTopicIndexes).toEqual([...ourTopicIndexes].sort((a, b) => a - b));
      expect(ourTopicIndexes.every((i) => i >= 0)).toBe(true);

      const greet = res.body.topics.find((t: any) => t.topic === topicGreet);
      expect(
        greet.lessons.map((l: any) => ({
          id: l.id,
          state: l.state,
          accuracy: l.accuracy,
        })),
      ).toEqual([
        { id: lessonGreet1Id, state: 'done', accuracy: 100 },
        { id: lessonGreet2Id, state: 'now', accuracy: null },
      ]);

      const fam = res.body.topics.find((t: any) => t.topic === topicFam);
      expect(
        fam.lessons.map((l: any) => ({
          id: l.id,
          state: l.state,
          accuracy: l.accuracy,
        })),
      ).toEqual([
        { id: lessonFam1Id, state: 'done', accuracy: 50 },
        { id: lessonFam2Id, state: 'locked', accuracy: null },
      ]);
    });
  });

  describe('GET /progress', () => {
    let user: { id: string; token: string };
    const today = todayWIB();
    const wStart = weekStartWIB(today);

    beforeAll(async () => {
      user = await makeUser(
        'P2D Progress User',
        `p2d-progress-${stamp}@ex.com`,
      );
      const session = await makeSession(user.id);

      // VOCABULARY lesson: 2 items, only firstTry attempts should count —
      // v2's retry-correct must NOT be counted as a second "answered".
      const lv = await makeLesson(
        `P2D-SKV-${stamp}`,
        `P2D-SkillVocab-${stamp}`,
        20001,
        'VOCABULARY',
      );
      const v1 = await makeItem(lv.id, 1);
      const v2 = await makeItem(lv.id, 2);
      await makeAttempt(user.id, v1.id, session.id, true, true);
      await makeAttempt(user.id, v2.id, session.id, false, true);
      await makeAttempt(user.id, v2.id, session.id, true, false);

      // GRAMMAR lesson: 1 item, firstTry correct.
      const lg = await makeLesson(
        `P2D-SKG-${stamp}`,
        `P2D-SkillGrammar-${stamp}`,
        20002,
        'GRAMMAR',
      );
      const g1 = await makeItem(lg.id, 1);
      await makeAttempt(user.id, g1.id, session.id, true, true);

      // A third fully-done lesson to exercise totals.lessonsDone — plus an
      // explicitly NOT-done lesson (no correct attempt at all) proving
      // lessonsDone only counts truly-completed lessons, not merely
      // lessons this user has touched. (lessonsDone is safe from any
      // pre-existing DASAR content regardless: it only sums TRUE entries
      // in the per-user completion map, and lessons this user never
      // touched are simply false/excluded.)
      const ld = await makeLesson(
        `P2D-LD-${stamp}`,
        `P2D-DoneTopic-${stamp}`,
        20003,
        'READING',
      );
      const d1 = await makeItem(ld.id, 1);
      await makeAttempt(user.id, d1.id, session.id, true, true);

      const lnd = await makeLesson(
        `P2D-ND-${stamp}`,
        `P2D-NotDoneTopic-${stamp}`,
        20004,
        'READING',
      );
      const nd1 = await makeItem(lnd.id, 1);
      await makeAttempt(user.id, nd1.id, session.id, false, true);

      // Week fixture: Monday of the current WIB week has a COMPLETED DAILY
      // session -> 'active'; Tuesday is covered by a StreakFreeze -> 'frozen'.
      const activeDay = addDays(wStart, 0);
      await prisma.session.create({
        data: {
          userId: user.id,
          date: activeDay,
          kind: 'DAILY',
          status: 'COMPLETED',
          completedAt: activeDay,
        },
      });
      const frozenDay = addDays(wStart, 1);
      await prisma.streakFreeze.create({
        data: { userId: user.id, weekStart: wStart, coveredDate: frozenDay },
      });
    });

    it('skills dihitung dari firstTry saja; week active/frozen/empty; totals benar', async () => {
      const res = await get('/progress', user.token).expect(200);

      const vocab = res.body.skills.find((s: any) => s.skill === 'VOCABULARY');
      expect(vocab.answered).toBe(2);
      expect(vocab.accuracy).toBe(50);

      const grammar = res.body.skills.find((s: any) => s.skill === 'GRAMMAR');
      expect(grammar.answered).toBe(1);
      expect(grammar.accuracy).toBe(100);

      const listening = res.body.skills.find(
        (s: any) => s.skill === 'LISTENING',
      );
      expect(listening.answered).toBe(0);
      expect(listening.accuracy).toBeNull();

      expect(res.body.week).toHaveLength(7);
      expect(res.body.week[0].date).toBe(wStart.toISOString().slice(0, 10));
      expect(res.body.week[0].state).toBe('active');
      expect(res.body.week[1].state).toBe('frozen');
      for (let i = 2; i < 7; i++) {
        expect(res.body.week[i].state).toBe('empty');
      }

      // lv (VOCABULARY, both items eventually correct), lg (GRAMMAR) and ld
      // (READING) are all fully done; lnd (READING, still wrong) is not.
      // (Any pre-existing DASAR lessons this user never touched only add
      // `false` entries to the completion map and don't affect this count.)
      expect(res.body.totals.lessonsDone).toBe(3);
      expect(typeof res.body.totals.xpTotal).toBe('number');
      expect(typeof res.body.totals.longestStreak).toBe('number');
    });
  });

  describe('POST /items/:id/report', () => {
    let user: { id: string; token: string };
    let admin: { id: string; token: string };
    let itemId: string;

    beforeAll(async () => {
      user = await makeUser('P2D Report User', `p2d-report-${stamp}@ex.com`);
      admin = await makeUser(
        'P2D Report Admin',
        `p2d-reportadmin-${stamp}@ex.com`,
        'ADMIN',
      );
      const lesson = await makeLesson(
        `P2D-RPT-${stamp}`,
        `P2D-ReportTopic-${stamp}`,
        30001,
      );
      const item = await makeItem(lesson.id, 1);
      itemId = item.id;
    });

    it('note kosong -> 400', async () => {
      await post(`/items/${itemId}/report`, { note: '' }, user.token).expect(
        400,
      );
    });

    it('note < 3 karakter -> 400', async () => {
      await post(
        `/items/${itemId}/report`,
        { note: 'ab' },
        user.token,
      ).expect(400);
    });

    it('note > 500 karakter -> 400', async () => {
      await post(
        `/items/${itemId}/report`,
        { note: 'x'.repeat(501) },
        user.token,
      ).expect(400);
    });

    it('note valid (role USER) -> 201, tersimpan status OPEN', async () => {
      await post(
        `/items/${itemId}/report`,
        { note: 'Soal ini jawabannya salah' },
        user.token,
      ).expect(201);

      const row = await prisma.itemReport.findFirst({
        where: { userId: user.id, itemId },
      });
      expect(row).not.toBeNull();
      expect(row?.status).toBe('OPEN');
      expect(row?.note).toBe('Soal ini jawabannya salah');
    });

    // I6 regresi: report kedua oleh USER YANG SAMA pada ITEM YANG SAMA harus
    // upsert (refresh note + status), bukan menambah baris kedua tanpa batas
    // — @@unique([userId, itemId]) di ItemReport + POST .../report yang kini
    // upsert, bukan create.
    it('report kedua kali oleh user yang sama pada item yang sama → upsert, bukan baris baru', async () => {
      await post(
        `/items/${itemId}/report`,
        { note: 'Laporan kedua, note diperbarui' },
        user.token,
      ).expect(201);

      const rows = await prisma.itemReport.findMany({
        where: { userId: user.id, itemId },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].note).toBe('Laporan kedua, note diperbarui');
      expect(rows[0].status).toBe('OPEN');
    });

    it('role ADMIN juga boleh report (JwtAuthGuard saja, tanpa RolesGuard)', async () => {
      await post(
        `/items/${itemId}/report`,
        { note: 'Laporan dari admin' },
        admin.token,
      ).expect(201);
    });
  });
});
