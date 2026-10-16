// apps/api/test/tts-content.e2e-spec.ts — URL audio TTS di tampilan. Prefix TTC- / ttc-.
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { parseChapter } from '../src/modules/chapter-parser';
import { TTS_ENGINE } from '../src/tts/tts-engine';
import { FakeTtsEngine } from './fake-tts-engine';

const PASSWORD = 'Password123!';
const TTS_URL = /^\/tts\/[0-9a-f]{32}\.mp3$/;

describe('TTS di tampilan sesi, bab, dan admin', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let sessionId: string;
  let lessonId: string;
  const fake = new FakeTtsEngine();
  const stamp = Date.now();
  const slug = `ttc-${stamp}`;
  const ids: Record<string, string> = {};

  const chapterBody = `:::phrases
- Good morning, ladies and gentlemen ${stamp}. | Selamat pagi.
- Hey! / Hi there! | Hai!
:::

:::dialog
Kamu (Tour Leader): Welcome to Bali ${stamp}!
Mr. Lee (Tamu): Thank you!
:::`;

  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TTS_ENGINE)
      .useValue(fake)
      .compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const user = await prisma.user.create({
      data: {
        name: 'TTC User',
        email: `ttc-${stamp}@test.local`,
        role: 'USER',
        level: 'DASAR',
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        inviteStatus: 'ACCEPTED',
      },
    });
    userToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: PASSWORD })
        .expect(201)
    ).body.accessToken;
    adminToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
        })
        .expect(201)
    ).body.accessToken;

    const lesson = await prisma.lesson.create({
      data: {
        code: `TTC-${stamp}`,
        title: 'TTC',
        topic: 'TTC',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'LISTENING',
        order: 9100,
        status: 'LIVE',
      },
    });
    lessonId = lesson.id;
    const item = (order: number, data: Record<string, unknown>) =>
      prisma.item.create({
        data: {
          lessonId,
          order,
          prompt: 'p',
          explanation: 'e',
          status: 'LIVE',
          type: 'PILIHAN_GANDA',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          ...data,
        },
      });
    ids.ucapan = (
      await item(1, {
        type: 'UCAPAN',
        options: undefined,
        answerKey: `Good morning everyone ${stamp}`,
      })
    ).id;
    ids.listening = (
      await item(2, { ttsText: `A: Hello ${stamp}\nB: Hi there` })
    ).id;
    ids.uploaded = (
      await item(3, { ttsText: 'ignored', mediaFile: 'rekaman-admin.mp3' })
    ).id;
    ids.plain = (await item(4, {})).id;

    const session = await prisma.session.create({
      data: { userId: user.id, date: new Date(), kind: 'REPLAY' },
    });
    sessionId = session.id;
    await prisma.sessionItem.createMany({
      data: Object.values(ids).map((itemId, i) => ({
        sessionId,
        itemId,
        source: 'LESSON' as const,
        order: i + 1,
      })),
    });

    const parsed = parseChapter(chapterBody);
    if (!parsed.ok) throw new Error('fixture invalid');
    const mod = await prisma.module.create({
      data: {
        slug,
        title: 'TTC',
        summary: 's',
        level: 'DASAR',
        cefr: 'A1',
        order: 9100,
        status: 'LIVE',
      },
    });
    await prisma.moduleChapter.create({
      data: {
        moduleId: mod.id,
        order: 1,
        title: 'Bab TTC',
        estMinutes: 5,
        body: chapterBody,
        blocks: parsed.blocks as never,
      },
    });
  });

  afterAll(async () => {
    const users = { user: { email: { startsWith: 'ttc-' } } };
    await prisma.sessionItem.deleteMany({ where: { session: users } });
    await prisma.session.deleteMany({ where: users });
    await prisma.moduleChapter.deleteMany({ where: { module: { slug } } });
    await prisma.module.deleteMany({ where: { slug } });
    await prisma.item.deleteMany({ where: { lessonId } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'ttc-' } } });
    await prisma.ttsClip.deleteMany({
      where: { segments: { string_contains: String(stamp) } },
    });
    await app.close();
  });

  it('sesi: UCAPAN → targetAudioUrl; ttsText → mediaUrl TTS; mediaFile tetap; tanpa sintesis', async () => {
    const calls = fake.calls.length;
    const res = await request(app.getHttpServer())
      .get(`/session/${sessionId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    type V = {
      itemId: string;
      targetAudioUrl: string | null;
      mediaUrl: string | null;
    };
    const byId = Object.fromEntries(
      (res.body.items as V[]).map((i) => [i.itemId, i]),
    );
    expect(byId[ids.ucapan].targetAudioUrl).toMatch(TTS_URL);
    expect(byId[ids.ucapan].mediaUrl).toBeNull();
    expect(byId[ids.listening].mediaUrl).toMatch(TTS_URL);
    expect(byId[ids.listening].targetAudioUrl).toBeNull();
    expect(byId[ids.uploaded].mediaUrl).toBe('/media/rekaman-admin.mp3');
    expect(byId[ids.plain].mediaUrl).toBeNull();
    expect(byId[ids.plain].targetAudioUrl).toBeNull();
    expect(fake.calls.length).toBe(calls);
  });

  it('bab user: setiap frasa dan baris dialog punya audioUrl', async () => {
    const res = await request(app.getHttpServer())
      .get(`/modules/${slug}/chapters/1`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const blocks = res.body.blocks as {
      type: string;
      items?: { audioUrl: string }[];
      lines?: { audioUrl: string }[];
    }[];
    const phrases = blocks.find((b) => b.type === 'phrases')!;
    const dialog = blocks.find((b) => b.type === 'dialog')!;
    expect(phrases.items!.map((i) => i.audioUrl)).toEqual([
      expect.stringMatching(TTS_URL),
      expect.stringMatching(TTS_URL),
    ]);
    expect(dialog.lines!.map((l) => l.audioUrl)).toEqual([
      expect.stringMatching(TTS_URL),
      expect.stringMatching(TTS_URL),
    ]);
  });

  it('pratinjau admin tidak mendaftarkan klip', async () => {
    const before = await prisma.ttsClip.count();
    await request(app.getHttpServer())
      .post('/admin/modules/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        body: `:::phrases\n- Brand new preview phrase ${stamp} | Baru\n:::`,
      })
      .expect(201);
    expect(await prisma.ttsClip.count()).toBe(before);
  });

  it('daftar soal admin: ttsText dan audioUrl', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/lessons/${lessonId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    type A = { id: string; ttsText: string | null; audioUrl: string | null };
    const byId = Object.fromEntries((res.body as A[]).map((i) => [i.id, i]));
    expect(byId[ids.listening].ttsText).toContain('Hello');
    expect(byId[ids.listening].audioUrl).toMatch(TTS_URL);
    expect(byId[ids.ucapan].audioUrl).toMatch(TTS_URL);
    expect(byId[ids.uploaded].audioUrl).toBe('/media/rekaman-admin.mp3');
    expect(byId[ids.plain].audioUrl).toBeNull();
  });
});
