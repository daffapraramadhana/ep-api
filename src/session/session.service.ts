import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Level, Lesson } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AppConfigService } from '../common/config.service';
import { todayWIB } from '../common/wib';
import { SessionItemView, SessionView } from './session.types';

/**
 * Hash a string into a uint32 seed (FNV-1a variant) so the same
 * sessionId+itemId always produces the same shuffle seed.
 */
export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Deterministic Fisher-Yates shuffle driven by a small LCG seeded from
 * `seedString`. Same array + same seed => same output every time, so a
 * GET reload doesn't reshuffle SUSUN_KALIMAT chips out from under the user.
 */
export function seededShuffle<T>(arr: T[], seedString: string): T[] {
  const result = arr.slice();
  let state = hashSeed(seedString) || 1; // avoid a zero seed locking the LCG
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type SessionRow = { itemId: string; source: 'LESSON' | 'REVIEW' };

@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private config: AppConfigService,
  ) {}

  async getOrCreateToday(userId: string): Promise<SessionView> {
    const today = todayWIB();
    const open = await this.prisma.session.findFirst({
      where: { userId, date: today, kind: 'DAILY', status: 'IN_PROGRESS' },
    });
    if (open) return this.view(open.id, userId);

    const maxReview = await this.config.getInt('REVIEW_MAX_PER_SESSION');
    const reviews = await this.prisma.reviewQueue.findMany({
      where: { userId, dueDate: { lte: today }, item: { status: 'LIVE' } },
      orderBy: { dueDate: 'asc' },
      take: maxReview,
    });

    const lesson = await this.nextLesson(userId);
    const lessonItems = lesson
      ? await this.prisma.item.findMany({
          where: { lessonId: lesson.id, status: 'LIVE' },
          orderBy: { order: 'asc' },
        })
      : [];

    let rows: SessionRow[];
    if (lesson) {
      rows = lessonItems.map((i) => ({
        itemId: i.id,
        source: 'LESSON' as const,
      }));
      for (const r of reviews) {
        const pos = Math.floor(Math.random() * (rows.length + 1));
        rows.splice(pos, 0, { itemId: r.itemId, source: 'REVIEW' as const });
      }
    } else {
      const hist = await this.reinforcementItems(userId, 10);
      if (!hist.length)
        throw new ConflictException('Belum ada konten untuk levelmu');
      rows = hist.map((itemId) => ({ itemId, source: 'REVIEW' as const }));
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const s = await tx.session.create({ data: { userId, date: today } });
      await tx.sessionItem.createMany({
        data: rows.map((r, i) => ({ sessionId: s.id, ...r, order: i })),
      });
      return s;
    });
    return this.view(created.id, userId);
  }

  async replay(userId: string, lessonId: string): Promise<SessionView> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException();

    const completion = await this.lessonCompletion(userId, lesson.level);
    if (!completion.get(lessonId)) {
      throw new BadRequestException('Lesson belum selesai');
    }

    const items = await this.prisma.item.findMany({
      where: { lessonId, status: 'LIVE' },
      orderBy: { order: 'asc' },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const s = await tx.session.create({
        data: { userId, date: todayWIB(), kind: 'REPLAY' },
      });
      await tx.sessionItem.createMany({
        data: items.map((i, idx) => ({
          sessionId: s.id,
          itemId: i.id,
          source: 'LESSON' as const,
          order: idx,
        })),
      });
      return s;
    });
    return this.view(created.id, userId);
  }

  async view(sessionId: string, userId: string): Promise<SessionView> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: { item: { include: { lesson: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!session || session.userId !== userId) throw new NotFoundException();

    const itemIds = session.items.map((si) => si.itemId);
    const attempts = itemIds.length
      ? await this.prisma.attempt.findMany({
          where: { sessionId, itemId: { in: itemIds } },
          select: { itemId: true, correct: true },
        })
      : [];
    const correctSet = new Set(
      attempts.filter((a) => a.correct).map((a) => a.itemId),
    );
    const answeredSet = new Set(attempts.map((a) => a.itemId));

    const firstLessonSlot = session.items.find((si) => si.source === 'LESSON');
    const lessonTitle = firstLessonSlot
      ? firstLessonSlot.item.lesson.title
      : null;

    const items: SessionItemView[] = session.items.map((si) => {
      const item = si.item;
      const options = (item.options as string[] | null) ?? null;
      const chips =
        item.type === 'SUSUN_KALIMAT'
          ? this.shuffleChips(item.answerKey, `${sessionId}:${item.id}`)
          : null;
      return {
        itemId: item.id,
        source: si.source,
        order: si.order,
        type: item.type,
        prompt: item.prompt,
        options,
        mediaUrl: item.mediaFile ? this.storage.getUrl(item.mediaFile) : null,
        passage: item.passage,
        chips,
        answeredCorrect: correctSet.has(item.id),
      };
    });

    return {
      id: session.id,
      kind: session.kind,
      status: session.status,
      lessonTitle,
      items,
      progress: { answered: answeredSet.size, total: items.length },
    };
  }

  /**
   * Per-lesson completion for `level`: a lesson is "done" once every one of
   * its LIVE items has at least one correct attempt by `userId`. One lessons
   * query (with LIVE items) + one attempts query — no per-lesson N+1.
   * Exported for Task 6 (journey) to reuse via SessionModule.
   */
  async lessonCompletion(
    userId: string,
    level: Level,
  ): Promise<Map<string, boolean>> {
    return (await this.lessonCompletionInternal(userId, level)).map;
  }

  private async lessonCompletionInternal(userId: string, level: Level) {
    const lessons = await this.prisma.lesson.findMany({
      where: { level, status: 'LIVE' },
      orderBy: { order: 'asc' },
      include: { items: { where: { status: 'LIVE' }, select: { id: true } } },
    });
    const itemIds = lessons.flatMap((l) => l.items.map((i) => i.id));
    const correctAttempts = itemIds.length
      ? await this.prisma.attempt.findMany({
          where: { userId, itemId: { in: itemIds }, correct: true },
          select: { itemId: true },
        })
      : [];
    const correctSet = new Set(correctAttempts.map((a) => a.itemId));
    const map = new Map<string, boolean>();
    for (const l of lessons) {
      map.set(
        l.id,
        l.items.length > 0 && l.items.every((i) => correctSet.has(i.id)),
      );
    }
    return { lessons, map };
  }

  private async nextLesson(userId: string): Promise<Lesson | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.level) return null;
    const { lessons, map } = await this.lessonCompletionInternal(
      userId,
      user.level,
    );
    return lessons.find((l) => !map.get(l.id)) ?? null;
  }

  /**
   * Sesi penguatan: up to `n` LIVE items from the user's attempt history,
   * prioritized by most-often-wrong then longest-since-last-answered.
   * One attempts query — grouping/sorting happens in memory.
   */
  private async reinforcementItems(
    userId: string,
    n: number,
  ): Promise<string[]> {
    const attempts = await this.prisma.attempt.findMany({
      where: { userId, item: { status: 'LIVE' } },
      select: { itemId: true, correct: true, answeredAt: true },
    });
    if (!attempts.length) return [];
    const stats = new Map<string, { wrong: number; last: number }>();
    for (const a of attempts) {
      const cur = stats.get(a.itemId) ?? { wrong: 0, last: 0 };
      if (!a.correct) cur.wrong += 1;
      cur.last = Math.max(cur.last, a.answeredAt.getTime());
      stats.set(a.itemId, cur);
    }
    return [...stats.entries()]
      .sort((a, b) => b[1].wrong - a[1].wrong || a[1].last - b[1].last)
      .map(([id]) => id)
      .slice(0, n);
  }

  private shuffleChips(answerKey: string, seedString: string): string[] {
    const words = answerKey.split(/\s+/).filter(Boolean);
    const shuffled = seededShuffle(words, seedString);
    if (words.length > 1 && shuffled.every((w, i) => w === words[i])) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    return shuffled;
  }
}
