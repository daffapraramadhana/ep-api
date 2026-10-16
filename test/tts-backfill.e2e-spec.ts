// apps/api/test/tts-backfill.e2e-spec.ts — adopsi audio seeder & backfill. Prefix ZZT- / zzt-.
import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { parseChapter } from '../src/modules/chapter-parser';
import { TTS_ENGINE } from '../src/tts/tts-engine';
import { TtsBackfillService } from '../src/tts/tts-backfill.service';
import { StorageService } from '../src/storage/storage.service';
import { clipId } from '../src/tts/tts-text';
import { FakeTtsEngine } from './fake-tts-engine';

describe('TTS backfill & adopsi audio seeder', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let svc: TtsBackfillService;
  const fake = new FakeTtsEngine();
  const stamp = Date.now();
  const storageDir = process.env.STORAGE_DIR ?? './storage';
  const code = (n: number) => `ZZT-${stamp}-${n}`;

  async function lessonWith(
    n: number,
    items: {
      mediaFile?: string;
      ttsText?: string;
      status?: 'LIVE' | 'RETIRED';
    }[],
  ) {
    const lesson = await prisma.lesson.create({
      data: {
        code: code(n),
        title: 'ZZT',
        topic: 'ZZT',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'LISTENING',
        order: 9200 + n,
        status: 'LIVE',
      },
    });
    const ids: string[] = [];
    for (const [i, it] of items.entries()) {
      const row = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          order: i + 1,
          type: 'PILIHAN_GANDA',
          prompt: 'p',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'e',
          status: it.status ?? 'LIVE',
          mediaFile: it.mediaFile ?? null,
          ttsText: it.ttsText ?? null,
        },
      });
      ids.push(row.id);
    }
    return ids;
  }

  const item = (id: string) => prisma.item.findUniqueOrThrow({ where: { id } });

  /** klip yang segmennya memuat teks t (Prisma tak bisa mencari di dalam array JSON) */
  const clipsWith = (t: string) =>
    prisma.$queryRaw<{ id: string; fileName: string | null }[]>`
      SELECT id, "fileName" FROM "TtsClip" WHERE segments::text LIKE ${'%' + t + '%'}`;

  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TTS_ENGINE)
      .useValue(fake)
      .compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    svc = app.get(TtsBackfillService);
  });

  afterAll(async () => {
    const clips = await clipsWith(String(stamp));
    for (const c of clips)
      if (c.fileName)
        await fs.rm(path.join(storageDir, c.fileName), { force: true });
    await prisma.ttsClip.deleteMany({
      where: { id: { in: clips.map((c) => c.id) } },
    });
    await prisma.moduleChapter.deleteMany({
      where: { module: { slug: `zzt-${stamp}` } },
    });
    await prisma.module.deleteMany({ where: { slug: `zzt-${stamp}` } });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: `ZZT-${stamp}` } } },
    });
    await prisma.lesson.deleteMany({
      where: { code: { startsWith: `ZZT-${stamp}` } },
    });
    await app.close();
  });

  it('adopsi .m4a: ttsText terisi, klip dibuat, mediaFile dikosongkan; ulang → skipped', async () => {
    const [id] = await lessonWith(1, [
      { mediaFile: `${code(1).toLowerCase()}-01.m4a` },
    ]);
    const entries = [
      { code: code(1), order: 1, tts: `Welcome to Bali ${stamp}` },
    ];
    expect(await svc.adoptSeedAudio(entries)).toEqual({
      adopted: 1,
      kept: 0,
      skipped: 0,
    });
    const it = await item(id);
    expect(it.ttsText).toBe(`Welcome to Bali ${stamp}`);
    expect(it.mediaFile).toBeNull();
    const clips = await clipsWith(`Welcome to Bali ${stamp}`);
    expect(clips).toHaveLength(1);
    await fs.access(path.join(storageDir, clips[0].fileName!));
    expect(await svc.adoptSeedAudio(entries)).toEqual({
      adopted: 0,
      kept: 0,
      skipped: 1,
    });
  });

  it('adopsi .wav senyap juga', async () => {
    const [id] = await lessonWith(2, [
      { mediaFile: `${code(2).toLowerCase()}-01.wav` },
    ]);
    const r = await svc.adoptSeedAudio([
      { code: code(2), order: 1, tts: `Silent one ${stamp}` },
    ]);
    expect(r.adopted).toBe(1);
    expect((await item(id)).mediaFile).toBeNull();
  });

  it('sintesis gagal → file lama dipertahankan (tidak pernah bisu)', async () => {
    const media = `${code(3).toLowerCase()}-01.m4a`;
    const [id] = await lessonWith(3, [{ mediaFile: media }]);
    fake.failNext = 1;
    const r = await svc.adoptSeedAudio([
      { code: code(3), order: 1, tts: `Will fail ${stamp}` },
    ]);
    expect(r).toEqual({ adopted: 0, kept: 1, skipped: 0 });
    const it = await item(id);
    expect(it.mediaFile).toBe(media);
    expect(it.ttsText).toBeNull();
  });

  it('mediaFile unggahan admin (nama lain) tidak disentuh', async () => {
    const [id] = await lessonWith(4, [{ mediaFile: 'rekaman-admin.mp3' }]);
    const r = await svc.adoptSeedAudio([
      { code: code(4), order: 1, tts: `Nope ${stamp}` },
    ]);
    expect(r).toEqual({ adopted: 0, kept: 0, skipped: 1 });
    expect((await item(id)).mediaFile).toBe('rekaman-admin.mp3');
  });

  it('backfill: item LIVE + bab LIVE dibuat; item RETIRED dilewati; ulang → 0', async () => {
    await lessonWith(5, [
      { ttsText: `Live item ${stamp}` },
      { ttsText: `Retired item ${stamp}`, status: 'RETIRED' },
    ]);
    const body = `:::phrases\n- First phrase ${stamp} | Satu\n- Second phrase ${stamp} | Dua\n:::`;
    const parsed = parseChapter(body);
    if (!parsed.ok) throw new Error('fixture invalid');
    const mod = await prisma.module.create({
      data: {
        slug: `zzt-${stamp}`,
        title: 'ZZT',
        summary: 's',
        level: 'DASAR',
        cefr: 'A1',
        order: 9200,
        status: 'LIVE',
      },
    });
    await prisma.moduleChapter.create({
      data: {
        moduleId: mod.id,
        order: 1,
        title: 'B',
        estMinutes: 3,
        body,
        blocks: parsed.blocks as never,
      },
    });

    const scope = { codePrefix: `ZZT-${stamp}`, slugPrefix: `zzt-${stamp}` };
    const r = await svc.backfill(scope);
    expect(r.failed).toBe(0);
    expect(r.generated).toBeGreaterThanOrEqual(3);
    expect(await clipsWith(`Retired item ${stamp}`)).toHaveLength(0);
    for (const t of [
      `Live item ${stamp}`,
      `First phrase ${stamp}`,
      `Second phrase ${stamp}`,
    ]) {
      const [c] = await clipsWith(t);
      expect(c?.fileName).toBeTruthy();
    }
    expect((await svc.backfill(scope)).generated).toBe(0);
  });

  it('backfill memakai ulang file yang sudah ada di storage (bucket bersama)', async () => {
    const text = `Reused from bucket ${stamp}`;
    await lessonWith(6, [{ ttsText: text }]);
    const id = clipId([{ voice: 'af_heart', text }]);
    await app.get(StorageService).put(`tts-${id}.mp3`, Buffer.from('ID3fake'));
    const calls = fake.calls.length;
    const r = await svc.backfill({ codePrefix: code(6) });
    expect(r).toMatchObject({ generated: 0, reused: 1, failed: 0 });
    expect(fake.calls.length).toBe(calls);
  });
});
