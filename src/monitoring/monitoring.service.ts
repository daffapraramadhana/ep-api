import { Injectable, NotFoundException } from '@nestjs/common';
import { Level, SkillTag } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../common/config.service';
import { StreakService } from '../me/streak.service';
import { addDays, todayWIB, weekStartWIB } from '../common/wib';
import {
  DayCount,
  EmployeeStatus,
  computeStatus,
  computeTrend,
  metDays,
} from './metrics';

const LEVELS: Level[] = ['DASAR', 'MENENGAH', 'MAHIR'];
const SKILLS: SkillTag[] = ['VOCABULARY', 'GRAMMAR', 'LISTENING', 'READING'];
const ACTIVITY_DAYS = 28;
const STATUS_WINDOW_DAYS = 7;
const CALENDAR_DAYS = 56;
const TREND_WINDOW_DAYS = 14;
const HARDEST_ITEMS_MIN_ANSWERS = 5;
const HARDEST_ITEMS_TOP_N = 5;
// WIB = UTC+7 tanpa DST (lihat src/common/wib.ts). todayWIB()/addDays()
// mengembalikan Date "penanda tanggal" (UTC-midnight dg Y-M-D = hari WIB) —
// sama seperti kolom Session.date (@db.Date). Attempt.answeredAt sebaliknya
// adalah timestamp NYATA, jadi batas hari WIB-nya harus dikoreksi -H7 dulu
// (pola sama seperti answer.service.ts#reviewXpToday).
const H7 = 7 * 3600_000;
const wibDayInstant = (d: Date): number => d.getTime() - H7;

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Inclusive array of WIB-day date strings from `from` to `to` (to >= from). */
function dateRange(from: Date, to: Date): string[] {
  const out: string[] = [];
  let d = from;
  while (d.getTime() <= to.getTime()) {
    out.push(fmt(d));
    d = addDays(d, 1);
  }
  return out;
}

export interface OverviewTotals {
  employees: number;
  active: number;
  onTrack: number;
  needsAttention: number;
  notStarted: number;
}

export interface HardestItemView {
  itemId: string;
  lessonId: string;
  lessonTitle: string;
  prompt: string;
  wrongRate: number;
  answers: number;
}

export interface ExhaustedByLevelView {
  level: Level;
  exhaustedPct: number;
  users: number;
}

export interface ActivitySeriesPoint {
  date: string;
  sessionsCompleted: number;
}

export interface OverviewView {
  totals: OverviewTotals;
  activitySeries: ActivitySeriesPoint[];
  contentHealth: {
    hardestItems: HardestItemView[];
    exhaustedByLevel: ExhaustedByLevelView[];
  };
  openReports: number;
}

export interface EmployeeListItemView {
  id: string;
  name: string;
  email: string;
  level: Level | null;
  status: EmployeeStatus;
  activeDays7: number;
  sessionsThisWeek: number;
  streak: number;
  lessonsDone: number;
  trend: 'up' | 'down' | 'flat' | null;
  lastActiveAt: string | null;
}

export type CalendarDayState = 'met' | 'partial' | 'frozen' | 'empty';

export interface CalendarDayView {
  date: string;
  state: CalendarDayState;
}

export interface EmployeeSkillView {
  skill: SkillTag;
  answered: number;
  accuracy: number | null;
}

export interface LessonHistoryView {
  lessonId: string;
  title: string;
  topic: string;
  completedAt: string;
  accuracy: number | null;
}

export interface EmployeeDetailView {
  name: string;
  email: string;
  level: Level | null;
  joinedAt: string;
  streak: number;
  longestStreak: number;
  xpTotal: number;
  calendar: CalendarDayView[];
  skills: EmployeeSkillView[];
  lessonHistory: LessonHistoryView[];
}

@Injectable()
export class MonitoringService {
  constructor(
    private prisma: PrismaService,
    private config: AppConfigService,
    private streakService: StreakService,
  ) {}

  async getOverview(): Promise<OverviewView> {
    const today = todayWIB();
    const threshold = await this.config.getInt('MONITOR_INACTIVE_DAYS');

    const [activityDays, users, openReports] = await Promise.all([
      this.buildActivitySeries(today),
      this.prisma.user.findMany({
        where: { role: 'USER' },
        select: {
          id: true,
          level: true,
          onboardedAt: true,
          dailyTargetSessions: true,
        },
      }),
      this.prisma.itemReport.count({ where: { status: 'OPEN' } }),
    ]);
    // Spec §4: shape HTTP-nya `{ date, sessionsCompleted }` — DayCount murni
    // (metrics.ts, dipakai Task 2 juga) tetap pakai nama field `count`.
    const activitySeries: ActivitySeriesPoint[] = activityDays.map((d) => ({
      date: d.date,
      sessionsCompleted: d.count,
    }));

    const totals = await this.buildTotals(today, threshold, users);
    const contentHealth = await this.buildContentHealth(users);

    return { totals, activitySeries, contentHealth, openReports };
  }

  private async buildActivitySeries(today: Date): Promise<DayCount[]> {
    const start = addDays(today, -(ACTIVITY_DAYS - 1));
    const grouped = await this.prisma.session.groupBy({
      by: ['date'],
      where: {
        kind: 'DAILY',
        status: 'COMPLETED',
        date: { gte: start, lte: today },
      },
      _count: { _all: true },
    });
    const counts = new Map<string, number>();
    for (const g of grouped) counts.set(fmt(g.date), g._count._all);

    const days = dateRange(start, today);
    return days.map((date) => ({ date, count: counts.get(date) ?? 0 }));
  }

  private async buildTotals(
    today: Date,
    threshold: number,
    users: {
      id: string;
      onboardedAt: Date | null;
      dailyTargetSessions: number;
    }[],
  ): Promise<OverviewTotals> {
    const todayStr = fmt(today);
    const last7Days = dateRange(
      addDays(today, -(STATUS_WINDOW_DAYS - 1)),
      today,
    );
    const windowDays = Math.max(STATUS_WINDOW_DAYS, threshold);
    const windowStart = addDays(today, -(windowDays - 1));

    const sessions = users.length
      ? await this.prisma.session.findMany({
          where: {
            userId: { in: users.map((u) => u.id) },
            kind: 'DAILY',
            status: 'COMPLETED',
            date: { gte: windowStart, lte: today },
          },
          select: { userId: true, date: true },
        })
      : [];

    interface UserWindow {
      perDay: Map<string, number>;
      maxDate: string | null;
      activeLast7: boolean;
    }
    const perUser = new Map<string, UserWindow>();
    for (const u of users)
      perUser.set(u.id, {
        perDay: new Map(),
        maxDate: null,
        activeLast7: false,
      });
    for (const s of sessions) {
      const rec = perUser.get(s.userId);
      if (!rec) continue;
      const dstr = fmt(s.date);
      rec.perDay.set(dstr, (rec.perDay.get(dstr) ?? 0) + 1);
      if (rec.maxDate === null || dstr > rec.maxDate) rec.maxDate = dstr;
      if (last7Days.includes(dstr)) rec.activeLast7 = true;
    }

    let active = 0;
    let onTrack = 0;
    let needsAttention = 0;
    let notStarted = 0;

    for (const u of users) {
      const rec = perUser.get(u.id)!;
      const onboarded = u.onboardedAt !== null;
      const metDaysLast7 = metDays(
        rec.perDay,
        u.dailyTargetSessions,
        last7Days,
      );
      const status: EmployeeStatus = computeStatus({
        onboarded,
        lastCompletedDate: rec.maxDate,
        today: todayStr,
        inactiveThresholdDays: threshold,
        metDaysLast7,
        activeLast7: rec.activeLast7,
      });

      if (rec.activeLast7) active += 1; // definisi "aktif" murni (§3) — boleh tumpang tindih
      if (status === 'on_track') onTrack += 1;
      else if (status === 'butuh_perhatian') needsAttention += 1;
      else if (status === 'belum_mulai') notStarted += 1;
    }

    return {
      employees: users.length,
      active,
      onTrack,
      needsAttention,
      notStarted,
    };
  }

  private async buildContentHealth(
    users: { id: string; level: Level | null; onboardedAt: Date | null }[],
  ): Promise<OverviewView['contentHealth']> {
    const hardestItems = await this.buildHardestItems();
    const exhaustedByLevel = await this.buildExhaustedByLevel(users);
    return { hardestItems, exhaustedByLevel };
  }

  private async buildHardestItems(): Promise<HardestItemView[]> {
    const grouped = await this.prisma.attempt.groupBy({
      by: ['itemId', 'correct'],
      where: { firstTry: true },
      _count: { _all: true },
    });

    const stats = new Map<string, { wrong: number; total: number }>();
    for (const g of grouped) {
      const rec = stats.get(g.itemId) ?? { wrong: 0, total: 0 };
      rec.total += g._count._all;
      if (!g.correct) rec.wrong += g._count._all;
      stats.set(g.itemId, rec);
    }

    const candidateIds = [...stats.entries()]
      .filter(([, s]) => s.total >= HARDEST_ITEMS_MIN_ANSWERS)
      .map(([itemId]) => itemId);
    if (!candidateIds.length) return [];

    const items = await this.prisma.item.findMany({
      where: { id: { in: candidateIds }, status: 'LIVE' },
      select: {
        id: true,
        lessonId: true,
        prompt: true,
        lesson: { select: { title: true } },
      },
    });

    const rows: HardestItemView[] = items.map((item) => {
      const s = stats.get(item.id)!;
      return {
        itemId: item.id,
        lessonId: item.lessonId,
        lessonTitle: item.lesson.title,
        prompt: item.prompt.slice(0, 80),
        wrongRate: Math.round((s.wrong / s.total) * 100),
        answers: s.total,
      };
    });

    rows.sort((a, b) => b.wrongRate - a.wrongRate || b.answers - a.answers);
    return rows.slice(0, HARDEST_ITEMS_TOP_N);
  }

  /**
   * Sama seperti buildLessonsDoneMap: "exhausted" (kehabisan konten) = user
   * sudah menyelesaikan SEMUA lesson LIVE di levelnya (dan level itu punya
   * >=1 lesson). Dulu ini memanggil sessionService.lessonCompletion per user
   * per level (2N query serial di landing admin) — sekarang pakai
   * buildLessonProgress yang sama dgn buildLessonsDoneMap, ~2 query total
   * utk semua user, exhausted diturunkan dari data batch yang sama.
   */
  private async buildExhaustedByLevel(
    users: { id: string; level: Level | null; onboardedAt: Date | null }[],
  ): Promise<ExhaustedByLevelView[]> {
    const { exhaustedMap } = await this.buildLessonProgress(users);
    const out: ExhaustedByLevelView[] = [];
    for (const level of LEVELS) {
      const onboardedAtLevel = users.filter(
        (u) => u.level === level && u.onboardedAt !== null,
      );
      if (!onboardedAtLevel.length) {
        out.push({ level, exhaustedPct: 0, users: 0 });
        continue;
      }
      const exhaustedCount = onboardedAtLevel.filter((u) =>
        exhaustedMap.get(u.id),
      ).length;
      out.push({
        level,
        exhaustedPct: Math.round(
          (exhaustedCount / onboardedAtLevel.length) * 100,
        ),
        users: onboardedAtLevel.length,
      });
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // Task 2: employees list + per-employee detail
  // ---------------------------------------------------------------------

  async getEmployees(): Promise<EmployeeListItemView[]> {
    const today = todayWIB();
    const threshold = await this.config.getInt('MONITOR_INACTIVE_DAYS');
    const todayStr = fmt(today);
    const last7Days = dateRange(
      addDays(today, -(STATUS_WINDOW_DAYS - 1)),
      today,
    );
    const windowDays = Math.max(STATUS_WINDOW_DAYS, threshold);
    const windowStart = addDays(today, -(windowDays - 1));
    const weekStartStr = fmt(weekStartWIB(today));

    const users = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        name: true,
        email: true,
        level: true,
        onboardedAt: true,
        dailyTargetSessions: true,
      },
      orderBy: { name: 'asc' },
    });
    if (!users.length) return [];
    const userIds = users.map((u) => u.id);

    const [sessions, lastActiveRows, trendMap, lessonsDoneMap, streakResults] =
      await Promise.all([
        this.prisma.session.findMany({
          where: {
            userId: { in: userIds },
            kind: 'DAILY',
            status: 'COMPLETED',
            date: { gte: windowStart, lte: today },
          },
          select: { userId: true, date: true },
        }),
        this.prisma.session.groupBy({
          by: ['userId'],
          where: {
            userId: { in: userIds },
            kind: 'DAILY',
            status: 'COMPLETED',
          },
          _max: { completedAt: true },
        }),
        this.buildTrendMap(userIds, today),
        this.buildLessonProgress(users).then((r) => r.lessonsDoneMap),
        // StreakService.evaluate per pengguna sengaja TIDAK dipakai di sini —
        // itu lazily MENULIS StreakFreeze row untuk hari-hari gap saat
        // dijalankan, efek samping yang tidak semestinya terjadi hanya karena
        // admin membuka daftar karyawan. evaluateReadOnly menjalankan logika
        // yang sama persis tapi tanpa createFreeze, jadi streak/longest tetap
        // benar berdasarkan freeze yang SUDAH ada. Memanggilnya per-user tetap
        // tidak terhindarkan (tidak ada groupBy lintas-user untuk logika
        // streak yang stateful ini) — dapat diterima untuk skala pilot
        // 20-50 user (spec §4).
        Promise.all(
          userIds.map((id) => this.streakService.evaluateReadOnly(id)),
        ),
      ]);

    interface UserWindow {
      perDay: Map<string, number>;
      maxDate: string | null;
    }
    const perUser = new Map<string, UserWindow>();
    for (const u of users)
      perUser.set(u.id, { perDay: new Map(), maxDate: null });
    for (const s of sessions) {
      const rec = perUser.get(s.userId);
      if (!rec) continue;
      const dstr = fmt(s.date);
      rec.perDay.set(dstr, (rec.perDay.get(dstr) ?? 0) + 1);
      if (rec.maxDate === null || dstr > rec.maxDate) rec.maxDate = dstr;
    }

    const lastActiveMap = new Map<string, string | null>();
    for (const row of lastActiveRows) {
      lastActiveMap.set(
        row.userId,
        row._max.completedAt?.toISOString() ?? null,
      );
    }

    const streakMap = new Map<string, number>();
    userIds.forEach((id, i) => streakMap.set(id, streakResults[i].streak));

    return users.map((u) => {
      const rec = perUser.get(u.id)!;
      const onboarded = u.onboardedAt !== null;
      const activeLast7 = last7Days.some((d) => (rec.perDay.get(d) ?? 0) > 0);
      const activeDays7 = last7Days.filter(
        (d) => (rec.perDay.get(d) ?? 0) > 0,
      ).length;
      const metDaysLast7 = metDays(
        rec.perDay,
        u.dailyTargetSessions,
        last7Days,
      );
      const status = computeStatus({
        onboarded,
        lastCompletedDate: rec.maxDate,
        today: todayStr,
        inactiveThresholdDays: threshold,
        metDaysLast7,
        activeLast7,
      });
      const sessionsThisWeek = [...rec.perDay.entries()]
        .filter(([d]) => d >= weekStartStr && d <= todayStr)
        .reduce((sum, [, c]) => sum + c, 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        level: u.level,
        status,
        activeDays7,
        sessionsThisWeek,
        streak: streakMap.get(u.id) ?? 0,
        lessonsDone: lessonsDoneMap.get(u.id) ?? 0,
        trend: trendMap.get(u.id) ?? null,
        lastActiveAt: lastActiveMap.get(u.id) ?? null,
      };
    });
  }

  /**
   * Tren akurasi first-try 14 hari terakhir vs 14 hari sebelumnya (§3), satu
   * findMany 28-hari untuk semua user lalu di-split di memori per user per
   * jendela — tidak ada query per-user.
   */
  private async buildTrendMap(
    userIds: string[],
    today: Date,
  ): Promise<Map<string, 'up' | 'down' | 'flat' | null>> {
    const out = new Map<string, 'up' | 'down' | 'flat' | null>();
    if (!userIds.length) return out;

    const recentStart = wibDayInstant(addDays(today, -(TREND_WINDOW_DAYS - 1)));
    const recentEndExclusive = wibDayInstant(addDays(today, 1));
    const priorStart = wibDayInstant(
      addDays(today, -(TREND_WINDOW_DAYS * 2 - 1)),
    );

    const attempts = await this.prisma.attempt.findMany({
      where: {
        userId: { in: userIds },
        firstTry: true,
        answeredAt: {
          gte: new Date(priorStart),
          lt: new Date(recentEndExclusive),
        },
      },
      select: { userId: true, correct: true, answeredAt: true },
    });

    interface Window {
      correct: number;
      total: number;
    }
    const stats = new Map<string, { recent: Window; prior: Window }>();
    for (const id of userIds) {
      stats.set(id, {
        recent: { correct: 0, total: 0 },
        prior: { correct: 0, total: 0 },
      });
    }
    for (const a of attempts) {
      const rec = stats.get(a.userId);
      if (!rec) continue;
      const bucket =
        a.answeredAt.getTime() >= recentStart ? rec.recent : rec.prior;
      bucket.total += 1;
      if (a.correct) bucket.correct += 1;
    }

    for (const [id, s] of stats) out.set(id, computeTrend(s.recent, s.prior));
    return out;
  }

  /**
   * Lesson selesai per user, dibatch per level: satu query lesson+item per
   * level yang benar-benar dipakai + satu query attempt benar untuk semua
   * user & item sekaligus — bukan N+1 per user (lessonCompletion di
   * SessionService sengaja TIDAK dipakai di sini karena itu satu query-pair
   * PER user). Dipakai juga oleh buildExhaustedByLevel (Task 1 content
   * health) — exhaustedMap diturunkan dari data batch yang sama, bukan
   * query terpisah per user per level.
   */
  private async buildLessonProgress(
    users: { id: string; level: Level | null }[],
  ): Promise<{
    lessonsDoneMap: Map<string, number>;
    exhaustedMap: Map<string, boolean>;
  }> {
    const lessonsDoneMap = new Map<string, number>();
    const exhaustedMap = new Map<string, boolean>();
    for (const u of users) {
      lessonsDoneMap.set(u.id, 0);
      exhaustedMap.set(u.id, false);
    }

    const levelsUsed = [
      ...new Set(
        users.map((u) => u.level).filter((l): l is Level => l !== null),
      ),
    ];
    if (!levelsUsed.length) return { lessonsDoneMap, exhaustedMap };

    const lessons = await this.prisma.lesson.findMany({
      where: { level: { in: levelsUsed }, status: 'LIVE' },
      select: {
        id: true,
        level: true,
        items: { where: { status: 'LIVE' }, select: { id: true } },
      },
    });
    const itemIds = lessons.flatMap((l) => l.items.map((i) => i.id));
    const userIdsWithLevel = users
      .filter((u) => u.level !== null)
      .map((u) => u.id);

    const correctAttempts =
      itemIds.length && userIdsWithLevel.length
        ? await this.prisma.attempt.findMany({
            where: {
              userId: { in: userIdsWithLevel },
              itemId: { in: itemIds },
              correct: true,
            },
            select: { userId: true, itemId: true },
          })
        : [];
    const correctSet = new Set(
      correctAttempts.map((a) => `${a.userId}:${a.itemId}`),
    );

    const lessonsByLevel = new Map<
      Level,
      { id: string; items: { id: string }[] }[]
    >();
    for (const l of lessons) {
      const arr = lessonsByLevel.get(l.level) ?? [];
      arr.push(l);
      lessonsByLevel.set(l.level, arr);
    }

    for (const u of users) {
      if (!u.level) continue;
      const lvlLessons = lessonsByLevel.get(u.level) ?? [];
      let done = 0;
      for (const l of lvlLessons) {
        if (
          l.items.length > 0 &&
          l.items.every((i) => correctSet.has(`${u.id}:${i.id}`))
        ) {
          done += 1;
        }
      }
      lessonsDoneMap.set(u.id, done);
      // Sama seperti sessionService.lessonCompletion: lesson tanpa item
      // (items.length === 0) tidak pernah "selesai", jadi level itu tidak
      // pernah "exhausted" — konsisten dengan semantik lama (map value per
      // lesson di lessonCompletion juga false utk lesson kosong).
      exhaustedMap.set(u.id, lvlLessons.length > 0 && done === lvlLessons.length);
    }
    return { lessonsDoneMap, exhaustedMap };
  }

  async getEmployeeDetail(id: string): Promise<EmployeeDetailView> {
    // Scoped ke karyawan (role: 'USER') seperti getEmployees() — simetris:
    // id milik ADMIN (bukan baris di list employees) juga 404, bukan 200.
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'USER' },
      select: {
        name: true,
        email: true,
        level: true,
        dailyTargetSessions: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException();

    const today = todayWIB();
    const calendarStart = addDays(today, -(CALENDAR_DAYS - 1));

    const [
      streakResult,
      attemptXpSum,
      sessionXpSum,
      sessionCounts,
      firstTryAttempts,
      lessons,
    ] = await Promise.all([
      // Read-only: lihat komentar di getEmployees() — GET admin tidak boleh
      // menulis freeze baru.
      this.streakService.evaluateReadOnly(id),
      this.prisma.attempt.aggregate({
        where: { userId: id },
        _sum: { xpAwarded: true },
      }),
      this.prisma.session.aggregate({
        where: { userId: id },
        _sum: { xpAwarded: true },
      }),
      this.prisma.session.groupBy({
        by: ['date'],
        where: {
          userId: id,
          kind: 'DAILY',
          status: 'COMPLETED',
          date: { gte: calendarStart, lte: today },
        },
        _count: { _all: true },
      }),
      this.prisma.attempt.findMany({
        where: { userId: id, firstTry: true },
        select: {
          correct: true,
          item: { select: { lesson: { select: { skill: true } } } },
        },
      }),
      user.level
        ? this.prisma.lesson.findMany({
            where: { level: user.level, status: 'LIVE' },
            orderBy: { order: 'asc' },
            include: {
              items: { where: { status: 'LIVE' }, select: { id: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const xpTotal =
      (attemptXpSum._sum.xpAwarded ?? 0) + (sessionXpSum._sum.xpAwarded ?? 0);

    const countsByDate = new Map<string, number>();
    for (const g of sessionCounts) countsByDate.set(fmt(g.date), g._count._all);
    const frozenSet = new Set(streakResult.frozenDates);
    const target = Math.max(user.dailyTargetSessions, 1);
    const calendar: CalendarDayView[] = dateRange(calendarStart, today).map(
      (date) => {
        const c = countsByDate.get(date) ?? 0;
        let state: CalendarDayState;
        if (c >= target) state = 'met';
        else if (c >= 1) state = 'partial';
        else if (frozenSet.has(date)) state = 'frozen';
        else state = 'empty';
        return { date, state };
      },
    );

    const skillStats = new Map<
      SkillTag,
      { answered: number; correct: number }
    >();
    for (const s of SKILLS) skillStats.set(s, { answered: 0, correct: 0 });
    for (const a of firstTryAttempts) {
      const st = skillStats.get(a.item.lesson.skill)!;
      st.answered += 1;
      if (a.correct) st.correct += 1;
    }
    const skills: EmployeeSkillView[] = SKILLS.map((skill) => {
      const st = skillStats.get(skill)!;
      return {
        skill,
        answered: st.answered,
        accuracy: st.answered
          ? Math.round((st.correct / st.answered) * 100)
          : null,
      };
    });

    const lessonHistory = await this.buildLessonHistory(id, lessons);

    return {
      name: user.name,
      email: user.email,
      level: user.level,
      joinedAt: user.createdAt.toISOString(),
      streak: streakResult.streak,
      longestStreak: streakResult.longest,
      xpTotal,
      calendar,
      skills,
      lessonHistory,
    };
  }

  /**
   * `completedAt` = tanggal attempt BENAR terakhir yang menuntaskan lesson
   * (approx: max(answeredAt) attempt benar pada item lesson itu — brief §
   * task-2). `accuracy` = firstTry % di antara semua attempt firstTry pada
   * item lesson itu. Hanya lesson yang SELESAI (semua item LIVE punya
   * minimal satu attempt benar) yang masuk riwayat.
   */
  private async buildLessonHistory(
    userId: string,
    lessons: {
      id: string;
      title: string;
      topic: string;
      items: { id: string }[];
    }[],
  ): Promise<LessonHistoryView[]> {
    if (!lessons.length) return [];
    const itemIds = lessons.flatMap((l) => l.items.map((i) => i.id));
    if (!itemIds.length) return [];

    const attempts = await this.prisma.attempt.findMany({
      where: { userId, itemId: { in: itemIds } },
      select: { itemId: true, correct: true, firstTry: true, answeredAt: true },
    });

    interface ItemStat {
      correctAny: boolean;
      lastCorrectAt: number | null;
      firstTryTotal: number;
      firstTryCorrect: number;
    }
    const byItem = new Map<string, ItemStat>();
    for (const id of itemIds) {
      byItem.set(id, {
        correctAny: false,
        lastCorrectAt: null,
        firstTryTotal: 0,
        firstTryCorrect: 0,
      });
    }
    for (const a of attempts) {
      const rec = byItem.get(a.itemId);
      if (!rec) continue;
      if (a.correct) {
        rec.correctAny = true;
        const t = a.answeredAt.getTime();
        if (rec.lastCorrectAt === null || t > rec.lastCorrectAt)
          rec.lastCorrectAt = t;
      }
      if (a.firstTry) {
        rec.firstTryTotal += 1;
        if (a.correct) rec.firstTryCorrect += 1;
      }
    }

    const history: LessonHistoryView[] = [];
    for (const l of lessons) {
      if (!l.items.length) continue;
      const stats = l.items.map((i) => byItem.get(i.id)!);
      const allDone = stats.every((s) => s.correctAny);
      if (!allDone) continue;

      let maxAt: number | null = null;
      let ftTotal = 0;
      let ftCorrect = 0;
      for (const s of stats) {
        if (s.lastCorrectAt !== null) {
          maxAt =
            maxAt === null ? s.lastCorrectAt : Math.max(maxAt, s.lastCorrectAt);
        }
        ftTotal += s.firstTryTotal;
        ftCorrect += s.firstTryCorrect;
      }
      // allDone => setiap item punya lastCorrectAt non-null, jadi maxAt tidak
      // pernah null di sini — fallback ke now() murni defensif.
      history.push({
        lessonId: l.id,
        title: l.title,
        topic: l.topic,
        completedAt: new Date(maxAt ?? Date.now()).toISOString(),
        accuracy: ftTotal ? Math.round((ftCorrect / ftTotal) * 100) : null,
      });
    }

    history.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    return history;
  }
}
