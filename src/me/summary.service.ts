import { Injectable } from '@nestjs/common';
import { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../common/config.service';
import { SessionService } from '../session/session.service';
import { StreakService } from './streak.service';
import { todayWIB, weekStartWIB } from '../common/wib';
import { COUNTED_SESSION_KINDS, PATH_LESSON } from '../common/content-scope';

export interface NextLessonView {
  id: string;
  title: string;
  topic: string;
  itemCount: number;
  estMinutes: number;
  xpEstimate: number;
}

export interface OpenSessionView {
  /** judul lesson slot LESSON pertama; null utk sesi penguatan/replay campuran */
  lessonTitle: string | null;
  /** soal yang sudah terjawab benar (semantik segmen sesi) */
  answered: number;
  total: number;
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
  /** sesi DAILY hari ini yang masih berjalan — Beranda menampilkan
   *  "LANJUTKAN" alih-alih menawarkan lesson baru. */
  openSession: OpenSessionView | null;
  /** talking agent aktif (config VOICE_AGENT_ENABLED) — web memakai ini
   *  utk menampilkan/menyembunyikan kartu "Ngobrol dengan AI" tanpa deploy. */
  voiceAgentEnabled: boolean;
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
      voiceXpSum,
      sessionsCompletedToday,
      reviewsDue,
      thisWeekFreeze,
      xpFirstTry,
      xpSessionComplete,
      xpPerfectSession,
      voiceAgentEnabled,
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
      this.prisma.voiceConversation.aggregate({
        where: { userId },
        _sum: { xpAwarded: true },
      }),
      this.prisma.session.count({
        where: { userId, kind: { in: COUNTED_SESSION_KINDS }, status: 'COMPLETED', date: today },
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
      this.config.getInt('VOICE_AGENT_ENABLED'),
      this.getNextLesson(userId, user.level),
    ]);

    // XP talking agent (XP_VOICE_CONVERSATION) adalah suku ketiga independen —
    // TIDAK masuk target sesi harian/streak (keputusan desain §3 dokumen plan),
    // tapi tetap dihitung ke total XP user.
    const xpTotal =
      (attemptXpSum._sum.xpAwarded ?? 0) +
      (sessionXpSum._sum.xpAwarded ?? 0) +
      (voiceXpSum._sum.xpAwarded ?? 0);

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

    const openSession = await this.getOpenSession(userId, today);

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
      openSession,
      voiceAgentEnabled: voiceAgentEnabled === 1,
    };
  }

  /**
   * First not-yet-completed LIVE lesson at the user's level, ordered like
   * SessionService's own (private) nextLesson pick — reusing its exported
   * `lessonCompletion` helper for the per-user done/not-done map so the two
   * stay consistent, plus this method's own itemCount for the estimate.
   */
  /** Sesi DAILY hari ini yang IN_PROGRESS (beku) — untuk CTA "LANJUTKAN". */
  private async getOpenSession(userId: string, today: Date): Promise<OpenSessionView | null> {
    const open = await this.prisma.session.findFirst({
      // Sengaja BUKAN COUNTED_SESSION_KINDS: sesi kuis bab dilanjutkan dari halaman modul.
      where: { userId, date: today, kind: { in: ['DAILY', 'SPEAKING'] }, status: 'IN_PROGRESS' },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: { item: { select: { lesson: { select: { title: true } } } } },
        },
        attempts: { where: { correct: true }, select: { itemId: true } },
      },
    });
    if (!open || open.items.length === 0) return null;
    const correctIds = new Set(open.attempts.map((a) => a.itemId));
    const firstLessonSlot = open.items.find((si) => si.source === 'LESSON');
    return {
      lessonTitle: firstLessonSlot?.item.lesson.title ?? null,
      answered: open.items.filter((si) => correctIds.has(si.itemId)).length,
      total: open.items.length,
    };
  }

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
      where: { level, status: 'LIVE', ...PATH_LESSON },
      orderBy: { order: 'asc' },
      include: { items: { where: { status: 'LIVE' }, select: { id: true } } },
    });
    if (!lessons.length) return null;

    const completion = await this.session.lessonCompletion(userId, level);
    // C2 mirror: keep in sync with SessionService.nextLesson — a LIVE
    // lesson with zero LIVE items can never be completed, so it must never
    // surface as "next lesson" here either (it would show a lesson the
    // session engine will silently skip).
    const next = lessons
      .filter((l) => l.items.length > 0)
      .find((l) => !completion.get(l.id));
    if (!next) return null;

    return {
      id: next.id,
      title: next.title,
      topic: next.topic,
      itemCount: next.items.length,
    };
  }
}
