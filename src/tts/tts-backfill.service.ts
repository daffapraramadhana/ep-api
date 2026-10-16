// apps/api/src/tts/tts-backfill.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { StoredBlock } from '../modules/chapter-parser';
import { chapterSpecs, itemSpecs } from './content-specs';
import { TtsService, TtsSpec } from './tts.service';

export type SeedTtsEntry = { code: string; order: number; tts: string };

/** Batasi backfill ke sebagian konten (mis. satu lesson hasil impor). */
export type BackfillFilter = { codePrefix?: string; slugPrefix?: string };

/**
 * Pekerjaan TTS massal yang dijalankan manual lewat CLI (spec audio-tts §10–§11):
 * backfill = daftarkan + sintesis semua klip konten yang belum punya file;
 * adoptSeedAudio = pindahkan audio `say`/senyap buatan seeder ke ttsText.
 */
@Injectable()
export class TtsBackfillService {
  private readonly logger = new Logger(TtsBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tts: TtsService,
  ) {}

  async backfill(
    filter: BackfillFilter = {},
  ): Promise<{ registered: number; generated: number; failed: number }> {
    const items = await this.prisma.item.findMany({
      where: {
        status: { in: ['LIVE', 'DRAFT'] },
        OR: [{ type: 'UCAPAN' }, { ttsText: { not: null } }],
        ...(filter.codePrefix
          ? { lesson: { code: { startsWith: filter.codePrefix } } }
          : {}),
      },
    });
    const chapters = await this.prisma.moduleChapter.findMany({
      where: {
        module: {
          status: { not: 'RETIRED' },
          ...(filter.slugPrefix
            ? { slug: { startsWith: filter.slugPrefix } }
            : {}),
        },
      },
      select: { blocks: true },
    });
    const specs: (TtsSpec | null)[] = [
      ...items.flatMap((it) => {
        const s = itemSpecs(it);
        return [s.target, s.media];
      }),
      ...chapters.flatMap((c) =>
        chapterSpecs(c.blocks as unknown as StoredBlock[]),
      ),
    ];
    const urls = await this.tts.urlsFor(specs);
    const ids = [...new Set(urls.filter((u): u is string => !!u).map(idOf))];
    const pending = await this.prisma.ttsClip.findMany({
      where: { id: { in: ids }, fileName: null },
      select: { id: true },
    });
    let generated = 0;
    let failed = 0;
    for (const { id } of pending) {
      try {
        await this.tts.ensureFile(id);
        generated++;
      } catch (e) {
        failed++;
        this.logger.warn(`Backfill klip ${id} gagal: ${(e as Error).message}`);
      }
    }
    return { registered: ids.length, generated, failed };
  }

  async adoptSeedAudio(
    entries: SeedTtsEntry[],
  ): Promise<{ adopted: number; kept: number; skipped: number }> {
    let adopted = 0;
    let kept = 0;
    let skipped = 0;
    for (const e of entries) {
      const nn = String(e.order).padStart(2, '0');
      const seeded = [
        `${e.code.toLowerCase()}-${nn}.m4a`,
        `${e.code.toLowerCase()}-${nn}.wav`,
      ];
      const item = await this.prisma.item.findFirst({
        where: { lesson: { code: e.code }, order: e.order },
      });
      if (
        !item ||
        item.ttsText !== null ||
        !item.mediaFile ||
        !seeded.includes(item.mediaFile)
      ) {
        skipped++;
        continue;
      }
      const { media } = itemSpecs({ ...item, ttsText: e.tts, mediaFile: null });
      const [url] = await this.tts.urlsFor([media]);
      if (!url) {
        kept++;
        continue;
      }
      try {
        await this.prisma.item.update({
          where: { id: item.id },
          data: { ttsText: e.tts },
        });
        await this.tts.ensureFile(idOf(url));
        await this.prisma.item.update({
          where: { id: item.id },
          data: { mediaFile: null },
        });
        adopted++;
      } catch (err) {
        await this.prisma.item.update({
          where: { id: item.id },
          data: { ttsText: null },
        });
        kept++;
        this.logger.warn(
          `Adopsi ${e.code}#${e.order} gagal: ${(err as Error).message}`,
        );
      }
    }
    return { adopted, kept, skipped };
  }
}

function idOf(url: string): string {
  return url.slice('/tts/'.length, '/tts/'.length + 32);
}
