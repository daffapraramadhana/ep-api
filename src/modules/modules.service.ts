// apps/api/src/modules/modules.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AppConfigService } from '../common/config.service';
import { LessonProgress, SessionService } from '../session/session.service';
import { resolveBlocks } from './blocks';
import type { StoredBlock } from './chapter-parser';
import type {
  ChapterView,
  ModuleCard,
  ModuleChapterRow,
  ModuleDetailView,
  ModuleInProgressView,
  ModulesView,
} from './modules.types';

const chapterSelect = {
  id: true,
  order: true,
  title: true,
  estMinutes: true,
  lessonId: true,
} satisfies Prisma.ModuleChapterSelect;
type LiveModule = Prisma.ModuleGetPayload<{
  include: { chapters: { select: typeof chapterSelect } };
}>;

@Injectable()
export class ModulesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private config: AppConfigService,
    private session: SessionService,
  ) {}

  /** Modul LIVE yang punya ≥1 bab — satu-satunya yang boleh dilihat user. */
  private loadLive(where: Prisma.ModuleWhereInput = {}): Promise<LiveModule[]> {
    return this.prisma.module.findMany({
      where: { status: 'LIVE', chapters: { some: {} }, ...where },
      orderBy: { order: 'asc' },
      include: {
        chapters: { orderBy: { order: 'asc' }, select: chapterSelect },
      },
    });
  }

  private progressFor(userId: string, modules: LiveModule[]) {
    const ids = modules.flatMap((m) =>
      m.chapters.map((c) => c.lessonId).filter((x): x is string => !!x),
    );
    return this.session.completionForLessons(userId, ids);
  }

  private rows(
    m: LiveModule,
    prog: Map<string, LessonProgress>,
  ): ModuleChapterRow[] {
    return m.chapters.map((c) => {
      const p = c.lessonId ? prog.get(c.lessonId) : undefined;
      const quiz = !!p && p.liveItemCount > 0;
      return {
        id: c.id,
        order: c.order,
        title: c.title,
        estMinutes: c.estMinutes,
        kind: quiz ? 'quiz' : 'reading',
        done: quiz && !!p?.done,
        accuracy: quiz ? (p?.accuracy ?? null) : null,
        itemCount: quiz ? (p?.liveItemCount ?? 0) : 0,
      };
    });
  }

  private card(m: LiveModule, rows: ModuleChapterRow[]): ModuleCard {
    const quiz = rows.filter((r) => r.kind === 'quiz');
    return {
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      level: m.level,
      cefr: m.cefr,
      coverUrl: m.coverFile ? this.storage.getUrl(m.coverFile) : null,
      chapterCount: rows.length,
      quizChapterCount: quiz.length,
      doneCount: quiz.filter((r) => r.done).length,
      estMinutes: rows.reduce((n, r) => n + r.estMinutes, 0),
    };
  }

  async list(userId: string): Promise<ModulesView> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { level: true },
    });
    const modules = await this.loadLive();
    const prog = await this.progressFor(userId, modules);
    const cards = modules.map((m) => this.card(m, this.rows(m, prog)));
    const inProgressSlug = await this.pickInProgress(userId, modules, cards);
    return {
      inProgress: cards.find((c) => c.slug === inProgressSlug) ?? null,
      forYou: cards.filter((c) => c.level === user.level),
      others: cards.filter((c) => c.level !== user.level),
    };
  }

  /** Modul berjalan (≥1 bab selesai, belum semua) yang paling baru dikerjakan; seri → urutan modul. */
  private async pickInProgress(
    userId: string,
    modules: LiveModule[],
    cards: ModuleCard[],
  ): Promise<string | null> {
    const candidates = cards.filter(
      (c) => c.doneCount > 0 && c.doneCount < c.quizChapterCount,
    );
    if (!candidates.length) return null;
    const chapterToSlug = new Map<string, string>();
    for (const m of modules)
      for (const c of m.chapters) chapterToSlug.set(c.id, m.slug);
    const sessions = await this.prisma.session.findMany({
      where: { userId, moduleChapterId: { in: [...chapterToSlug.keys()] } },
      select: { moduleChapterId: true, date: true },
    });
    const latest = new Map<string, number>();
    for (const s of sessions) {
      const slug = chapterToSlug.get(s.moduleChapterId!)!;
      latest.set(slug, Math.max(latest.get(slug) ?? 0, s.date.getTime()));
    }
    return [...candidates].sort(
      (a, b) => (latest.get(b.slug) ?? 0) - (latest.get(a.slug) ?? 0),
    )[0].slug;
  }

  async detail(userId: string, slug: string): Promise<ModuleDetailView> {
    const [m] = await this.loadLive({ slug });
    if (!m) throw new NotFoundException();
    const rows = this.rows(m, await this.progressFor(userId, [m]));
    return {
      ...this.card(m, rows),
      nextOrder: rows.find((r) => r.kind === 'quiz' && !r.done)?.order ?? null,
      chapters: rows,
    };
  }

  async chapter(
    userId: string,
    slug: string,
    orderParam: string,
  ): Promise<ChapterView> {
    const order = Number(orderParam);
    if (!Number.isInteger(order)) throw new NotFoundException();
    const [m] = await this.loadLive({ slug });
    if (!m) throw new NotFoundException();
    const idx = m.chapters.findIndex((c) => c.order === order);
    if (idx < 0) throw new NotFoundException();
    const ch = await this.prisma.moduleChapter.findUniqueOrThrow({
      where: { id: m.chapters[idx].id },
    });
    const p = ch.lessonId
      ? (await this.session.completionForLessons(userId, [ch.lessonId])).get(
          ch.lessonId,
        )
      : undefined;

    let quiz: ChapterView['quiz'] = null;
    if (p && p.liveItemCount > 0) {
      const [first, complete, perfect] = await Promise.all([
        this.config.getInt('XP_FIRST_TRY'),
        this.config.getInt('XP_SESSION_COMPLETE'),
        this.config.getInt('XP_PERFECT_SESSION'),
      ]);
      quiz = {
        itemCount: p.liveItemCount,
        done: p.done,
        estXp: p.done ? null : p.liveItemCount * first + complete + perfect,
      };
    }
    return {
      id: ch.id,
      order: ch.order,
      title: ch.title,
      estMinutes: ch.estMinutes,
      blocks: resolveBlocks(
        ch.blocks as unknown as StoredBlock[],
        this.storage,
      ),
      quiz,
      prevOrder: m.chapters[idx - 1]?.order ?? null,
      nextOrder: m.chapters[idx + 1]?.order ?? null,
      chapterCount: m.chapters.length,
      moduleSlug: m.slug,
      moduleTitle: m.title,
    };
  }

  async inProgressSummary(
    userId: string,
  ): Promise<ModuleInProgressView | null> {
    const { inProgress } = await this.list(userId);
    if (!inProgress) return null;
    const d = await this.detail(userId, inProgress.slug);
    const next = d.chapters.find((c) => c.order === d.nextOrder);
    return next
      ? {
          slug: d.slug,
          title: d.title,
          nextOrder: next.order,
          nextTitle: next.title,
        }
      : null;
  }
}
