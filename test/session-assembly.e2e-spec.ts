import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB, addDays } from '../src/common/wib';

const PASSWORD = 'Password123!';

describe('session assembly (today/replay/get)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userAToken: string;
  let userBToken: string;
  let userCToken: string;

  let lesson1Id: string;
  const lesson3Ids: string[] = [];

  function post(path: string, body: Record<string, unknown>, token: string) {
    return request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }
  function get(path: string, token: string) {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);
  }

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const stamp = Date.now();

    // Lesson 1: DASAR, order 1, 3 items (one SUSUN_KALIMAT)
    const lesson1 = await prisma.lesson.create({
      data: {
        code: `P2A-L1-${stamp}`,
        title: 'P2A Lesson 1',
        topic: 'P2A Topic',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'VOCABULARY',
        order: 1,
        status: 'LIVE',
      },
    });
    lesson1Id = lesson1.id;
    await prisma.item.create({
      data: {
        lessonId: lesson1.id,
        type: 'PILIHAN_GANDA',
        prompt: 'Apa arti "cat"?',
        options: ['Kucing', 'Anjing', 'Ikan', 'Burung'],
        answerKey: 'Kucing',
        explanation: 'cat = kucing',
        order: 1,
        status: 'LIVE',
      },
    });
    await prisma.item.create({
      data: {
        lessonId: lesson1.id,
        type: 'ISIAN',
        prompt: 'I ___ a student.',
        answerKey: 'am',
        explanation: 'Gunakan am.',
        order: 2,
        status: 'LIVE',
      },
    });
    await prisma.item.create({
      data: {
        lessonId: lesson1.id,
        type: 'SUSUN_KALIMAT',
        prompt: 'Susun kalimat.',
        answerKey: 'I go to school today',
        explanation: 'SPOK.',
        order: 3,
        status: 'LIVE',
      },
    });

    // Lesson 2: DASAR, order 2, 2 items (fixture per brief, not directly asserted)
    const lesson2 = await prisma.lesson.create({
      data: {
        code: `P2A-L2-${stamp}`,
        title: 'P2A Lesson 2',
        topic: 'P2A Topic',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'VOCABULARY',
        order: 2,
        status: 'LIVE',
      },
    });
    await prisma.item.create({
      data: {
        lessonId: lesson2.id,
        type: 'PILIHAN_GANDA',
        prompt: 'Apa arti "dog"?',
        options: ['Kucing', 'Anjing', 'Ikan', 'Burung'],
        answerKey: 'Anjing',
        explanation: 'dog = anjing',
        order: 1,
        status: 'LIVE',
      },
    });
    await prisma.item.create({
      data: {
        lessonId: lesson2.id,
        type: 'ISIAN',
        prompt: 'She ___ happy.',
        answerKey: 'is',
        explanation: 'Gunakan is.',
        order: 2,
        status: 'LIVE',
      },
    });

    // Lesson 3: standalone pool of 5 LIVE items used only as review-queue fodder
    // (kept disjoint from lesson1/lesson2 items so review + lesson slots never collide).
    const lesson3 = await prisma.lesson.create({
      data: {
        code: `P2A-L3-${stamp}`,
        title: 'P2A Lesson Review Pool',
        topic: 'P2A Topic',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'VOCABULARY',
        order: 3,
        status: 'LIVE',
      },
    });
    for (let i = 1; i <= 5; i++) {
      const it = await prisma.item.create({
        data: {
          lessonId: lesson3.id,
          type: 'PILIHAN_GANDA',
          prompt: `Review item ${i}`,
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'x',
          order: i,
          status: 'LIVE',
        },
      });
      lesson3Ids.push(it.id);
    }

    const userA = await prisma.user.create({
      data: {
        name: 'P2A User A',
        email: `p2a-usera-${stamp}@ex.com`,
        role: 'USER',
        level: 'DASAR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const userB = await prisma.user.create({
      data: {
        name: 'P2A User B',
        email: `p2a-userb-${stamp}@ex.com`,
        role: 'USER',
        level: 'DASAR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const userC = await prisma.user.create({
      data: {
        name: 'P2A User C',
        email: `p2a-userc-${stamp}@ex.com`,
        role: 'USER',
        level: 'DASAR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });

    const yesterday = addDays(todayWIB(), -1);
    for (const itemId of lesson3Ids) {
      await prisma.reviewQueue.create({
        data: { userId: userB.id, itemId, dueDate: yesterday },
      });
    }

    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userA.email, password: PASSWORD })
      .expect(201);
    userAToken = loginA.body.accessToken;
    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userB.email, password: PASSWORD })
      .expect(201);
    userBToken = loginB.body.accessToken;
    const loginC = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userC.email, password: PASSWORD })
      .expect(201);
    userCToken = loginC.body.accessToken;
  });

  afterAll(async () => {
    await prisma.attempt.deleteMany({
      where: { item: { lesson: { code: { startsWith: 'P2A-' } } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { item: { lesson: { code: { startsWith: 'P2A-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p2a-' } } },
    });
    await prisma.reviewQueue.deleteMany({
      where: { user: { email: { startsWith: 'p2a-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'P2A-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'P2A-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'p2a-' } } });
    await app.close();
  });

  let sessionAId: string;

  it('merakit sesi baru: item lesson urut + tanpa kunci jawaban', async () => {
    const res = await post('/session/today', {}, userAToken).expect(201);
    sessionAId = res.body.id;
    expect(res.body.kind).toBe('DAILY');
    expect(res.body.items.length).toBe(3);
    expect(res.body.items[0]).not.toHaveProperty('answerKey');
    expect(res.body.items[0]).not.toHaveProperty('acceptedAnswers');
    expect(res.body.items[0]).not.toHaveProperty('explanation');
    expect(
      res.body.items.find((i: any) => i.type === 'SUSUN_KALIMAT').chips.length,
    ).toBeGreaterThan(2);
  });

  it('panggil kedua kali = sesi yang sama (beku)', async () => {
    const a = await post('/session/today', {}, userAToken).expect(201);
    const b = await post('/session/today', {}, userAToken).expect(201);
    expect(b.body.id).toBe(a.body.id);
    expect(a.body.id).toBe(sessionAId);
  });

  it('review due diselipkan, maks sesuai config', async () => {
    const res = await post('/session/today', {}, userBToken).expect(201);
    expect(res.body.items.length).toBe(6); // 3 lesson + 3 review (cap dari 5)
    const reviewCount = res.body.items.filter(
      (i: any) => i.source === 'REVIEW',
    ).length;
    expect(reviewCount).toBe(3);
  });

  it('GET sesi milik user lain → 404', async () => {
    await get(`/session/${sessionAId}`, userCToken).expect(404);
  });

  it('GET sesi milik sendiri → 200', async () => {
    const res = await get(`/session/${sessionAId}`, userAToken).expect(200);
    expect(res.body.id).toBe(sessionAId);
    expect(res.body.progress.total).toBe(3);
  });

  it('replay lesson yang belum selesai → 400', async () => {
    await post('/session/replay', { lessonId: lesson1Id }, userAToken).expect(
      400,
    );
  });
});
