import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Level, Lesson, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AppConfigService } from '../common/config.service';
import { todayWIB } from '../common/wib';
import { SessionItemView, SessionView } from './session.types';
import { PATH_LESSON } from '../common/content-scope';

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

export interface LessonProgress {
  /** item LIVE bila lesson LIVE; 0 bila lesson DRAFT/RETIRED */
  liveItemCount: number;
  /** semua item LIVE pernah dijawab benar (definisi lessonCompletionInternal) */
  done: boolean;
  /** akurasi percobaan pertama bila done, selain itu null */
  accuracy: number | null;
}

type SessionRow = { itemId: string; source: 'LESSON' | 'REVIEW' };

// Any Prisma client shape with the model delegates the helpers below need —
// either the app-wide PrismaService or an interactive-transaction client
// (see C3 fix in getOrCreateToday, and StreakService's identical PrismaLike
// pattern in ../me/streak.service.ts).
type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private config: AppConfigService,
  ) {}

  /**
   * C3 fix: find-then-create used to run as two separate round-trips, so two
   * near-simultaneous POSTs (e.g. React StrictMode double-mount, or a
   * flaky-network double-tap) could both pass the "no open session" check
   * before either had created one, producing two IN_PROGRESS DAILY sessions
   * for the same user+day. Now the whole read-check-create sequence runs
   * inside one $transaction, guarded by a per-user Postgres advisory xact
   * lock (`pg_advisory_xact_lock(hashtext(userId))`) taken first — a second
   * concurrent call blocks on the lock until the first transaction commits,
   * then re-runs the findFirst and sees the just-created session instead of
   * racing past it.
   */
  async getOrCreateToday(userId: string): Promise<SessionView> {
    const today = todayWIB();

    const session = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

      const open = await tx.session.findFirst({
        where: { userId, date: today, kind: 'DAILY', status: 'IN_PROGRESS' },
        include: { _count: { select: { items: true, attempts: true } } },
      });
      if (open && open._count.items > 0) return open;
      if (open) {
        // Sesi yatim: IN_PROGRESS tapi semua session_item-nya hilang
        // (mis. item/lesson dihapus dari luar alur normal). Tanpa item ia
        // tak pernah bisa selesai dan akan terus dikembalikan di sini —
        // user melihat "Sesi selesai!" kosong selamanya. Buang dan rakit
        // ulang. Bila (anehnya) masih ada attempt yang merujuknya, jangan
        // hapus (FK Restrict) — tutup saja supaya tidak menghalangi.
        if (open._count.attempts === 0) {
          await tx.session.delete({ where: { id: open.id } });
        } else {
          await tx.session.update({
            where: { id: open.id },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        }
      }

      const maxReview = await this.config.getInt('REVIEW_MAX_PER_SESSION');
      const reviews = await tx.reviewQueue.findMany({
        where: { userId, dueDate: { lte: today }, item: { status: 'LIVE' } },
        orderBy: { dueDate: 'asc' },
        take: maxReview,
      });

      const lesson = await this.nextLesson(userId, tx);
      const lessonItems = lesson
        ? await tx.item.findMany({
            where: { lessonId: lesson.id, status: 'LIVE' },
            orderBy: { order: 'asc' },
          })
        : [];

      // C2 fix: `nextLesson` already skips LIVE lessons with zero LIVE
      // items, but this stays defensive — if the lesson branch somehow
      // yields no rows (e.g. its LIVE items were retired between the two
      // queries above), fall through to the reinforcement pool instead of
      // persisting an empty session that can never be completed.
      let rows: SessionRow[] = [];
      if (lesson && lessonItems.length > 0) {
        rows = lessonItems.map((i) => ({
          itemId: i.id,
          source: 'LESSON' as const,
        }));
        for (const r of reviews) {
          const pos = Math.floor(Math.random() * (rows.length + 1));
          rows.splice(pos, 0, { itemId: r.itemId, source: 'REVIEW' as const });
        }
      }

      if (rows.length === 0) {
        const hist = await this.reinforcementItems(userId, 10, tx);
        if (!hist.length)
          throw new ConflictException('Belum ada konten untuk levelmu');
        rows = hist.map((itemId) => ({ itemId, source: 'REVIEW' as const }));
      }

      const s = await tx.session.create({ data: { userId, date: today } });
      await tx.sessionItem.createMany({
        data: rows.map((r, i) => ({ sessionId: s.id, ...r, order: i })),
      });
      return s;
    });
    return this.view(session.id, userId);
  }

  async replay(userId: string, lessonId: string): Promise<SessionView> {
    // gradeAnswer-style guard (mirror answer.service.ts:73-75) — without a
    // ValidationPipe a missing/non-string lessonId would otherwise reach
    // prisma.lesson.findUnique({ where: { id: lessonId } }) and blow up as
    // an uncaught 500 instead of a clean 400.
    if (typeof lessonId !== 'string') {
      throw new BadRequestException('lessonId wajib diisi');
    }
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

  /**
   * Sesi khusus berbicara (`kind: 'SPEAKING'`) — menu "Latihan Berbicara"
   * di Home. Struktur menyalin getOrCreateToday (transaksi + advisory lock +
   * resume sesi terbuka + handling sesi yatim), tapi memakai kind sendiri
   * supaya tidak pernah me-resume sesi DAILY (dan sebaliknya — MULAI tetap
   * kind: 'DAILY'). Konten: semua item UCAPAN dari lesson level user yang
   * belum tuntas (materi baru saja, sesuai keputusan produk).
   */
  async speaking(userId: string): Promise<SessionView> {
    const today = todayWIB();

    const session = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

      const open = await tx.session.findFirst({
        where: { userId, date: today, kind: 'SPEAKING', status: 'IN_PROGRESS' },
        include: { _count: { select: { items: true, attempts: true } } },
      });
      if (open && open._count.items > 0) return open;
      if (open) {
        // Sesi yatim — pola sama dengan getOrCreateToday: tanpa item ia tak
        // pernah bisa selesai; buang bila kosong, tutup bila ada attempt.
        if (open._count.attempts === 0) {
          await tx.session.delete({ where: { id: open.id } });
        } else {
          await tx.session.update({
            where: { id: open.id },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        }
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user?.level) {
        throw new ConflictException('Pilih levelmu dulu di profil');
      }

      const { lessons, map } = await this.lessonCompletionInternal(
        userId,
        user.level,
        tx,
      );
      const incompleteIds = lessons
        .filter((l) => l.items.length > 0 && !map.get(l.id))
        .map((l) => l.id);
      if (incompleteIds.length === 0) {
        throw new ConflictException(
          'Belum ada latihan berbicara baru untuk levelmu',
        );
      }

      const items = await tx.item.findMany({
        where: {
          lessonId: { in: incompleteIds },
          type: 'UCAPAN',
          status: 'LIVE',
        },
        orderBy: [{ lesson: { order: 'asc' } }, { order: 'asc' }],
      });
      if (items.length === 0) {
        throw new ConflictException(
          'Belum ada latihan berbicara baru untuk levelmu',
        );
      }

      const s = await tx.session.create({
        data: { userId, date: today, kind: 'SPEAKING' },
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
    return this.view(session.id, userId);
  }

  /**
   * Kuis bab modul (spec §5.4). Pola getOrCreateToday: transaksi + advisory
   * lock + resume sesi terbuka hari ini untuk bab yang sama + handling yatim.
   * Lesson belum tuntas → MODULE (dihitung target/streak/bonus); sudah tuntas
   * → REPLAY (semantik ulangan). Tanpa review yang diselipkan.
   */
  async moduleQuiz(userId: string, chapterId: string): Promise<SessionView> {
    if (typeof chapterId !== 'string')
      throw new BadRequestException('chapterId wajib diisi');
    const today = todayWIB();

    const session = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

      const chapter = await tx.moduleChapter.findUnique({
        where: { id: chapterId },
        include: { module: true },
      });
      if (!chapter || chapter.module.status !== 'LIVE')
        throw new NotFoundException('Modul atau bab tidak ditemukan');

      const open = await tx.session.findFirst({
        where: {
          userId,
          date: today,
          moduleChapterId: chapterId,
          status: 'IN_PROGRESS',
        },
        include: { _count: { select: { items: true, attempts: true } } },
      });
      if (open && open._count.items > 0) return open;
      if (open) {
        if (open._count.attempts === 0) {
          await tx.session.delete({ where: { id: open.id } });
        } else {
          await tx.session.update({
            where: { id: open.id },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        }
      }

      const prog = chapter.lessonId
        ? (await this.completionForLessons(userId, [chapter.lessonId], tx)).get(
            chapter.lessonId,
          )
        : undefined;
      if (!chapter.lessonId || !prog || prog.liveItemCount === 0) {
        throw new ConflictException('Kuis bab ini belum tersedia');
      }
      const items = await tx.item.findMany({
        where: { lessonId: chapter.lessonId, status: 'LIVE' },
        orderBy: { order: 'asc' },
      });

      const s = await tx.session.create({
        data: {
          userId,
          date: today,
          kind: prog.done ? 'REPLAY' : 'MODULE',
          moduleChapterId: chapterId,
        },
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
    return this.view(session.id, userId);
  }

  async view(sessionId: string, userId: string): Promise<SessionView> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: { item: { include: { lesson: true } } },
          orderBy: { order: 'asc' },
        },
        moduleChapter: {
          select: {
            order: true,
            title: true,
            module: { select: { slug: true } },
          },
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
    const lessonTitle =
      session.kind === 'SPEAKING'
        ? 'Latihan Berbicara'
        : session.moduleChapter
          ? session.moduleChapter.title
          : firstLessonSlot
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
        // UCAPAN: kalimat referensi HARUS ditampilkan ke user agar dibaca —
        // bocor sengaja, bukan rahasia utk tipe ini (bukan kunci jawaban
        // yang bisa "dibobol").
        targetText: item.type === 'UCAPAN' ? item.answerKey : null,
        answeredCorrect: correctSet.has(item.id),
      };
    });

    return {
      id: session.id,
      kind: session.kind,
      status: session.status,
      lessonTitle,
      moduleSlug: session.moduleChapter?.module.slug ?? null,
      chapterOrder: session.moduleChapter?.order ?? null,
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

  /**
   * Progres per-lesson berdasarkan id (tidak difilter level/PATH_LESSON) —
   * dipakai kuis bab modul. Definisi "done" identik lessonCompletionInternal.
   */
  async completionForLessons(
    userId: string,
    lessonIds: string[],
    db: Db = this.prisma,
  ): Promise<Map<string, LessonProgress>> {
    const map = new Map<string, LessonProgress>();
    if (!lessonIds.length) return map;
    const lessons = await db.lesson.findMany({
      where: { id: { in: lessonIds } },
      select: {
        id: true,
        status: true,
        items: { where: { status: 'LIVE' }, select: { id: true } },
      },
    });
    const itemIds = lessons
      .filter((l) => l.status === 'LIVE')
      .flatMap((l) => l.items.map((i) => i.id));
    const attempts = itemIds.length
      ? await db.attempt.findMany({
          where: { userId, itemId: { in: itemIds }, correct: true },
          select: { itemId: true, firstTry: true },
        })
      : [];
    const correct = new Set(attempts.map((a) => a.itemId));
    const firstTryCorrect = new Set(
      attempts.filter((a) => a.firstTry).map((a) => a.itemId),
    );
    for (const l of lessons) {
      const items = l.status === 'LIVE' ? l.items : [];
      const done = items.length > 0 && items.every((i) => correct.has(i.id));
      map.set(l.id, {
        liveItemCount: items.length,
        done,
        accuracy: done
          ? Math.round(
              (items.filter((i) => firstTryCorrect.has(i.id)).length /
                items.length) *
                100,
            )
          : null,
      });
    }
    return map;
  }

  private async lessonCompletionInternal(
    userId: string,
    level: Level,
    db: Db = this.prisma,
  ) {
    const lessons = await db.lesson.findMany({
      where: { level, status: 'LIVE', ...PATH_LESSON },
      orderBy: { order: 'asc' },
      include: { items: { where: { status: 'LIVE' }, select: { id: true } } },
    });
    const itemIds = lessons.flatMap((l) => l.items.map((i) => i.id));
    const correctAttempts = itemIds.length
      ? await db.attempt.findMany({
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

  private async nextLesson(
    userId: string,
    db: Db = this.prisma,
  ): Promise<Lesson | null> {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.level) return null;
    const { lessons, map } = await this.lessonCompletionInternal(
      userId,
      user.level,
      db,
    );
    // C2 fix: a LIVE lesson with zero LIVE items can never be completed
    // (lessonCompletionInternal already maps it to `false`/not-done via
    // `l.items.length > 0 && ...`), so without this filter it would be
    // picked forever, assembling an empty session that permanently locks
    // the user out of their daily session. Skip it and let the next
    // (non-empty) lesson — or the reinforcement pool — take over.
    return (
      lessons.filter((l) => l.items.length > 0).find((l) => !map.get(l.id)) ??
      null
    );
  }

  /**
   * Sesi penguatan: up to `n` LIVE items from the user's attempt history,
   * prioritized by most-often-wrong then longest-since-last-answered.
   * One attempts query — grouping/sorting happens in memory.
   */
  private async reinforcementItems(
    userId: string,
    n: number,
    db: Db = this.prisma,
  ): Promise<string[]> {
    const attempts = await db.attempt.findMany({
      where: { userId, item: { status: 'LIVE', lesson: PATH_LESSON } },
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
