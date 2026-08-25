import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { parseWorkbook } from './xlsx-parser';
import { validateRows, NormalizedRow, RowError } from './row-validator';

export interface ImportResult {
  lessonsCreated: number;
  lessonsUpdated: number;
  itemsCreated: number;
  itemsUpdated: number;
  skippedRows: number;
  errors: RowError[];
}

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async importWorkbook(buf: Buffer): Promise<ImportResult> {
    const rows = await parseWorkbook(buf);
    const media = new Set(await this.storage.listNames());
    const { valid, errors } = validateRows(rows, media);
    const result: ImportResult = {
      lessonsCreated: 0,
      lessonsUpdated: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      skippedRows: errors.length ? new Set(errors.map((e) => e.row)).size : 0,
      errors,
    };

    await this.prisma.$transaction(async (tx) => {
      const byLesson = new Map<string, NormalizedRow[]>();
      for (const v of valid)
        byLesson.set(v.lessonCode, [...(byLesson.get(v.lessonCode) ?? []), v]);

      for (const [code, items] of byLesson) {
        const meta = items[0];
        let lesson = await tx.lesson.findUnique({ where: { code } });
        if (!lesson) {
          const max = await tx.lesson.aggregate({
            where: { level: meta.level },
            _max: { order: true },
          });
          lesson = await tx.lesson.create({
            data: {
              code,
              title: meta.lessonTitle,
              topic: meta.topic,
              level: meta.level,
              cefr: meta.cefr,
              skill: meta.skill,
              order: (max._max.order ?? 0) + 1,
            },
          });
          result.lessonsCreated++;
        } else {
          lesson = await tx.lesson.update({
            where: { id: lesson.id },
            data: {
              title: meta.lessonTitle,
              topic: meta.topic,
              level: meta.level,
              cefr: meta.cefr,
              skill: meta.skill,
            },
          });
          result.lessonsUpdated++;
        }
        for (const v of items) {
          const data = {
            type: v.type,
            prompt: v.prompt,
            options: v.options ?? Prisma.DbNull,
            answerKey: v.answerKey,
            acceptedAnswers: v.acceptedAnswers,
            explanation: v.explanation,
            mediaFile: v.mediaFile,
            passage: v.passage,
          };
          const existing = await tx.item.findUnique({
            where: {
              lessonId_order: { lessonId: lesson.id, order: v.itemOrder },
            },
          });
          if (existing) {
            await tx.item.update({
              where: { id: existing.id },
              data: { ...data, status: 'DRAFT' },
            });
            result.itemsUpdated++;
          } else {
            await tx.item.create({
              data: { ...data, lessonId: lesson.id, order: v.itemOrder },
            });
            result.itemsCreated++;
          }
        }
      }
    });
    return result;
  }
}
