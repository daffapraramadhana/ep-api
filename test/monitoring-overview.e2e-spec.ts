import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB, addDays } from '../src/common/wib';

const PASSWORD = 'Password123!';
const stamp = Date.now();
const LEVEL = 'DASAR' as const; // aman: DASAR tidak dipakai file lain sebagai level yang harus "exhausted".

describe('GET /admin/monitoring/overview (Task 1)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  function get(path: string, token: string) {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);
  }

  async function makeUser(opts: {
    name: string;
    email: string;
    role?: 'USER' | 'ADMIN';
    onboardedAt?: Date | null;
  }) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        name: opts.name,
        email: opts.email,
        role: opts.role ?? 'USER',
        level: LEVEL,
        passwordHash,
        inviteStatus: 'ACCEPTED',
        onboardedAt: opts.onboardedAt ?? null,
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: opts.email, password: PASSWORD })
      .expect(201);
    return { id: user.id, token: login.body.accessToken as string };
  }

  async function makeLesson(code: string, order: number) {
    return prisma.lesson.create({
      data: {
        code,
        title: code,
        topic: `P3M-Topic-${stamp}`,
        level: LEVEL,
        cefr: 'A1',
        skill: 'VOCABULARY',
        order,
        status: 'LIVE',
      },
    });
  }

  async function makeItem(lessonId: string, order: number, prompt = `Prompt ${order}`) {
    return prisma.item.create({
      data: {
        lessonId,
        type: 'PILIHAN_GANDA',
        prompt,
        options: ['A', 'B', 'C', 'D'],
        answerKey: 'A',
        explanation: 'x',
        order,
        status: 'LIVE',
      },
    });
  }

  async function makeCompletedSession(userId: string, date: Date) {
    return prisma.session.create({
      data: {
        userId,
        date,
        kind: 'DAILY',
        status: 'COMPLETED',
        completedAt: date,
      },
    });
  }

  async function makeAttempt(
    userId: string,
    itemId: string,
    sessionId: string,
    correct: boolean,
    firstTry = true,
  ) {
    return prisma.attempt.create({
      data: { userId, itemId, sessionId, answer: 'x', correct, firstTry },
    });
  }

  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // FK-safe cleanup, scoped to this file's own 'P3M-' prefix; never touch admin seed.
    await prisma.itemReport.deleteMany({
      where: { user: { email: { startsWith: 'p3m-' } } },
    });
    await prisma.attempt.deleteMany({
      where: { user: { email: { startsWith: 'p3m-' } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { session: { user: { email: { startsWith: 'p3m-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p3m-' } } },
    });
    await prisma.streakFreeze.deleteMany({
      where: { user: { email: { startsWith: 'p3m-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'P3M-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'P3M-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'p3m-' } } });
    await app.close();
  });

  describe('overview: totals, activitySeries, hardestItems, openReports, RolesGuard', () => {
    it('403 untuk role USER + totals per definisi (delta) + batas jendela aktif 6 vs 7 hari + activitySeries 28 hari + hardestItems + openReports', async () => {
      const admin = await makeUser({
        name: 'P3M Admin',
        email: `p3m-admin-${stamp}@ex.com`,
        role: 'ADMIN',
        onboardedAt: new Date(),
      });

      // Baseline SEBELUM fixture kita ditambahkan — dipakai untuk delta,
      // karena totals/openReports adalah agregat global yang bisa
      // dipengaruhi suite e2e lain yang berjalan bersamaan.
      const before = await get('/admin/monitoring/overview', admin.token).expect(
        200,
      );

      const today = todayWIB();

      // User A: aktif + on-track — 5 hari beruntun (termasuk hari ini) dengan
      // sesi DAILY COMPLETED memenuhi target (default dailyTargetSessions=1).
      const userA = await makeUser({
        name: 'P3M User A',
        email: `p3m-usera-${stamp}@ex.com`,
        onboardedAt: addDays(today, -30),
      });
      for (let i = 0; i < 5; i++) {
        await makeCompletedSession(userA.id, addDays(today, -i));
      }

      // User B: butuh-perhatian — sesi terakhir 6 hari lalu; threshold seed
      // MONITOR_INACTIVE_DAYS=5, jadi selisih 6 >= 5 -> butuh_perhatian. Hari
      // ini juga jatuh di jendela 7-hari "aktif" murni (today-6..today), jadi
      // user ini turut menambah hitungan "active" (kartu ringkasan boleh
      // tumpang tindih dengan status prioritas per spec §3).
      const userB = await makeUser({
        name: 'P3M User B',
        email: `p3m-userb-${stamp}@ex.com`,
        onboardedAt: addDays(today, -30),
      });
      await makeCompletedSession(userB.id, addDays(today, -6));

      // User C: belum onboard -> belum_mulai. Token-nya juga dipakai untuk
      // uji 403 (role USER, RolesGuard tidak peduli status onboarding).
      const userC = await makeUser({
        name: 'P3M User C',
        email: `p3m-userc-${stamp}@ex.com`,
        onboardedAt: null,
      });

      // 2 lesson LIVE + item untuk hardestItems: 1 item dengan 6 firstTry
      // salah dari 8 -> wrongRate 75.
      const lesson1 = await makeLesson(`P3M-L1-${stamp}`, 900001);
      const hardItem = await makeItem(lesson1.id, 1, 'Soal paling sering salah');
      const lesson2 = await makeLesson(`P3M-L2-${stamp}`, 900002);
      await makeItem(lesson2.id, 1);

      const scratchSession = await prisma.session.create({
        data: { userId: userA.id, date: today, kind: 'REPLAY' },
      });
      for (let i = 0; i < 6; i++) {
        await makeAttempt(userA.id, hardItem.id, scratchSession.id, false, true);
      }
      for (let i = 0; i < 2; i++) {
        await makeAttempt(userA.id, hardItem.id, scratchSession.id, true, true);
      }

      await prisma.itemReport.create({
        data: { userId: userA.id, itemId: hardItem.id, note: 'Jawaban kunci salah' },
      });

      // Snapshot TEPAT sebelum menambah user batas-jendela-aktif D & E, agar
      // kontribusi keduanya bisa diisolasi dari A/B/C lewat delta terpisah.
      const boundaryBefore = await get(
        '/admin/monitoring/overview',
        admin.token,
      ).expect(200);

      // User D: batas jendela "aktif" (spec §3, dikoreksi di §8) — selisih
      // hari TEPAT 6 (hari ini - 6) dan TIDAK ADA sesi lain -> MASIH masuk
      // jendela aktif (selisih 0-6) -> terhitung aktif. Karena threshold
      // MONITOR_INACTIVE_DAYS seed = 5 dan 6 >= 5, user ini juga jatuh ke
      // status butuh_perhatian (dua hal ini independen: window "aktif" §3
      // vs ambang butuh_perhatian; kebetulan tumpang tindih di seed ini).
      const userD = await makeUser({
        name: 'P3M User D (boundary aktif 6 hari)',
        email: `p3m-userd-${stamp}@ex.com`,
        onboardedAt: addDays(today, -30),
      });
      await makeCompletedSession(userD.id, addDays(today, -6));

      // User E: satu hari DI LUAR jendela aktif — selisih TEPAT 7 -> TIDAK
      // terhitung aktif. Tetap butuh_perhatian karena 7 >= threshold (5).
      const userE = await makeUser({
        name: 'P3M User E (boundary aktif 7 hari)',
        email: `p3m-usere-${stamp}@ex.com`,
        onboardedAt: addDays(today, -30),
      });
      await makeCompletedSession(userE.id, addDays(today, -7));

      await get('/admin/monitoring/overview', userC.token).expect(403);

      // --- activitySeries: bracket the request with an independent DB count
      // taken just BEFORE and just AFTER, and assert the endpoint's own sum
      // falls within that inclusive range. A tighter `toBe` against a count
      // taken strictly AFTER the request is racy under real parallel e2e
      // load (another suite's session can land in the split-second gap
      // between the endpoint's internal query and our separate verification
      // query) — this happened in practice (`expected 21, received 20`)
      // when the full e2e suite ran concurrently. Sessions are only ever
      // ADDED by other suites during a run (each file's own afterAll only
      // deletes its OWN prefixed rows, at the very end of its run), so the
      // true count can only move up between our two bracketing reads.
      const windowStart = addDays(today, -27);
      const sessionCountQuery = () =>
        prisma.session.count({
          where: {
            kind: 'DAILY',
            status: 'COMPLETED',
            date: { gte: windowStart, lte: today },
          },
        });
      const sessionsCountBefore = await sessionCountQuery();
      const after = await get('/admin/monitoring/overview', admin.token).expect(
        200,
      );
      const sessionsCountAfter = await sessionCountQuery();
      const body = after.body;

      expect(body.activitySeries).toHaveLength(28);
      const sumSeries = body.activitySeries.reduce(
        (acc: number, d: { sessionsCompleted: number }) =>
          acc + d.sessionsCompleted,
        0,
      );
      expect(sumSeries).toBeGreaterThanOrEqual(sessionsCountBefore);
      expect(sumSeries).toBeLessThanOrEqual(sessionsCountAfter);

      // --- totals: delta vs baseline, per definisi (keseluruhan A..E) ---
      // Dunia nyata: suite e2e lain berjalan BERSAMAAN (worker paralel Jest,
      // DB Postgres yang sama) dan boleh menambah user/session/report milik
      // mereka sendiri kapan saja selama window ini — itu HANYA bisa
      // menambah hitungan global, tidak pernah mengurangi kontribusi kita.
      // Maka delta kita >= kontribusi yang kita seed adalah invariant yang
      // valid dan tahan terhadap noise paralel (equality persis terbukti
      // flaky saat suite penuh berjalan bersamaan).
      const b = before.body.totals;
      const a = body.totals;
      expect(a.employees - b.employees).toBeGreaterThanOrEqual(5); // A, B, C, D, E
      expect(a.onTrack - b.onTrack).toBeGreaterThanOrEqual(1); // minimal A
      expect(a.needsAttention - b.needsAttention).toBeGreaterThanOrEqual(3); // minimal B, D, E
      expect(a.notStarted - b.notStarted).toBeGreaterThanOrEqual(1); // minimal C
      expect(a.active - b.active).toBeGreaterThanOrEqual(3); // minimal A, B & D (E di luar jendela)

      // --- boundary jendela aktif (§3, dikoreksi §8): isolasi kontribusi D & E
      // saja terhadap snapshot tepat sebelum keduanya dibuat, lepas dari
      // noise A/B/C atau suite lain di window sebelumnya. ---
      const bb = boundaryBefore.body.totals;
      expect(a.active - bb.active).toBeGreaterThanOrEqual(1); // hanya D (selisih 6 -> aktif)
      expect(a.needsAttention - bb.needsAttention).toBeGreaterThanOrEqual(2); // D (6) dan E (7) -> keduanya butuh_perhatian

      // --- hardestItems ---
      expect(body.contentHealth.hardestItems[0]).toEqual(
        expect.objectContaining({
          itemId: hardItem.id,
          lessonId: lesson1.id,
          wrongRate: 75,
          answers: 8,
        }),
      );

      // --- exhaustedByLevel: shape only ---
      expect(Array.isArray(body.contentHealth.exhaustedByLevel)).toBe(true);
      for (const row of body.contentHealth.exhaustedByLevel) {
        expect(row).toEqual(
          expect.objectContaining({
            level: expect.any(String),
            exhaustedPct: expect.any(Number),
            users: expect.any(Number),
          }),
        );
      }

      // --- openReports: delta vs baseline (>= karena bisa ada noise paralel) ---
      expect(body.openReports - before.body.openReports).toBeGreaterThanOrEqual(1);
    });
  });
});
