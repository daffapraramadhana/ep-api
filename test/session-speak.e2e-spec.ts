import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB } from '../src/common/wib';
import { STT_TRANSCRIBER } from '../src/speech/groq-stt.service';

const PASSWORD = 'Password123!';

describe('POST /session/:id/speak (consent, upload, stt, grading)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Fake STT: tidak pernah menyentuh Groq. Nilai dibaca saat submit, jadi
  // tiap test bisa mengatur transcript-nya sendiri.
  let fakeTranscript = 'the quick brown fox';

  const stamp = Date.now();

  async function makeUser(name: string, email: string) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: 'USER',
        level: 'DASAR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);
    return { id: user.id, token: login.body.accessToken as string };
  }

  async function makeLesson(code: string, order: number) {
    return prisma.lesson.create({
      data: {
        code,
        title: code,
        topic: 'Speaking Topic',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'SPEAKING',
        order,
        status: 'LIVE',
      },
    });
  }

  async function makeUcapan(lessonId: string, order: number, sentence: string) {
    return prisma.item.create({
      data: {
        lessonId,
        type: 'UCAPAN',
        prompt: 'Baca kalimat ini dengan lantang.',
        answerKey: sentence,
        acceptedAnswers: [],
        explanation: 'Fokus pelafalan.',
        order,
        status: 'LIVE',
      },
    });
  }

  async function makeSession(
    userId: string,
    rows: { itemId: string; source: 'LESSON' | 'REVIEW' }[],
  ) {
    const session = await prisma.session.create({
      data: { userId, date: todayWIB(), kind: 'DAILY', status: 'IN_PROGRESS' },
    });
    await prisma.sessionItem.createMany({
      data: rows.map((r, i) => ({ sessionId: session.id, ...r, order: i })),
    });
    return session.id;
  }

  function speak(
    path: string,
    token: string,
    itemId: string,
    file = { name: 'record.webm', type: 'audio/webm' },
  ) {
    return request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .field('itemId', itemId)
      .attach('file', Buffer.from('fake-audio-bytes'), {
        filename: file.name,
        contentType: file.type,
      });
  }

  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STT_TRANSCRIBER)
      .useValue({ transcribe: async () => fakeTranscript })
      .compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.attempt.deleteMany({
      where: { user: { email: { startsWith: 'spk-' } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { session: { user: { email: { startsWith: 'spk-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'spk-' } } },
    });
    await prisma.reviewQueue.deleteMany({
      where: { user: { email: { startsWith: 'spk-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'SPK-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'SPK-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'spk-' } } });
    await app.close();
  });

  describe('alur inti + consent', () => {
    let userA: { id: string; token: string };
    let itemUcapanId: string;
    let sessionId: string;

    beforeAll(async () => {
      userA = await makeUser('SPK User A', `spk-usera-${stamp}@ex.com`);
      const lesson = await makeLesson(`SPK-L1-${stamp}`, 1);
      const ucapan = await makeUcapan(lesson.id, 1, 'the quick brown fox');
      itemUcapanId = ucapan.id;
      sessionId = await makeSession(userA.id, [
        { itemId: itemUcapanId, source: 'LESSON' },
      ]);
    });

    it('tanpa consent → 403', async () => {
      await speak(`/session/${sessionId}/speak`, userA.token, itemUcapanId).expect(
        403,
      );
    });

    it('setelah consent → upload benar → attempt tercatat + audioFile + transcript', async () => {
      await request(app.getHttpServer())
        .patch('/me')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ voiceConsent: true })
        .expect(200);

      fakeTranscript = 'the quick brown fox';
      const res = await speak(
        `/session/${sessionId}/speak`,
        userA.token,
        itemUcapanId,
      ).expect(201);

      expect(res.body.correct).toBe(true);
      expect(res.body.transcript).toBe('the quick brown fox');
      expect(res.body.xpAwarded).toBe(10);
      expect(res.body.sessionCompleted).toBe(true); // satu-satunya item

      const attempt = await prisma.attempt.findFirst({
        where: { sessionId, itemId: itemUcapanId, userId: userA.id },
      });
      expect(attempt?.answer).toBe('the quick brown fox');
      expect(attempt?.audioFile).toMatch(/^speech\/[^/]+\/[^/]+\/[a-z0-9-]+\.webm$/);
    });

    it('transcript menyimpang jauh → salah, tanpa 500', async () => {
      const userB = await makeUser('SPK User B', `spk-userb-${stamp}@ex.com`);
      await request(app.getHttpServer())
        .patch('/me')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ voiceConsent: true })
        .expect(200);
      const lesson = await makeLesson(`SPK-L2-${stamp}`, 2);
      const ucapan = await makeUcapan(lesson.id, 1, 'the quick brown fox');
      const sid = await makeSession(userB.id, [
        { itemId: ucapan.id, source: 'LESSON' },
      ]);

      fakeTranscript = 'completely different words here';
      const res = await speak(`/session/${sid}/speak`, userB.token, ucapan.id).expect(
        201,
      );
      expect(res.body.correct).toBe(false);
      expect(res.body.correctAnswer).toBe('the quick brown fox');
    });

    it('transcript kosong → salah, bukan error', async () => {
      const userC = await makeUser('SPK User C', `spk-userc-${stamp}@ex.com`);
      await request(app.getHttpServer())
        .patch('/me')
        .set('Authorization', `Bearer ${userC.token}`)
        .send({ voiceConsent: true })
        .expect(200);
      const lesson = await makeLesson(`SPK-L3-${stamp}`, 3);
      const ucapan = await makeUcapan(lesson.id, 1, 'the quick brown fox');
      const sid = await makeSession(userC.id, [
        { itemId: ucapan.id, source: 'LESSON' },
      ]);

      fakeTranscript = '';
      const res = await speak(`/session/${sid}/speak`, userC.token, ucapan.id).expect(
        201,
      );
      expect(res.body.correct).toBe(false);
      expect(res.body.transcript).toBe('');
    });

    it('file tanpa ekstensi sah / bukan audio → 400', async () => {
      await speak(
        `/session/${sessionId}/speak`,
        userA.token,
        itemUcapanId,
        { name: 'record.txt', type: 'text/plain' },
      ).expect(400);
    });

    it('soal sudah dijawab benar → 400', async () => {
      await speak(`/session/${sessionId}/speak`, userA.token, itemUcapanId).expect(
        400,
      );
    });

    it('item bukan tipe UCAPAN → 400', async () => {
      const lesson = await makeLesson(`SPK-L4-${stamp}`, 4);
      const mc = await prisma.item.create({
        data: {
          lessonId: lesson.id,
          type: 'PILIHAN_GANDA',
          prompt: 'Apa arti cat?',
          options: ['Kucing', 'Anjing'],
          answerKey: 'A',
          explanation: 'x',
          order: 1,
          status: 'LIVE',
        },
      });
      const sid = await makeSession(userA.id, [
        { itemId: mc.id, source: 'LESSON' },
      ]);
      await speak(`/session/${sid}/speak`, userA.token, mc.id).expect(400);
    });
  });
});
