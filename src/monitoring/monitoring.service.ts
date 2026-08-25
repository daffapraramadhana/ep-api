import { Injectable } from '@nestjs/common';
import { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../common/config.service';
import { SessionService } from '../session/session.service';
import { addDays, todayWIB } from '../common/wib';
import { DayCount, EmployeeStatus, computeStatus, metDays } from './metrics';

const LEVELS: Level[] = ['DASAR', 'MENENGAH', 'MAHIR'];
const ACTIVITY_DAYS = 28;
const STATUS_WINDOW_DAYS = 7;
const HARDEST_ITEMS_MIN_ANSWERS = 5;
const HARDEST_ITEMS_TOP_N = 5;

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

export interface OverviewView {
  totals: OverviewTotals;
  activitySeries: DayCount[];
  contentHealth: {
    hardestItems: HardestItemView[];
    exhaustedByLevel: ExhaustedByLevelView[];
  };
  openReports: number;
}

@Injectable()
export class MonitoringService {
  constructor(
    private prisma: PrismaService,
    private config: AppConfigService,
    private sessionService: SessionService,
  ) {}

  async getOverview(): Promise<OverviewView> {
    const today = todayWIB();
    const threshold = await this.config.getInt('MONITOR_INACTIVE_DAYS');

    const [activitySeries, users, openReports] = await Promise.all([
      this.buildActivitySeries(today),
      this.prisma.user.findMany({
        where: { role: 'USER' },
        select: { id: true, level: true, onboardedAt: true, dailyTargetSessions: true },
      }),
      this.prisma.itemReport.count({ where: { status: 'OPEN' } }),
    ]);

    const totals = await this.buildTotals(today, threshold, users);
    const contentHealth = await this.buildContentHealth(users);

    return { totals, activitySeries, contentHealth, openReports };
  }

  private async buildActivitySeries(today: Date): Promise<DayCount[]> {
    const start = addDays(today, -(ACTIVITY_DAYS - 1));
    const grouped = await this.prisma.session.groupBy({
      by: ['date'],
      where: { kind: 'DAILY', status: 'COMPLETED', date: { gte: start, lte: today } },
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
    users: { id: string; onboardedAt: Date | null; dailyTargetSessions: number }[],
  ): Promise<OverviewTotals> {
    const todayStr = fmt(today);
    const last7Days = dateRange(addDays(today, -(STATUS_WINDOW_DAYS - 1)), today);
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
    for (const u of users) perUser.set(u.id, { perDay: new Map(), maxDate: null, activeLast7: false });
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
      const metDaysLast7 = metDays(rec.perDay, u.dailyTargetSessions, last7Days);
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

    return { employees: users.length, active, onTrack, needsAttention, notStarted };
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
      select: { id: true, lessonId: true, prompt: true, lesson: { select: { title: true } } },
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

  private async buildExhaustedByLevel(
    users: { id: string; level: Level | null; onboardedAt: Date | null }[],
  ): Promise<ExhaustedByLevelView[]> {
    const out: ExhaustedByLevelView[] = [];
    for (const level of LEVELS) {
      const onboardedAtLevel = users.filter(
        (u) => u.level === level && u.onboardedAt !== null,
      );
      if (!onboardedAtLevel.length) {
        out.push({ level, exhaustedPct: 0, users: 0 });
        continue;
      }
      let exhaustedCount = 0;
      for (const u of onboardedAtLevel) {
        const completion = await this.sessionService.lessonCompletion(u.id, level);
        const values = [...completion.values()];
        if (values.length > 0 && values.every(Boolean)) exhaustedCount += 1;
      }
      out.push({
        level,
        exhaustedPct: Math.round((exhaustedCount / onboardedAtLevel.length) * 100),
        users: onboardedAtLevel.length,
      });
    }
    return out;
  }
}
