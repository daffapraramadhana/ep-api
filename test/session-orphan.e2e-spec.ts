import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB } from '../src/common/wib';

/**
 * Regresi sesi yatim: session IN_PROGRESS yang kehilangan seluruh
 * session_item-nya (mis. item dihapus dari luar alur normal) TIDAK boleh
 * terus dikembalikan oleh POST /session/today — tanpa item ia tak pernah
 * bisa selesai dan user terjebak di layar "Sesi selesai!" kosong selamanya.
 * Perilaku benar: sesi yatim dibuang, sesi baru dirakit dari lesson LIVE.
 */

const PASSWORD = 'Password123!';
const STAMP = Date.now();
const EMAIL = `p2orph-${STAMP}@test.local`;
const LESSON_CODE = `P2ORPH-${STAMP}`;

describe('session orphan recovery (POST /session/today)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token = '';
  let userId = '';
  let orphanId = '';

  beforeAll(async () => {
    const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const user = await prisma.user.create({
      data: {
        name: 'Orphan Tester',
        email: EMAIL,
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        inviteStatus: 'ACCEPTED',
        level: 'MAHIR',
        onboardedAt: new Date(),
      },
    });
    userId = user.id;

    const lesson = await prisma.lesson.create({
      data: {
        code: LESSON_CODE,
        title: 'Orphan Recovery Lesson',
        topic: 'P2ORPH Topic',
        level: 'MAHIR',
        cefr: 'C1',
        skill: 'VOCABULARY',
        order: 100000 + (STAMP % 1000),
        status: 'LIVE',
      },
    });
    await prisma.item.create({
      data: {
        lessonId: lesson.id,
        type: 'PILIHAN_GANDA',
        prompt: 'Orphan recovery question?',
        options: ['A1', 'B1', 'C1', 'D1'],
        answerKey: 'A',
        acceptedAnswers: [],
        explanation: 'Jawaban A.',
        order: 1,
        status: 'LIVE',
      },
    });

    // sesi yatim: IN_PROGRESS hari ini TANPA session_item sama sekali
    const orphan = await prisma.session.create({
      data: { userId, date: todayWIB() },
    });
    orphanId = orphan.id;

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(201);
    token = login.body.accessToken as string;
  });

  afterAll(async () => {
    await prisma.attempt.deleteMany({ where: { userId } });
    await prisma.sessionItem.deleteMany({ where: { session: { userId } } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.reviewQueue.deleteMany({ where: { userId } });
    await prisma.streakFreeze.deleteMany({ where: { userId } });
    await prisma.item.deleteMany({ where: { lesson: { code: LESSON_CODE } } });
    await prisma.lesson.deleteMany({ where: { code: LESSON_CODE } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('membuang sesi yatim dan merakit sesi baru berisi item lesson', async () => {
    const res = await request(app.getHttpServer())
      .post('/session/today')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(res.body.id).not.toBe(orphanId);
    expect(res.body.status).toBe('IN_PROGRESS');
    expect(res.body.items.length).toBeGreaterThan(0);

    // sesi yatim benar-benar hilang dari DB
    const gone = await prisma.session.findUnique({ where: { id: orphanId } });
    expect(gone).toBeNull();

    // panggilan kedua mengembalikan sesi yang sama (beku), bukan membuat lagi
    const again = await request(app.getHttpServer())
      .post('/session/today')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(again.body.id).toBe(res.body.id);

    // /me/summary tahu ada sesi berjalan -> Beranda bisa menampilkan LANJUTKAN
    const summary = await request(app.getHttpServer())
      .get('/me/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(summary.body.openSession).toMatchObject({
      lessonTitle: 'Orphan Recovery Lesson',
      answered: 0,
      total: res.body.items.length,
    });
  });
});
