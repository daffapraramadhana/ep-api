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
const LEVEL = 'MENENGAH' as const; // beda dari monitoring-overview.e2e-spec.ts (DASAR) supaya isolasi exhaustedByLevel/lessons.

describe('GET /admin/monitoring/employees (Task 2)', () => {
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
    dailyTargetSessions?: number;
    level?: typeof LEVEL | null;
  }) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        name: opts.name,
        email: opts.email,
        role: opts.role ?? 'USER',
        level: opts.level === undefined ? LEVEL : opts.level,
        passwordHash,
        inviteStatus: 'ACCEPTED',
        onboardedAt: opts.onboardedAt ?? null,
        dailyTargetSessions: opts.dailyTargetSessions ?? 1,
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
        title: `Judul ${code}`,
        topic: `P3M2-Topic-${stamp}`,
        level: LEVEL,
        cefr: 'A1',
        skill: 'VOCABULARY',
        order,
        status: 'LIVE',
      },
    });
  }

  async function makeItem(
    lessonId: string,
    order: number,
    prompt = `Prompt ${order}`,
  ) {
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

  async function makeScratchSession(userId: string, date: Date) {
    return prisma.session.create({ data: { userId, date, kind: 'REPLAY' } });
  }

  async function makeAttempt(
    userId: string,
    itemId: string,
    sessionId: string,
    correct: boolean,
    answeredAt: Date,
    firstTry = true,
  ) {
    return prisma.attempt.create({
      data: {
        userId,
        itemId,
        sessionId,
        answer: 'x',
        correct,
        firstTry,
        answeredAt,
      },
    });
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
    // FK-safe cleanup, scoped to this file's own 'p3m2-'/'P3M2-' prefix.
    await prisma.itemReport.deleteMany({
      where: { user: { email: { startsWith: 'p3m2-' } } },
    });
    await prisma.attempt.deleteMany({
      where: { user: { email: { startsWith: 'p3m2-' } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { session: { user: { email: { startsWith: 'p3m2-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p3m2-' } } },
    });
    await prisma.streakFreeze.deleteMany({
      where: { user: { email: { startsWith: 'p3m2-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'P3M2-' } } },
    });
    await prisma.lesson.deleteMany({
      where: { code: { startsWith: 'P3M2-' } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'p3m2-' } } });
    await app.close();
  });

  describe('employees list + detail', () => {
    it('list: urut nama, trend up/null, RolesGuard 403; detail: kalender 4 state, 404 id tak ada', async () => {
      const admin = await makeUser({
        name: 'P3M2 Admin',
        email: `p3m2-admin-${stamp}@ex.com`,
        role: 'ADMIN',
        onboardedAt: new Date(),
      });

      const today = todayWIB();
      const H7 = 7 * 3600_000;
      // Konversi tanggal WIB (Y-M-D) ke instant UTC nyata di TENGAH hari itu,
      // supaya attempt.answeredAt pasti jatuh di jendela WIB yang benar
      // terlepas offset H7 di batas hari.
      const wibNoon = (d: Date) => new Date(d.getTime() - H7 + 12 * 3600_000);

      // --- 3 user untuk cek urutan nama (BE tidak sort selain nama) ---
      const userZeta = await makeUser({
        name: `P3M2 Zeta ${stamp}`,
        email: `p3m2-zeta-${stamp}@ex.com`,
        onboardedAt: addDays(today, -30),
      });
      const userAlpha = await makeUser({
        name: `P3M2 Alpha ${stamp}`,
        email: `p3m2-alpha-${stamp}@ex.com`,
        onboardedAt: addDays(today, -30),
      });
      const userMid = await makeUser({
        name: `P3M2 Mid ${stamp}`,
        email: `p3m2-mid-${stamp}@ex.com`,
        onboardedAt: addDays(today, -30),
      });

      const lesson1 = await makeLesson(`P3M2-L1-${stamp}`, 900101);
      const item1 = await makeItem(lesson1.id, 1);

      // --- userZeta: trend UP — 14 hari terakhir 9/10 benar vs 14 hari
      // sebelumnya 5/10 benar (delta 40pp >= 5pp -> up). ---
      const zetaSession = await makeScratchSession(userZeta.id, today);
      for (let i = 0; i < 9; i++) {
        await makeAttempt(
          userZeta.id,
          item1.id,
          zetaSession.id,
          true,
          wibNoon(today),
          true,
        );
      }
      await makeAttempt(
        userZeta.id,
        item1.id,
        zetaSession.id,
        false,
        wibNoon(today),
        true,
      );
      const priorDate = addDays(today, -20); // dalam jendela 14-27 hari lalu
      for (let i = 0; i < 5; i++) {
        await makeAttempt(
          userZeta.id,
          item1.id,
          zetaSession.id,
          true,
          wibNoon(priorDate),
          true,
        );
      }
      for (let i = 0; i < 5; i++) {
        await makeAttempt(
          userZeta.id,
          item1.id,
          zetaSession.id,
          false,
          wibNoon(priorDate),
          true,
        );
      }

      // --- userAlpha: trend NULL — jendela recent <10 attempt (cuma 3). ---
      const alphaSession = await makeScratchSession(userAlpha.id, today);
      for (let i = 0; i < 3; i++) {
        await makeAttempt(
          userAlpha.id,
          item1.id,
          alphaSession.id,
          true,
          wibNoon(today),
          true,
        );
      }

      await get('/admin/monitoring/employees', userMid.token).expect(403);

      const before = await get(
        '/admin/monitoring/employees',
        admin.token,
      ).expect(200);
      expect(Array.isArray(before.body)).toBe(true);

      const rows = before.body as Array<{
        id: string;
        name: string;
        email: string;
        level: string | null;
        status: string;
        activeDays7: number;
        sessionsThisWeek: number;
        streak: number;
        lessonsDone: number;
        trend: 'up' | 'down' | 'flat' | null;
        lastActiveAt: string | null;
      }>;

      const ourEmails = new Set([
        `p3m2-zeta-${stamp}@ex.com`,
        `p3m2-alpha-${stamp}@ex.com`,
        `p3m2-mid-${stamp}@ex.com`,
      ]);
      const ours = rows.filter((r) => ourEmails.has(r.email));
      expect(ours).toHaveLength(3);

      // Urutan nama: Alpha < Mid < Zeta (BE hanya urut nama, bukan status).
      const ourNamesInOrder = rows
        .filter((r) => ourEmails.has(r.email))
        .map((r) => r.name);
      const expectedSorted = [...ourNamesInOrder].sort((a, b) =>
        a.localeCompare(b),
      );
      expect(ourNamesInOrder).toEqual(expectedSorted);

      const zetaRow = ours.find(
        (r) => r.email === `p3m2-zeta-${stamp}@ex.com`,
      )!;
      expect(zetaRow.trend).toBe('up');

      const alphaRow = ours.find(
        (r) => r.email === `p3m2-alpha-${stamp}@ex.com`,
      )!;
      expect(alphaRow.trend).toBeNull();

      // --- Detail userZeta: shape dasar ---
      const zetaDetail = await get(
        `/admin/monitoring/employees/${userZeta.id}`,
        admin.token,
      ).expect(200);
      expect(zetaDetail.body).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          email: `p3m2-zeta-${stamp}@ex.com`,
          level: LEVEL,
          streak: expect.any(Number),
          longestStreak: expect.any(Number),
          xpTotal: expect.any(Number),
        }),
      );
      expect(Array.isArray(zetaDetail.body.calendar)).toBe(true);
      expect(zetaDetail.body.calendar).toHaveLength(56);
      expect(Array.isArray(zetaDetail.body.skills)).toBe(true);
      expect(Array.isArray(zetaDetail.body.lessonHistory)).toBe(true);

      // --- Detail userMid: kalender 56 hari dengan 4 state (met/partial/frozen/empty) ---
      // dailyTargetSessions default 1 -> 1 sesi COMPLETED sudah "met".
      // Set target=2 supaya bisa bedakan met (2 sesi) vs partial (1 sesi).
      await prisma.user.update({
        where: { id: userMid.id },
        data: { dailyTargetSessions: 2 },
      });
      const metDate = addDays(today, -10);
      await makeCompletedSession(userMid.id, metDate);
      await makeCompletedSession(userMid.id, metDate);
      const partialDate = addDays(today, -11);
      await makeCompletedSession(userMid.id, partialDate);
      const frozenDate = addDays(today, -12);
      await prisma.streakFreeze.create({
        data: {
          userId: userMid.id,
          weekStart: weekStartWIB(frozenDate),
          coveredDate: frozenDate,
        },
      });
      const freezeCountBefore = await prisma.streakFreeze.count({
        where: { userId: userMid.id },
      });

      const midDetail = await get(
        `/admin/monitoring/employees/${userMid.id}`,
        admin.token,
      ).expect(200);
      const calendar = midDetail.body.calendar as Array<{
        date: string;
        state: string;
      }>;
      expect(calendar).toHaveLength(56);
      const byDate = new Map(calendar.map((c) => [c.date, c.state]));
      expect(byDate.get(metDate.toISOString().slice(0, 10))).toBe('met');
      expect(byDate.get(partialDate.toISOString().slice(0, 10))).toBe(
        'partial',
      );
      expect(byDate.get(frozenDate.toISOString().slice(0, 10))).toBe('frozen');
      const states = new Set(calendar.map((c) => c.state));
      expect(states.has('empty')).toBe(true);
      expect(
        ['met', 'partial', 'frozen', 'empty'].every((s) => states.has(s)),
      ).toBe(true);

      // evaluateReadOnly tidak boleh menulis freeze baru saat GET admin.
      const freezeCountAfter = await prisma.streakFreeze.count({
        where: { userId: userMid.id },
      });
      expect(freezeCountAfter).toBe(freezeCountBefore);

      // --- id lain valid (userAlpha) ---
      await get(
        `/admin/monitoring/employees/${userAlpha.id}`,
        admin.token,
      ).expect(200);

      // --- id tak ada -> 404 ---
      await get(
        '/admin/monitoring/employees/does-not-exist-xyz',
        admin.token,
      ).expect(404);

      // --- id milik ADMIN -> 404 juga (detail scoped ke role USER, simetris
      // dengan list yang cuma berisi role USER — id admin bukan baris di
      // sana, jadi detail-nya pun harus 404, bukan 200). ---
      await get(`/admin/monitoring/employees/${admin.id}`, admin.token).expect(
        404,
      );

      // --- USER -> 403 pada detail juga ---
      await get(
        `/admin/monitoring/employees/${userZeta.id}`,
        userMid.token,
      ).expect(403);
    });
  });
});
