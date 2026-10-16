// apps/api/src/tts/tts.service.ts
import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppConfigService } from '../common/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { encodeMp3, joinSegments, PcmAudio } from './audio-encode';
import { IdleUnloader } from './idle-unloader';
import { TTS_ENGINE } from './tts-engine';
import type { TtsEngine } from './tts-engine';
import { clipId, TtsSegment } from './tts-text';

export type TtsSpec = { segments: TtsSegment[] };

/**
 * Audio TTS content-addressed (spec audio-tts §7). Tampilan hanya MENDAFTARKAN
 * klip (urlsFor) — tidak pernah menyintesis; sintesis terjadi di ensureFile
 * (GET /tts atau CLI backfill), dengan dedupe per id, semaphore
 * TTS_MAX_PARALLEL, dan pelepasan model setelah TTS_IDLE_UNLOAD_MINUTES.
 */
@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly inflight = new Map<string, Promise<string>>();
  private readonly waiting: (() => void)[] = [];
  private running = 0;
  private readonly idle: IdleUnloader;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: AppConfigService,
    @Inject(TTS_ENGINE) private readonly engine: TtsEngine,
  ) {
    this.idle = new IdleUnloader(
      async () =>
        (await this.config.getInt('TTS_IDLE_UNLOAD_MINUTES')) * 60_000,
      () => this.engine.unload(),
    );
  }

  static url(id: string): string {
    return `/tts/${id}.mp3`;
  }

  async urlsFor(specs: (TtsSpec | null)[]): Promise<(string | null)[]> {
    const ids = specs.map((s) =>
      s?.segments.length ? clipId(s.segments) : null,
    );
    const rows = new Map<string, TtsSegment[]>();
    ids.forEach((id, i) => id && rows.set(id, specs[i]!.segments));
    if (!rows.size) return ids.map(() => null);
    await this.prisma.ttsClip.createMany({
      data: [...rows].map(([id, segments]) => ({
        id,
        segments: segments as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
    if ((await this.config.getInt('TTS_ENABLED')) === 1)
      return ids.map((id) => (id ? TtsService.url(id) : null));
    // Saklar mati: hanya klip yang filenya sudah jadi yang tetap dikirim.
    const ready = new Set(
      (
        await this.prisma.ttsClip.findMany({
          where: { id: { in: [...rows.keys()] }, fileName: { not: null } },
          select: { id: true },
        })
      ).map((r) => r.id),
    );
    return ids.map((id) => (id && ready.has(id) ? TtsService.url(id) : null));
  }

  /** null = id tidak terdaftar. Melempar bila sintesis gagal/dinonaktifkan. */
  async ensureFile(id: string): Promise<string | null> {
    const clip = await this.prisma.ttsClip.findUnique({ where: { id } });
    if (!clip) return null;
    if (clip.fileName && (await this.storage.exists(clip.fileName)))
      return clip.fileName;
    if ((await this.config.getInt('TTS_ENABLED')) !== 1)
      throw new ServiceUnavailableException('Audio TTS sedang dinonaktifkan');
    let job = this.inflight.get(id);
    if (!job) {
      job = this.synthesize(
        id,
        clip.segments as unknown as TtsSegment[],
      ).finally(() => this.inflight.delete(id));
      this.inflight.set(id, job);
    }
    return job;
  }

  private async synthesize(
    id: string,
    segments: TtsSegment[],
  ): Promise<string> {
    try {
      return await this.withSlot(() =>
        this.idle.run(async () => {
          const parts: PcmAudio[] = [];
          for (const seg of segments)
            parts.push(await this.engine.synthesize(seg));
          const { buf, durationMs } = encodeMp3(joinSegments(parts));
          const fileName = `tts-${id}.mp3`;
          await this.storage.put(fileName, buf);
          await this.prisma.ttsClip.update({
            where: { id },
            data: { fileName, durationMs, generatedAt: new Date() },
          });
          return fileName;
        }),
      );
    } catch (e) {
      this.logger.warn(`Sintesis klip ${id} gagal: ${(e as Error).message}`);
      throw e;
    }
  }

  private async withSlot<T>(fn: () => Promise<T>): Promise<T> {
    const max = Math.max(1, await this.config.getInt('TTS_MAX_PARALLEL'));
    while (this.running >= max)
      await new Promise<void>((r) => this.waiting.push(r));
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      this.waiting.shift()?.();
    }
  }
}
