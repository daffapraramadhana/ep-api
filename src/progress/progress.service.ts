import { Injectable } from '@nestjs/common';
import { SkillTag } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../session/session.service';
import { StreakService } from '../me/streak.service';
import { addDays, todayWIB, weekStartWIB } from '../common/wib';
import { COUNTED_SESSION_KINDS } from '../common/content-scope';

type WeekDayState = 'active' | 'frozen' | 'empty';

export interface ProgressSkillView {
  skill: SkillTag;
  answered: number;
  accuracy: number | null;
}

export interface ProgressWeekDayView {
  date: string;
  state: WeekDayState;
}

export interface ProgressView {
  skills: ProgressSkillView[];
  week: ProgressWeekDayView[];
  totals: {
    lessonsDone: number;
    xpTotal: number;
    longestStreak: number;
    /** talking agent — percakapan GRADED & menit ngobrol (lifetime) */
    voiceConversations: number;
    voiceMinutes: number;
  };
}

const SKILLS: SkillTag[] = ['VOCABULARY', 'GRAMMAR', 'LISTENING', 'READING'];

@Injectable()
export class ProgressService {
  constructor(
    private prisma: PrismaService,
    private session: SessionService,
    private streak: StreakService,
  ) {}

  async get(userId: string): Promise<ProgressView> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const today = todayWIB();
    const weekStart = weekStartWIB(today);
    const weekEnd = addDays(weekStart, 6);

    // evaluate() first (may lazily create a StreakFreeze row) so the
    // freezes query below always sees a consistent picture rather than
    // racing it inside Promise.all.
    const streakResult = await this.streak.evaluate(userId);

    const [
      firstTryAttempts,
      activeSessions,
      freezes,
      attemptXpSum,
      sessionXpSum,
      voiceXpSum,
    ] = await Promise.all([
      this.prisma.attempt.findMany({
        where: { userId, firstTry: true },
        select: {
          correct: true,
          item: { select: { lesson: { select: { skill: true } } } },
        },
      }),
      this.prisma.session.findMany({
        where: {
          userId,
          kind: { in: COUNTED_SESSION_KINDS },
          status: 'COMPLETED',
          date: { gte: weekStart, lte: weekEnd },
        },
        select: { date: true },
      }),
      this.prisma.streakFreeze.findMany({
        where: { userId, coveredDate: { gte: weekStart, lte: weekEnd } },
      }),
      this.prisma.attempt.aggregate({
        where: { userId },
        _sum: { xpAwarded: true },
      }),
      this.prisma.session.aggregate({
        where: { userId },
        _sum: { xpAwarded: true },
      }),
      this.prisma.voiceConversation.aggregate({
        // Filter GRADED: row PENDING belum punya durationSecs asli. No-op utk
        // xpAwarded (PENDING selalu 0) — xpTotal existing tidak berubah.
        where: { userId, status: 'GRADED' },
        _count: { _all: true },
        _sum: { xpAwarded: true, durationSecs: true },
      }),
    ]);

    const stats = new Map<SkillTag, { answered: number; correct: number }>();
    for (const s of SKILLS) stats.set(s, { answered: 0, correct: 0 });
    for (const a of firstTryAttempts) {
      const st = stats.get(a.item.lesson.skill)!;
      st.answered += 1;
      if (a.correct) st.correct += 1;
    }
    const skills: ProgressSkillView[] = SKILLS.map((skill) => {
      const st = stats.get(skill)!;
      return {
        skill,
        answered: st.answered,
        accuracy: st.answered
          ? Math.round((st.correct / st.answered) * 100)
          : null,
      };
    });

    const activeDates = new Set(activeSessions.map((s) => s.date.getTime()));
    const frozenDates = new Set(freezes.map((f) => f.coveredDate.getTime()));
    const week: ProgressWeekDayView[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const t = d.getTime();
      const state: WeekDayState = activeDates.has(t)
        ? 'active'
        : frozenDates.has(t)
          ? 'frozen'
          : 'empty';
      week.push({ date: d.toISOString().slice(0, 10), state });
    }

    const doneMap = user.level
      ? await this.session.lessonCompletion(userId, user.level)
      : new Map<string, boolean>();
    const lessonsDone = [...doneMap.values()].filter(Boolean).length;
    const xpTotal =
      (attemptXpSum._sum.xpAwarded ?? 0) +
      (sessionXpSum._sum.xpAwarded ?? 0) +
      (voiceXpSum._sum.xpAwarded ?? 0);

    return {
      skills,
      week,
      totals: {
        lessonsDone,
        xpTotal,
        longestStreak: streakResult.longest,
        voiceConversations: voiceXpSum._count._all,
        voiceMinutes: Math.round((voiceXpSum._sum.durationSecs ?? 0) / 60),
      },
    };
  }
}
