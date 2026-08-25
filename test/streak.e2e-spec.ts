import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StreakService } from '../src/me/streak.service';
import { todayWIB, addDays, weekStartWIB } from '../src/common/wib';

describe('StreakService.evaluate (lazy freeze + longest, e2e-light against real Prisma)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let streak: StreakService;

  const stamp = Date.now();
  let userCounter = 0;

  async function makeUser(dailyTargetSessions = 1) {
    userCounter += 1;
    return prisma.user.create({
      data: {
        name: `P2C User ${userCounter}`,
        email: `p2c-streak-${stamp}-${userCounter}@ex.com`,
        role: 'USER',
        inviteStatus: 'ACCEPTED',
        dailyTargetSessions,
      },
    });
  }

  /** Bare Session rows (no items/attempts needed — evaluate() only reads Session). */
  async function seedCompletedDays(userId: string, dates: Date[]) {
    if (!dates.length) return;
    await prisma.session.createMany({
      data: dates.map((d) => ({
        userId,
        date: d,
        kind: 'DAILY',
        status: 'COMPLETED',
        completedAt: d,
      })),
    });
  }

  /** Inclusive range of WIB-day Dates from `from` to `to` (to >= from). */
  function range(from: Date, to: Date): Date[] {
    const out: Date[] = [];
    let d = from;
    while (d.getTime() <= to.getTime()) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    streak = app.get(StreakService);
  });

  afterAll(async () => {
    // FK-safe cleanup, scoped to this file's own 'p2c-streak-' sub-prefix —
    // NOT the bare 'p2c-' family prefix, so this doesn't race and delete
    // test/me.e2e-spec.ts's concurrently-running 'p2c-me-' fixtures (both
    // files run in parallel Jest workers against the same real DB). Never
    // touches admin.
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p2c-streak-' } } },
    });
    await prisma.streakFreeze.deleteMany({
      where: { user: { email: { startsWith: 'p2c-streak-' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'p2c-streak-' } },
    });
    await app.close();
  });

  it('5 hari beruntun (termasuk hari ini) → streak 5, longest 5, tanpa freeze', async () => {
    const user = await makeUser();
    const days = range(addDays(todayWIB(), -4), todayWIB());
    await seedCompletedDays(user.id, days);

    const result = await streak.evaluate(user.id);
    expect(result.streak).toBe(5);
    expect(result.longest).toBe(5);
    expect(result.frozenDates).toEqual([]);

    const freezes = await prisma.streakFreeze.findMany({
      where: { userId: user.id },
    });
    expect(freezes).toHaveLength(0);
  });

  it('bolong 1 hari di tengah → freeze row tercipta (lazy) & streak utuh; evaluate ulang idempoten', async () => {
    const user = await makeUser();
    const gap = addDays(todayWIB(), -3);
    const days = [
      ...range(addDays(todayWIB(), -6), addDays(todayWIB(), -4)),
      // gap at todayWIB()-3 intentionally NOT seeded
      ...range(addDays(todayWIB(), -2), todayWIB()),
    ];
    await seedCompletedDays(user.id, days);

    const result = await streak.evaluate(user.id);
    expect(result.streak).toBe(7);
    expect(result.longest).toBe(7);

    const freezes = await prisma.streakFreeze.findMany({
      where: { userId: user.id },
    });
    expect(freezes).toHaveLength(1);
    expect(freezes[0].coveredDate.toISOString()).toBe(gap.toISOString());
    expect(freezes[0].weekStart.toISOString()).toBe(
      weekStartWIB(gap).toISOString(),
    );
    expect(result.frozenDates).toEqual([gap.toISOString().slice(0, 10)]);

    // Idempotent: re-evaluating must not create a second freeze row for the
    // same (userId, weekStart) — @@id enforces this even under a naive
    // re-run, and evaluate() must not blow up on the existing row either.
    const again = await streak.evaluate(user.id);
    expect(again.streak).toBe(7);
    const freezesAfter = await prisma.streakFreeze.findMany({
      where: { userId: user.id },
    });
    expect(freezesAfter).toHaveLength(1);
  });

  it('bolong 2 hari berturut-turut → putus, streak = hanya hari-hari setelah bolong', async () => {
    const user = await makeUser();
    const days = [
      ...range(addDays(todayWIB(), -6), addDays(todayWIB(), -4)),
      // todayWIB()-3 and todayWIB()-2 both gaps (unseeded) — two in a row
      ...range(addDays(todayWIB(), -1), todayWIB()),
    ];
    await seedCompletedDays(user.id, days);

    const result = await streak.evaluate(user.id);
    expect(result.streak).toBe(2); // just todayWIB()-1 and today
    expect(result.longest).toBe(3); // the todayWIB()-6..-4 run

    const freezes = await prisma.streakFreeze.findMany({
      where: { userId: user.id },
    });
    expect(freezes).toHaveLength(0);
  });

  it('dua bolong terisolasi di minggu WIB yang sama → freeze cuma 1/minggu, gap kedua (lebih lama) putus', async () => {
    const user = await makeUser();
    // Anchor a full week safely in the past (>=8 days back regardless of
    // today's weekday), then bridge every day from its end through
    // yesterday with completed sessions so the walk never breaks before
    // reaching the constructed week.
    const weekMonday = weekStartWIB(addDays(todayWIB(), -14));
    const gapNewer = addDays(weekMonday, 4); // Friday of that week
    const gapOlder = addDays(weekMonday, 1); // Tuesday of that week — same week, older
    const yesterday = addDays(todayWIB(), -1);

    const weekDays = range(weekMonday, addDays(weekMonday, 6)).filter(
      (d) =>
        d.getTime() !== gapNewer.getTime() &&
        d.getTime() !== gapOlder.getTime(),
    );
    const bridgeDays = range(addDays(weekMonday, 7), yesterday);
    await seedCompletedDays(user.id, [...weekDays, ...bridgeDays]);
    // today itself is left unseeded — grace day, doesn't affect the result.

    const result = await streak.evaluate(user.id);

    const freezes = await prisma.streakFreeze.findMany({
      where: { userId: user.id },
    });
    expect(freezes).toHaveLength(1);
    expect(freezes[0].coveredDate.toISOString()).toBe(gapNewer.toISOString());
    expect(freezes[0].weekStart.toISOString()).toBe(weekMonday.toISOString());

    // Expected streak: every bridge day + Sun,Sat,Fri(frozen),Thu,Wed of the
    // test week — breaking at gapOlder (Tuesday), Monday and earlier excluded.
    const expectedStreak = bridgeDays.length + 5;
    expect(result.streak).toBe(expectedStreak);
  });

  it('longest TIDAK membuat freeze baru: gap terisolasi setelah current streak putus tetap dihitung putus', async () => {
    const user = await makeUser();
    // today: met (run of 1, this becomes the current streak).
    // today-1, today-2: two consecutive raw gaps -> breaks immediately
    // (today itself is grace-exempt, so it can't "absorb" one side of this
    // pair — both today-1 and today-2 are real, non-today gaps).
    // today-3, today-4: met (run of 2, post-break / longest-mode only).
    // today-5: isolated gap (both neighbors met) — but this is past the
    // break point, so evaluate() must NOT lazily freeze it for `longest`.
    // today-6..today-8: met (run of 3) — the actual longest run.
    const days = [
      addDays(todayWIB(), 0),
      ...range(addDays(todayWIB(), -4), addDays(todayWIB(), -3)),
      // today-5 gap intentionally unseeded
      ...range(addDays(todayWIB(), -8), addDays(todayWIB(), -6)),
    ];
    await seedCompletedDays(user.id, days);

    const result = await streak.evaluate(user.id);
    expect(result.streak).toBe(1);
    expect(result.longest).toBe(3);

    const freezes = await prisma.streakFreeze.findMany({
      where: { userId: user.id },
    });
    expect(freezes).toHaveLength(0);
  });
});

// I2 regression: StreakService.evaluateAfterSession must report
// streakChanged only for the ONE completion that tips today from unmet to
// met — not for every extra DAILY session completed after that on the same
// day. Drives the real POST /session/:id/answer flow (not
// StreakService.evaluate() directly) so answer.service.ts's actual
// completion branch — where evaluateAfterSession is invoked — is what's
// under test. Own prefix (p2c2-/P2C2-) so this never collides with the
// 'p2c-streak-' fixtures above (sequential within this file, but other
// e2e-spec files may run in a parallel Jest worker).
describe('StreakService.evaluateAfterSession via POST /session/:id/answer (I2: no re-fire on extra same-day session)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const PASSWORD = 'Password123!';
  const stamp = Date.now();

  function post(path: string, body: Record<string, unknown>, token: string) {
    return request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  async function makeSession(userId: string, itemId: string) {
    const session = await prisma.session.create({
      data: { userId, date: todayWIB(), kind: 'DAILY', status: 'IN_PROGRESS' },
    });
    await prisma.sessionItem.create({
      data: { sessionId: session.id, itemId, source: 'LESSON', order: 0 },
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
    await prisma.attempt.deleteMany({
      where: { user: { email: { startsWith: 'p2c2-' } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { session: { user: { email: { startsWith: 'p2c2-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p2c2-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'P2C2-' } } },
    });
    await prisma.lesson.deleteMany({
      where: { code: { startsWith: 'P2C2-' } },
    });
    await prisma.streakFreeze.deleteMany({
      where: { user: { email: { startsWith: 'p2c2-' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'p2c2-' } },
    });
    await app.close();
  });

  it('sesi DAILY kedua di hari yang sama (target sudah tercapai di sesi pertama) → streakChanged:false', async () => {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        name: 'P2C2 User',
        email: `p2c2-user-${stamp}@ex.com`,
        role: 'USER',
        level: 'DASAR',
        dailyTargetSessions: 1,
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(201);
    const token = login.body.accessToken as string;

    const lesson = await prisma.lesson.create({
      data: {
        code: `P2C2-L1-${stamp}`,
        title: 'P2C2 Lesson',
        topic: 'P2C2 Topic',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'VOCABULARY',
        order: 1,
        status: 'LIVE',
      },
    });
    const item1 = await prisma.item.create({
      data: {
        lessonId: lesson.id,
        type: 'PILIHAN_GANDA',
        prompt: 'Sesi 1',
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
        prompt: 'Sesi 2 (ekstra, hari yang sama)',
        options: ['A', 'B', 'C', 'D'],
        answerKey: 'A',
        explanation: 'x',
        order: 2,
        status: 'LIVE',
      },
    });

    // Sesi pertama hari ini: dailyTargetSessions (1) baru tercapai di sini
    // -> ini SATU-SATUNYA completion yang boleh melaporkan streakChanged.
    const sessionAId = await makeSession(user.id, item1.id);
    const first = await post(
      `/session/${sessionAId}/answer`,
      { itemId: item1.id, answer: 'a' },
      token,
    ).expect(201);
    expect(first.body.sessionCompleted).toBe(true);
    expect(first.body.summary.streak).toBe(1);
    expect(first.body.summary.streakChanged).toBe(true);

    // Sesi kedua, EKSTRA, hari yang sama: target sudah tercapai sebelumnya
    // -> streak tidak berubah lagi, streakChanged harus false (bug lama:
    // re-fire di setiap sesi ekstra karena hanya membandingkan
    // withToday > withoutToday, tanpa peduli target sudah tercapai sesi mana).
    const sessionBId = await makeSession(user.id, item2.id);
    const second = await post(
      `/session/${sessionBId}/answer`,
      { itemId: item2.id, answer: 'a' },
      token,
    ).expect(201);
    expect(second.body.sessionCompleted).toBe(true);
    expect(second.body.summary.streak).toBe(1);
    expect(second.body.summary.streakChanged).toBe(false);
  });
});
