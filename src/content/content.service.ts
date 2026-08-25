import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Item, Lesson, Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
};

const TYPE_TO_TEMPLATE: Record<string, string> = {
  PILIHAN_GANDA: 'pilihan_ganda',
  ISIAN: 'isian',
  SUSUN_KALIMAT: 'susun_kalimat',
};

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
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
      include: { items: { select: { status: true } } },
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
    }));
  }

  async updateLesson(id: string, patch: LessonPatch): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException();

    if (patch.status !== undefined)
      this.assertTransition(lesson.status, patch.status);

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

  async listLessonItems(lessonId: string): Promise<Item[]> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException();
    return this.prisma.item.findMany({
      where: { lessonId },
      orderBy: { order: 'asc' },
    });
  }

  async updateItem(id: string, patch: ItemPatch): Promise<Item> {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { lesson: true },
    });
    if (!item) throw new NotFoundException();

    if (patch.status !== undefined)
      this.assertTransition(item.status, patch.status);

    const merged = { ...item, ...patch };

    // Bangun RawRow tunggal dari state hasil merge untuk validasi ulang via validateRows.
    const raw = this.buildRawRow(merged, item.lesson);
    const mediaNames = new Set(await this.storage.listNames());
    const { errors } = validateRows([raw], mediaNames);
    if (errors.length) throw new BadRequestException(errors[0].message);

    return this.prisma.item.update({
      where: { id },
      data: {
        ...(patch.prompt !== undefined ? { prompt: patch.prompt } : {}),
        ...(patch.options !== undefined
          ? {
              options:
                (patch.options as Prisma.InputJsonValue) ?? Prisma.DbNull,
            }
          : {}),
        ...(patch.answerKey !== undefined
          ? { answerKey: patch.answerKey }
          : {}),
        ...(patch.acceptedAnswers !== undefined
          ? { acceptedAnswers: patch.acceptedAnswers }
          : {}),
        ...(patch.explanation !== undefined
          ? { explanation: patch.explanation }
          : {}),
        ...(patch.mediaFile !== undefined
          ? { mediaFile: patch.mediaFile }
          : {}),
        ...(patch.passage !== undefined ? { passage: patch.passage } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
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
