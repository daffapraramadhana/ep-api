import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../common/config.service';
import { StreakService } from './streak.service';
import { JourneyService } from '../journey/journey.service';
import { todayWIB, weekStartWIB } from '../common/wib';
import { COUNTED_SESSION_KINDS } from '../common/content-scope';

/** Langkah `now` Perjalanan (spec satu-perjalanan §5.5) — pelajaran atau bab modul. */
export interface NextLessonView {
  id: string; // lessonId
  title: string; // judul lesson | judul bab
  topic: string; // judul unit
  itemCount: number;
  estMinutes: number;
  xpEstimate: number;
  kind: 'lesson' | 'chapter';
  unit: { position: number; title: string };
  chapter: {
    moduleSlug: string;
    chapterId: string;
    order: number;
    position: number;
  } | null;
}

export interface OpenSessionView {
  /** judul lesson slot LESSON pertama (MODULE: judul bab); null utk sesi
   *  penguatan/replay campuran */
  lessonTitle: string | null;
  /** soal yang sudah terjawab benar (semantik segmen sesi) */
  answered: number;
  total: number;
  /** terisi hanya untuk sesi kuis bab (MODULE) — Beranda melanjutkannya */
  moduleChapterId: string | null;
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
  /** sesi hari ini yang masih berjalan (DAILY/SPEAKING, lalu MODULE) —
   *  Beranda menampilkan "LANJUTKAN" alih-alih menawarkan langkah baru. */
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
    private streak: StreakService,
    private journey: JourneyService,
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
        where: {
          userId,
          kind: { in: COUNTED_SESSION_KINDS },
          status: 'COMPLETED',
          date: today,
        },
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
      this.getNextLesson(userId),
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
          ...nextLesson,
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
   * Sesi hari ini yang IN_PROGRESS (beku) — untuk CTA "LANJUTKAN".
   * DAILY/SPEAKING diutamakan; sesi kuis bab (MODULE) hanya bila tak ada
   * yang lain (spec satu-perjalanan §5.5).
   */
  private async getOpenSession(
    userId: string,
    today: Date,
  ): Promise<OpenSessionView | null> {
    const find = (kinds: ('DAILY' | 'SPEAKING' | 'MODULE')[]) =>
      this.prisma.session.findFirst({
        where: {
          userId,
          date: today,
          kind: { in: kinds },
          status: 'IN_PROGRESS',
          items: { some: {} },
        },
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: {
              item: { select: { lesson: { select: { title: true } } } },
            },
          },
          attempts: { where: { correct: true }, select: { itemId: true } },
          moduleChapter: { select: { id: true, title: true } },
        },
      });
    const open =
      (await find(['DAILY', 'SPEAKING'])) ?? (await find(['MODULE']));
    if (!open) return null;
    const correctIds = new Set(open.attempts.map((a) => a.itemId));
    const firstLessonSlot = open.items.find((si) => si.source === 'LESSON');
    return {
      lessonTitle:
        open.moduleChapter?.title ?? firstLessonSlot?.item.lesson.title ?? null,
      answered: open.items.filter((si) => correctIds.has(si.itemId)).length,
      total: open.items.length,
      moduleChapterId: open.moduleChapter?.id ?? null,
    };
  }

  /**
   * Langkah `now` dari /journey — sumber yang sama dengan Perjalanan, jadi
   * Beranda tak pernah menunjuk langkah lain. xpEstimate diisi pemanggil.
   */
  private async getNextLesson(
    userId: string,
  ): Promise<Omit<NextLessonView, 'xpEstimate'> | null> {
    const { units } = await this.journey.get(userId);
    for (const [i, u] of units.entries()) {
      const step = u.steps.find((st) => st.state === 'now');
      if (!step) continue;
      return {
        id: step.id,
        title: step.title,
        topic: u.title,
        itemCount: step.itemCount,
        estMinutes: step.chapter
          ? step.chapter.estMinutes
          : Math.ceil(step.itemCount * 0.75),
        kind: step.kind === 'chapter' ? 'chapter' : 'lesson',
        unit: { position: i + 1, title: u.title },
        chapter: step.chapter
          ? {
              moduleSlug: step.chapter.moduleSlug,
              chapterId: step.chapter.chapterId,
              order: step.chapter.order,
              position: step.chapter.position,
            }
          : null,
      };
    }
    return null;
  }
}
