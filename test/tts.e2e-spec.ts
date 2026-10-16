import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppConfigService } from '../src/common/config.service';
import { TTS_ENGINE } from '../src/tts/tts-engine';
import { TtsService, TtsSpec } from '../src/tts/tts.service';
import { TtsController } from '../src/tts/tts.controller';
import { StorageService } from '../src/storage/storage.service';
import { FakeTtsEngine } from './fake-tts-engine';

const CACHE = 'public, max-age=31536000, immutable';

describe('TTS: urlsFor + GET /tts/:id.mp3', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let config: AppConfigService;
  let tts: TtsService;
  const fake = new FakeTtsEngine();
  const storageDir = process.env.STORAGE_DIR ?? './storage';
  const stamp = Date.now();
  const ids: string[] = [];
  let n = 0;

  /** spec baru yang belum pernah ada (teks unik per test run) */
  function spec(...texts: string[]): TtsSpec {
    n++;
    return {
      segments: texts.map((t, i) => ({
        voice: i % 2 ? 'am_michael' : 'af_heart',
        text: `${t} ${stamp} ${n}`,
      })),
    };
  }

  async function register(s: TtsSpec): Promise<string> {
    const [url] = await tts.urlsFor([s]);
    const id = url!.match(/^\/tts\/([0-9a-f]{32})\.mp3$/)![1];
    ids.push(id);
    return url!;
  }

  async function setEnabled(v: '0' | '1') {
    await prisma.config.update({
      where: { key: 'TTS_ENABLED' },
      data: { value: v },
    });
    config.clearCache();
  }

  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TTS_ENGINE)
      .useValue(fake)
      .compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    config = app.get(AppConfigService);
    tts = app.get(TtsService);
  });

  afterEach(() => {
    fake.failNext = 0;
    fake.delayMs = 0;
    TtsController.waitMs = 30_000;
  });

  afterAll(async () => {
    await setEnabled('1');
    await prisma.ttsClip.deleteMany({ where: { id: { in: ids } } });
    for (const id of ids)
      await fs.rm(path.join(storageDir, `tts-${id}.mp3`), { force: true });
    await app.close();
  });

  it('nama file tidak valid atau id tak terdaftar → 404', async () => {
    await request(app.getHttpServer()).get('/tts/zz.mp3').expect(404);
    await request(app.getHttpServer())
      .get(`/tts/${'a'.repeat(32)}.mp3`)
      .expect(404);
  });

  it('urlsFor: URL untuk spec, null untuk null; mendaftar sekali', async () => {
    const s = spec('Hello there');
    const [url, none] = await tts.urlsFor([s, null]);
    expect(url).toMatch(/^\/tts\/[0-9a-f]{32}\.mp3$/);
    expect(none).toBeNull();
    const id = url!.slice(5, 37);
    ids.push(id);
    await tts.urlsFor([s]);
    expect(await prisma.ttsClip.count({ where: { id } })).toBe(1);
  });

  it('spec tanpa segmen → null, tanpa baris', async () => {
    const before = await prisma.ttsClip.count();
    expect(await tts.urlsFor([{ segments: [] }])).toEqual([null]);
    expect(await prisma.ttsClip.count()).toBe(before);
  });

  it('GET pertama menyintesis, GET kedua memakai file', async () => {
    const url = await register(spec('How was your flight'));
    const calls = fake.calls.length;
    const res = await request(app.getHttpServer()).get(url).expect(200);
    expect(res.headers['content-type']).toContain('audio/mpeg');
    expect(res.headers['cache-control']).toBe(CACHE);
    const id = url.slice(5, 37);
    await fs.access(path.join(storageDir, `tts-${id}.mp3`));
    expect(fake.calls.length).toBe(calls + 1);
    await request(app.getHttpServer()).get(url).expect(200);
    expect(fake.calls.length).toBe(calls + 1);
  });

  it('dua GET paralel untuk klip baru → satu sintesis', async () => {
    const url = await register(spec('Parallel please'));
    const calls = fake.calls.length;
    fake.delayMs = 50;
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).get(url),
      request(app.getHttpServer()).get(url),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(fake.calls.length).toBe(calls + 1);
  });

  it('Range pada klip yang baru disintesis → 206 (iOS Safari)', async () => {
    const url = await register(spec('Range request'));
    await request(app.getHttpServer())
      .get(url)
      .set('Range', 'bytes=0-99')
      .expect(206);
  });

  it('sintesis gagal → 503 tanpa fileName, request berikutnya mencoba lagi', async () => {
    const url = await register(spec('Fail once'));
    const id = url.slice(5, 37);
    fake.failNext = 1;
    await request(app.getHttpServer()).get(url).expect(503);
    expect(
      (await prisma.ttsClip.findUniqueOrThrow({ where: { id } })).fileName,
    ).toBeNull();
    await request(app.getHttpServer()).get(url).expect(200);
  });

  it('lewat batas tunggu → 503, sintesis tetap selesai lalu dilayani tanpa ulang', async () => {
    const url = await register(spec('Slow one'));
    TtsController.waitMs = 50;
    fake.delayMs = 300;
    const calls = fake.calls.length;
    await request(app.getHttpServer()).get(url).expect(503);
    await new Promise((r) => setTimeout(r, 400));
    fake.delayMs = 0;
    await request(app.getHttpServer()).get(url).expect(200);
    expect(fake.calls.length).toBe(calls + 1);
  });

  it('teks panjang dipecah per ≤300 karakter sebelum ke engine (Kokoro memotong >512 token)', async () => {
    const long = 'The guests will visit the old palace in the morning. '.repeat(
      12,
    );
    const url = await register(spec(long.trim()));
    const calls = fake.calls.length;
    await request(app.getHttpServer()).get(url).expect(200);
    const sent = fake.calls.slice(calls);
    expect(sent.length).toBeGreaterThan(1);
    for (const c of sent) expect(c.text.length).toBeLessThanOrEqual(300);
    expect(sent.map((c) => c.text).join(' ')).toContain('palace');
  });

  it('dialog dua segmen → dua sintesis, satu file', async () => {
    const url = await register(spec('Hello Rina', 'Hi Mr Lee'));
    const calls = fake.calls.length;
    await request(app.getHttpServer()).get(url).expect(200);
    expect(fake.calls.length).toBe(calls + 2);
    expect(fake.calls.slice(-2).map((c) => c.voice)).toEqual([
      'af_heart',
      'am_michael',
    ]);
  });

  it('file tts-<id>.mp3 sudah ada di storage (bucket bersama staging/prod) → dipakai tanpa sintesis', async () => {
    const url = await register(spec('Already in the shared bucket'));
    const id = url.slice(5, 37);
    await app.get(StorageService).put(`tts-${id}.mp3`, Buffer.from('ID3fake'));
    const calls = fake.calls.length;
    await request(app.getHttpServer()).get(url).expect(200);
    expect(fake.calls.length).toBe(calls);
    const row = await prisma.ttsClip.findUniqueOrThrow({ where: { id } });
    expect(row.fileName).toBe(`tts-${id}.mp3`);
  });

  it('TTS_ENABLED=0 + file sudah ada di storage → tetap dilayani', async () => {
    const url = await register(spec('Shared bucket while disabled'));
    const id = url.slice(5, 37);
    await app.get(StorageService).put(`tts-${id}.mp3`, Buffer.from('ID3fake'));
    await setEnabled('0');
    try {
      await request(app.getHttpServer()).get(url).expect(200);
    } finally {
      await setEnabled('1');
    }
  });

  it('TTS_ENABLED=0: klip jadi tetap dilayani, klip belum jadi → null/503', async () => {
    const readySpec = spec('Already made');
    const ready = await register(readySpec);
    await request(app.getHttpServer()).get(ready).expect(200);
    const pendingSpec = spec('Not made yet');
    const pending = await register(pendingSpec);
    await setEnabled('0');
    try {
      expect(await tts.urlsFor([readySpec, pendingSpec])).toEqual([
        ready,
        null,
      ]);
      await request(app.getHttpServer()).get(ready).expect(200);
      await request(app.getHttpServer()).get(pending).expect(503);
    } finally {
      await setEnabled('1');
    }
  });
});
