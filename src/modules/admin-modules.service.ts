// apps/api/src/modules/admin-modules.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cefr, ContentStatus, Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ContentService } from '../content/content.service';
import {
  parseChapter,
  ParseError,
  ParseResult,
  StoredBlock,
} from './chapter-parser';
import { ChapterBlock, resolveBlocks } from './blocks';
import { slugify } from './slug';

const LEVELS: Level[] = ['DASAR', 'MENENGAH', 'MAHIR'];
const CEFRS: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const STATUSES: ContentStatus[] = ['DRAFT', 'LIVE', 'RETIRED'];

export interface ModuleInput {
  title?: unknown;
  slug?: unknown;
  summary?: unknown;
  level?: unknown;
  cefr?: unknown;
  coverFile?: unknown;
  order?: unknown;
  status?: unknown;
}
export interface ChapterInput {
  title?: unknown;
  estMinutes?: unknown;
  body?: unknown;
}

const lessonSummarySelect = {
  id: true,
  code: true,
  title: true,
  status: true,
  items: { select: { status: true } },
} satisfies Prisma.LessonSelect;

type LessonSummaryRow = Prisma.LessonGetPayload<{
  select: typeof lessonSummarySelect;
}>;

function lessonSummary(l: LessonSummaryRow | null) {
  if (!l) return null;
  return {
    id: l.id,
    code: l.code,
    title: l.title,
    status: l.status,
    liveItemCount: l.items.filter((i) => i.status === 'LIVE').length,
    draftItemCount: l.items.filter((i) => i.status === 'DRAFT').length,
  };
}

function quizAvailable(l: LessonSummaryRow | null): boolean {
  return !!l && l.status === 'LIVE' && l.items.some((i) => i.status === 'LIVE');
}

/** Bentrok unique (P2002) dari request bersamaan → 409, bukan 500. */
async function conflictOnUnique<T>(
  fn: () => Promise<T>,
  message: string,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      throw new ConflictException(message);
    throw e;
  }
}

@Injectable()
export class AdminModulesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private content: ContentService,
  ) {}

  // ---------- parse ----------

  async parseWithMedia(body: unknown): Promise<ParseResult> {
    if (typeof body !== 'string')
      return {
        ok: false,
        errors: [{ line: 1, message: 'Isi bab wajib diisi' }],
      };
    const r = parseChapter(body);
    if (!r.ok) return r;
    const missing: ParseError[] = [];
    for (const m of r.media) {
      if (!(await this.storage.exists(m.file))) {
        missing.push({
          line: m.line,
          message: `File media tidak ditemukan: ${m.file}`,
        });
      }
    }
    return missing.length ? { ok: false, errors: missing } : r;
  }

  private async parseOrThrow(body: unknown): Promise<StoredBlock[]> {
    const r = await this.parseWithMedia(body);
    if (!r.ok)
      // Spec §6: { errors: [{line, message}] }; `message` tetap diisi supaya
      // klien yang hanya membaca message (api() di web) tetap informatif.
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: r.errors.map((e) => `Baris ${e.line}: ${e.message}`),
        errors: r.errors,
      });
    return r.blocks;
  }

  async preview(
    body: unknown,
  ): Promise<{ blocks: ChapterBlock[] } | { errors: ParseError[] }> {
    const r = await this.parseWithMedia(body);
    return r.ok
      ? { blocks: resolveBlocks(r.blocks, this.storage) }
      : { errors: r.errors };
  }

  // ---------- modul ----------

  private async cleanModule(dto: ModuleInput, creating: boolean) {
    const data: {
      title?: string;
      slug?: string;
      summary?: string;
      level?: Level;
      cefr?: Cefr;
      coverFile?: string | null;
      order?: number;
    } = {};
    if (dto.title !== undefined || creating) {
      if (typeof dto.title !== 'string' || !dto.title.trim())
        throw new BadRequestException('Judul wajib diisi');
      data.title = dto.title.trim();
    }
    if (dto.summary !== undefined || creating) {
      if (typeof dto.summary !== 'string' || !dto.summary.trim())
        throw new BadRequestException('Ringkasan wajib diisi');
      data.summary = dto.summary.trim();
    }
    if (dto.level !== undefined || creating) {
      if (!LEVELS.includes(dto.level as Level))
        throw new BadRequestException('Level tidak valid');
      data.level = dto.level as Level;
    }
    if (dto.cefr !== undefined || creating) {
      if (!CEFRS.includes(dto.cefr as Cefr))
        throw new BadRequestException('CEFR tidak valid');
      data.cefr = dto.cefr as Cefr;
    }
    if (dto.slug !== undefined) {
      const s = typeof dto.slug === 'string' ? slugify(dto.slug) : '';
      if (!s) throw new BadRequestException('Slug tidak valid');
      data.slug = s;
    }
    if (dto.coverFile !== undefined) {
      if (dto.coverFile !== null && typeof dto.coverFile !== 'string')
        throw new BadRequestException('coverFile tidak valid');
      const f = dto.coverFile || null;
      if (f && !(await this.storage.exists(f)))
        throw new BadRequestException(`File media tidak ditemukan: ${f}`);
      data.coverFile = f;
    }
    if (dto.order !== undefined) {
      if (!Number.isInteger(dto.order))
        throw new BadRequestException('Urutan harus bilangan bulat');
      data.order = dto.order as number;
    }
    return data;
  }

  async listModules(query: { level?: string; status?: string }) {
    const modules = await this.prisma.module.findMany({
      where: {
        ...(LEVELS.includes(query.level as Level)
          ? { level: query.level as Level }
          : {}),
        ...(STATUSES.includes(query.status as ContentStatus)
          ? { status: query.status as ContentStatus }
          : {}),
      },
      orderBy: { order: 'asc' },
      include: {
        chapters: { select: { lesson: { select: lessonSummarySelect } } },
      },
    });
    return modules.map((m) => {
      const withLesson = m.chapters.filter((c) => c.lesson).length;
      const quiz = m.chapters.filter((c) => quizAvailable(c.lesson)).length;
      return {
        id: m.id,
        slug: m.slug,
        title: m.title,
        level: m.level,
        cefr: m.cefr,
        status: m.status,
        order: m.order,
        updatedAt: m.updatedAt,
        chapterCount: m.chapters.length,
        quizChapterCount: quiz,
        pendingQuizCount: withLesson - quiz,
        readingCount: m.chapters.length - withLesson,
      };
    });
  }

  async createModule(dto: ModuleInput) {
    const data = await this.cleanModule(dto, true);
    const slug = data.slug ?? slugify(data.title!);
    if (!slug) throw new BadRequestException('Slug tidak valid');
    if (await this.prisma.module.findUnique({ where: { slug } })) {
      throw new ConflictException(`Slug "${slug}" sudah dipakai modul lain`);
    }
    const max = await this.prisma.module.aggregate({ _max: { order: true } });
    return this.prisma.module.create({
      data: {
        title: data.title!,
        summary: data.summary!,
        level: data.level!,
        cefr: data.cefr!,
        coverFile: data.coverFile ?? null,
        slug,
        order: data.order ?? (max._max.order ?? 0) + 1,
      },
    });
  }

  async getModule(id: string) {
    const m = await this.prisma.module.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            title: true,
            estMinutes: true,
            lesson: { select: lessonSummarySelect },
          },
        },
      },
    });
    if (!m) throw new NotFoundException();
    return {
      id: m.id,
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      level: m.level,
      cefr: m.cefr,
      coverFile: m.coverFile,
      coverUrl: m.coverFile ? this.storage.getUrl(m.coverFile) : null,
      order: m.order,
      status: m.status,
      chapters: m.chapters.map((c) => ({
        id: c.id,
        order: c.order,
        title: c.title,
        estMinutes: c.estMinutes,
        lesson: lessonSummary(c.lesson),
      })),
    };
  }

  async updateModule(id: string, dto: ModuleInput) {
    const current = await this.prisma.module.findUnique({ where: { id } });
    if (!current) throw new NotFoundException();
    const data = await this.cleanModule(dto, false);
    let status: ContentStatus | undefined;
    if (dto.status !== undefined) {
      if (!STATUSES.includes(dto.status as ContentStatus))
        throw new BadRequestException('Status tidak valid');
      this.content.assertTransition(current.status, dto.status as string);
      status = dto.status as ContentStatus;
    }
    if (
      data.slug &&
      data.slug !== current.slug &&
      (await this.prisma.module.findUnique({ where: { slug: data.slug } }))
    ) {
      throw new ConflictException(
        `Slug "${data.slug}" sudah dipakai modul lain`,
      );
    }
    await this.prisma.module.update({
      where: { id },
      data: { ...data, ...(status ? { status } : {}) },
    });
    return this.getModule(id);
  }

  // ---------- bab ----------

  private async cleanChapter(dto: ChapterInput, creating: boolean) {
    const data: {
      title?: string;
      estMinutes?: number;
      body?: string;
      blocks?: Prisma.InputJsonValue;
    } = {};
    if (dto.title !== undefined || creating) {
      if (typeof dto.title !== 'string' || !dto.title.trim())
        throw new BadRequestException('Judul bab wajib diisi');
      data.title = dto.title.trim();
    }
    if (dto.estMinutes !== undefined || creating) {
      const n = dto.estMinutes;
      if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > 60) {
        throw new BadRequestException('Estimasi menit harus 1–60');
      }
      data.estMinutes = n as number;
    }
    if (dto.body !== undefined || creating) {
      data.blocks = await this.parseOrThrow(dto.body);
      data.body = (dto.body as string).replace(/\r\n?/g, '\n');
    }
    return data;
  }

  async getChapter(id: string) {
    const c = await this.prisma.moduleChapter.findUnique({
      where: { id },
      include: {
        module: { select: { id: true, title: true, slug: true, status: true } },
        lesson: { select: lessonSummarySelect },
      },
    });
    if (!c) throw new NotFoundException();
    return {
      id: c.id,
      order: c.order,
      title: c.title,
      estMinutes: c.estMinutes,
      body: c.body,
      blocks: resolveBlocks(c.blocks as unknown as StoredBlock[], this.storage),
      module: c.module,
      lesson: lessonSummary(c.lesson),
    };
  }

  async createChapter(moduleId: string, dto: ChapterInput) {
    if (!(await this.prisma.module.findUnique({ where: { id: moduleId } })))
      throw new NotFoundException();
    const data = await this.cleanChapter(dto, true);
    const max = await this.prisma.moduleChapter.aggregate({
      where: { moduleId },
      _max: { order: true },
    });
    const c = await conflictOnUnique(
      () =>
        this.prisma.moduleChapter.create({
          data: {
            moduleId,
            order: (max._max.order ?? 0) + 1,
            title: data.title!,
            estMinutes: data.estMinutes!,
            body: data.body!,
            blocks: data.blocks!,
          },
        }),
      'Bab lain sedang dibuat bersamaan — coba lagi',
    );
    return this.getChapter(c.id);
  }

  async updateChapter(id: string, dto: ChapterInput) {
    if (!(await this.prisma.moduleChapter.findUnique({ where: { id } })))
      throw new NotFoundException();
    const data = await this.cleanChapter(dto, false);
    await this.prisma.moduleChapter.update({ where: { id }, data });
    return this.getChapter(id);
  }

  async deleteChapter(id: string) {
    const c = await this.prisma.moduleChapter.findUnique({
      where: { id },
      include: { module: true, _count: { select: { sessions: true } } },
    });
    if (!c) throw new NotFoundException();
    if (c.module.status !== 'DRAFT' || c._count.sessions > 0) {
      throw new ConflictException(
        'Bab hanya bisa dihapus selama modul DRAFT dan belum pernah dikerjakan',
      );
    }
    await this.prisma.moduleChapter.delete({ where: { id } });
    return { ok: true };
  }

  async moveChapter(id: string, direction: unknown) {
    if (direction !== 'up' && direction !== 'down')
      throw new BadRequestException('direction harus up atau down');
    const c = await this.prisma.moduleChapter.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    await conflictOnUnique(
      () =>
        this.prisma.$transaction(async (tx) => {
          const neighbor = await tx.moduleChapter.findFirst({
            where: {
              moduleId: c.moduleId,
              order: direction === 'up' ? { lt: c.order } : { gt: c.order },
            },
            orderBy: { order: direction === 'up' ? 'desc' : 'asc' },
          });
          if (!neighbor) return;
          // @@unique([moduleId, order]) — tukar lewat nilai sementara.
          await tx.moduleChapter.update({
            where: { id: c.id },
            data: { order: -1 },
          });
          await tx.moduleChapter.update({
            where: { id: neighbor.id },
            data: { order: c.order },
          });
          await tx.moduleChapter.update({
            where: { id: c.id },
            data: { order: neighbor.order },
          });
        }),
      'Urutan bab sedang diubah bersamaan — muat ulang halaman',
    );
    return this.getModule(c.moduleId);
  }

  // ---------- kuis bab ----------

  async createQuiz(chapterId: string) {
    // Satu transaksi + advisory lock per bab: klik ganda tidak boleh membuat
    // dua lesson (yang kedua akan jadi DRAFT yatim selamanya).
    const lesson = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${chapterId}))`;
      const c = await tx.moduleChapter.findUnique({
        where: { id: chapterId },
        include: { module: true },
      });
      if (!c) throw new NotFoundException();
      if (c.lessonId) throw new ConflictException('Bab ini sudah punya kuis');
      const base = `MOD-${c.module.slug.toUpperCase()}-${c.order}`;
      let code = base;
      for (let n = 2; await tx.lesson.findUnique({ where: { code } }); n++)
        code = `${base}-${n}`;
      const maxOrder = await tx.lesson.aggregate({
        where: { level: c.module.level },
        _max: { order: true },
      });
      const l = await tx.lesson.create({
        data: {
          code,
          title: c.title,
          topic: c.module.title,
          level: c.module.level,
          cefr: c.module.cefr,
          skill: 'VOCABULARY',
          order: (maxOrder._max.order ?? 0) + 1,
          status: 'DRAFT',
        },
      });
      await tx.moduleChapter.update({
        where: { id: chapterId },
        data: { lessonId: l.id },
      });
      return l;
    });
    return { lessonId: lesson.id, code: lesson.code };
  }

  async linkQuiz(chapterId: string, lessonId: unknown) {
    const c = await this.prisma.moduleChapter.findUnique({
      where: { id: chapterId },
    });
    if (!c) throw new NotFoundException();
    if (lessonId === null) {
      await this.prisma.moduleChapter.update({
        where: { id: chapterId },
        data: { lessonId: null },
      });
      return this.getChapter(chapterId);
    }
    if (typeof lessonId !== 'string')
      throw new BadRequestException('lessonId wajib diisi');
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { moduleChapter: true },
    });
    if (!lesson) throw new NotFoundException('Lesson tidak ditemukan');
    if (lesson.moduleChapter && lesson.moduleChapter.id !== chapterId) {
      throw new ConflictException('Lesson ini sudah dipakai bab lain');
    }
    await conflictOnUnique(
      () =>
        this.prisma.moduleChapter.update({
          where: { id: chapterId },
          data: { lessonId },
        }),
      'Lesson ini sudah dipakai bab lain',
    );
    return this.getChapter(chapterId);
  }
}
