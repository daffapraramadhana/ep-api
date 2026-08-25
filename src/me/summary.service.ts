import { Injectable } from '@nestjs/common';
import { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../common/config.service';
import { SessionService } from '../session/session.service';
import { StreakService } from './streak.service';
import { todayWIB, weekStartWIB } from '../common/wib';

export interface NextLessonView {
  id: string;
  title: string;
  topic: string;
  itemCount: number;
  estMinutes: number;
  xpEstimate: number;
}

export interface SummaryView {
  name: string;
  streak: number;
  xpTotal: number;
  freezeAvailableThisWeek: boolean;
  sessionsCompletedToday: number;
  dailyTarget: number;
  reviewsDue: number;
  contentExhausted: boolean;
  nextLesson: NextLessonView | null;
}

@Injectable()
export class SummaryService {
  constructor(
    private prisma: PrismaService,
    private config: AppConfigService,
    private session: SessionService,
    private streak: StreakService,
  ) {}

  async get(userId: string): Promise<SummaryView> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const today = todayWIB();

    const [
      streakResult,
      attemptXpSum,
      sessionXpSum,
      sessionsCompletedToday,
      reviewsDue,
      thisWeekFreeze,
      xpFirstTry,
      xpSessionComplete,
      xpPerfectSession,
      nextLesson,
    ] = await Promise.all([
      this.streak.evaluate(userId),
      this.prisma.attempt.aggregate({
        where: { userId },
        _sum: { xpAwarded: true },
      }),
      this.prisma.session.aggregate({
        where: { userId },
        _sum: { xpAwarded: true },
      }),
      this.prisma.session.count({
        where: { userId, kind: 'DAILY', status: 'COMPLETED', date: today },
      }),
      this.prisma.reviewQueue.count({
        where: { userId, dueDate: { lte: today }, item: { status: 'LIVE' } },
      }),
      this.prisma.streakFreeze.findUnique({
        where: {
          userId_weekStart: { userId, weekStart: weekStartWIB(today) },
        },
      }),
      this.config.getInt('XP_FIRST_TRY'),
      this.config.getInt('XP_SESSION_COMPLETE'),
      this.config.getInt('XP_PERFECT_SESSION'),
      this.getNextLesson(userId, user.level),
    ]);

    const xpTotal =
      (attemptXpSum._sum.xpAwarded ?? 0) + (sessionXpSum._sum.xpAwarded ?? 0);

    const nextLessonView: NextLessonView | null = nextLesson
      ? {
          id: nextLesson.id,
          title: nextLesson.title,
          topic: nextLesson.topic,
          itemCount: nextLesson.itemCount,
          estMinutes: Math.ceil(nextLesson.itemCount * 0.75),
          xpEstimate:
            nextLesson.itemCount * xpFirstTry +
            xpSessionComplete +
            xpPerfectSession,
        }
      : null;

    return {
      name: user.name,
      streak: streakResult.streak,
      xpTotal,
      freezeAvailableThisWeek: !thisWeekFreeze,
      sessionsCompletedToday,
      dailyTarget: user.dailyTargetSessions,
      reviewsDue,
      contentExhausted: nextLessonView === null,
      nextLesson: nextLessonView,
    };
  }

  /**
   * First not-yet-completed LIVE lesson at the user's level, ordered like
   * SessionService's own (private) nextLesson pick — reusing its exported
   * `lessonCompletion` helper for the per-user done/not-done map so the two
   * stay consistent, plus this method's own itemCount for the estimate.
   */
  private async getNextLesson(
    userId: string,
    level: Level | null,
  ): Promise<{
    id: string;
    title: string;
    topic: string;
    itemCount: number;
  } | null> {
    if (!level) return null;

    const lessons = await this.prisma.lesson.findMany({
      where: { level, status: 'LIVE' },
      orderBy: { order: 'asc' },
      include: { items: { where: { status: 'LIVE' }, select: { id: true } } },
    });
    if (!lessons.length) return null;

    const completion = await this.session.lessonCompletion(userId, level);
    const next = lessons.find((l) => !completion.get(l.id));
    if (!next) return null;

    return {
      id: next.id,
      title: next.title,
      topic: next.topic,
      itemCount: next.items.length,
    };
  }
}
