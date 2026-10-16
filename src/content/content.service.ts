import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Item, Lesson, Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TtsService } from '../tts/tts.service';
import { itemSpecs } from '../tts/content-specs';
import { StorageService } from '../storage/storage.service';
import { validateRows, RawRow } from './import/row-validator';

export interface LessonListItem {
  id: string;
  code: string;
  title: string;
  topic: string;
  level: string;
  cefr: string;
  skill: string;
  order: number;
  status: string;
  itemCount: number;
  liveItemCount: number;
  moduleChapter: { moduleTitle: string; order: number } | null;
}

export interface LessonListQuery {
  level?: string;
  status?: string;
  topic?: string;
}

export type LessonPatch = Partial<
  Pick<Lesson, 'title' | 'topic' | 'order' | 'status'>
>;
export type ItemPatch = Partial<
  Pick<
    Item,
    | 'prompt'
    | 'options'
    | 'answerKey'
    | 'acceptedAnswers'
    | 'explanation'
    | 'mediaFile'
    | 'passage'
    | 'status'
  >
>;

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['LIVE'],
  LIVE: ['DRAFT', 'RETIRED'],
  RETIRED: [],
};

const LEVEL_TO_TEMPLATE: Record<string, string> = {
  DASAR: 'dasar',
  MENENGAH: 'menengah',
  MAHIR: 'mahir',
};

const SKILL_TO_TEMPLATE: Record<string, string> = {
  VOCABULARY: 'vocabulary',
  GRAMMAR: 'grammar',
  LISTENING: 'listening',
  READING: 'reading',
  SPEAKING: 'speaking',
};

const TYPE_TO_TEMPLATE: Record<string, string> = {
  PILIHAN_GANDA: 'pilihan_ganda',
  ISIAN: 'isian',
  SUSUN_KALIMAT: 'susun_kalimat',
  UCAPAN: 'ucapan',
};

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private tts: TtsService,
  ) {}

  assertTransition(from: string, to: string) {
    if (from !== to && !ALLOWED_TRANSITIONS[from]?.includes(to))
      throw new BadRequestException(
        `Transisi status ${from}→${to} tidak diizinkan`,
      );
  }

  async listLessons(query: LessonListQuery): Promise<LessonListItem[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        ...(query.level ? { level: query.level as Level } : {}),
        ...(query.status ? { status: query.status as ContentStatus } : {}),
        ...(query.topic ? { topic: query.topic } : {}),
      },
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
      include: {
        items: { select: { status: true } },
        moduleChapter: {
          select: { order: true, module: { select: { title: true } } },
        },
      },
    });
    return lessons.map((l) => ({
      id: l.id,
      code: l.code,
      title: l.title,
      topic: l.topic,
      level: l.level,
      cefr: l.cefr,
      skill: l.skill,
      order: l.order,
      status: l.status,
      itemCount: l.items.length,
      liveItemCount: l.items.filter((i) => i.status === 'LIVE').length,
      moduleChapter: l.moduleChapter
        ? {
            moduleTitle: l.moduleChapter.module.title,
            order: l.moduleChapter.order,
          }
        : null,
    }));
  }

  async updateLesson(id: string, patch: LessonPatch): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException();

    if (patch.status !== undefined) {
      this.assertTransition(lesson.status, patch.status);
      // C2 fix: publishing a lesson with zero LIVE items produces a
      // permanent daily-lockout for any user assigned it (session.service.ts
      // getOrCreateToday would otherwise persist an empty, uncompletable
      // session) — reject the DRAFT→LIVE transition itself so this content
      // state can never be published in the first place.
      if (patch.status === 'LIVE' && lesson.status !== 'LIVE') {
        const liveItemCount = await this.prisma.item.count({
          where: { lessonId: id, status: 'LIVE' },
        });
        if (liveItemCount === 0) {
          throw new BadRequestException(
            'Lesson tanpa soal LIVE tidak bisa diterbitkan',
          );
        }
      }
    }

    return this.prisma.lesson.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.topic !== undefined ? { topic: patch.topic } : {}),
        ...(patch.order !== undefined ? { order: patch.order } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
      },
    });
  }

  /** Item + audioUrl untuk pemutar editor: file unggahan, selain itu klip TTS. */
  async listLessonItems(
    lessonId: string,
  ): Promise<(Item & { audioUrl: string | null })[]> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException();
    const items = await this.prisma.item.findMany({
      where: { lessonId },
      orderBy: { order: 'asc' },
    });
    const urls = await this.tts.urlsFor(
      items.map((it) => {
        const s = itemSpecs(it);
        return it.mediaFile ? null : (s.media ?? s.target);
      }),
    );
    return items.map((it, i) => ({
      ...it,
      audioUrl: it.mediaFile ? this.storage.getUrl(it.mediaFile) : urls[i],
    }));
  }

  async updateItem(id: string, patch: ItemPatch): Promise<Item> {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { lesson: true },
    });
    if (!item) throw new NotFoundException();

    if (patch.status !== undefined)
      this.assertTransition(item.status, patch.status);

    // `type` is not part of ItemPatch and is not persisted below, but
    // without a whitelisting ValidationPipe a caller could still smuggle it
    // into the request body. If it leaked into `merged` it would change
    // which TYPE_TO_TEMPLATE rules buildRawRow/validateRows run under —
    // drop it so revalidation always uses the item's real, persisted type.
    const { type: _smuggledType, ...safePatch } = patch as ItemPatch & {
      type?: unknown;
    };

    const merged = { ...item, ...safePatch };

    // Bangun RawRow tunggal dari state hasil merge untuk validasi ulang via validateRows.
    const raw = this.buildRawRow(merged, item.lesson);
    const mediaNames = new Set(await this.storage.listNames());
    const { valid, errors } = validateRows([raw], mediaNames);
    if (errors.length) throw new BadRequestException(errors[0].message);
    const normalized = valid[0];

    // Persist from the validator's NormalizedRow, not the raw patch — this
    // is what stores normalization side effects (e.g. answerKey unshifted
    // into acceptedAnswers for isian) instead of silently dropping them.
    return this.prisma.item.update({
      where: { id },
      data: {
        prompt: normalized.prompt,
        options: (normalized.options as Prisma.InputJsonValue) ?? Prisma.DbNull,
        answerKey: normalized.answerKey,
        acceptedAnswers: normalized.acceptedAnswers,
        explanation: normalized.explanation,
        mediaFile: normalized.mediaFile,
        passage: normalized.passage,
        ...(safePatch.status !== undefined ? { status: safePatch.status } : {}),
      },
    });
  }

  private buildRawRow(
    merged: Item & { [k: string]: any },
    lesson: Lesson,
  ): RawRow {
    const options = (merged.options as string[] | null) ?? null;
    const row: RawRow = {
      lesson_code: lesson.code,
      lesson_title: lesson.title,
      topic: lesson.topic,
      level: LEVEL_TO_TEMPLATE[lesson.level] ?? '',
      cefr: lesson.cefr,
      skill: SKILL_TO_TEMPLATE[lesson.skill] ?? '',
      item_order: String(merged.order),
      type: TYPE_TO_TEMPLATE[merged.type] ?? '',
      prompt: merged.prompt ?? '',
      option_a: options?.[0] ?? '',
      option_b: options?.[1] ?? '',
      option_c: options?.[2] ?? '',
      option_d: options?.[3] ?? '',
      answer: merged.answerKey ?? '',
      accepted_answers:
        (merged.acceptedAnswers as string[] | undefined)?.join(';') ?? '',
      explanation: merged.explanation ?? '',
      media_file: merged.mediaFile ?? '',
      passage: merged.passage ?? '',
    };
    return row;
  }
}
