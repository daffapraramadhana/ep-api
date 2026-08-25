import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB, addDays } from '../src/common/wib';

const PASSWORD = 'Password123!';
const SUSUN_ANSWER_KEY = 'I go to school today';

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
    const susunItem = res.body.items.find(
      (i: any) => i.type === 'SUSUN_KALIMAT',
    );
    expect(susunItem.chips.length).toBeGreaterThan(2);
    // BE mengacak urutan chip — chip yang dikembalikan tidak boleh sama
    // dengan urutan kata asli di answerKey (yang tidak pernah dikirim ke FE).
    expect(susunItem.chips.join(' ')).not.toBe(SUSUN_ANSWER_KEY);
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

  it('chip SUSUN_KALIMAT stabil di dua GET berturut-turut', async () => {
    const first = await get(`/session/${sessionAId}`, userAToken).expect(200);
    const second = await get(`/session/${sessionAId}`, userAToken).expect(200);
    const chipsFirst = first.body.items.find(
      (i: any) => i.type === 'SUSUN_KALIMAT',
    ).chips;
    const chipsSecond = second.body.items.find(
      (i: any) => i.type === 'SUSUN_KALIMAT',
    ).chips;
    expect(chipsSecond).toEqual(chipsFirst);
  });

  it('replay lesson yang belum selesai → 400', async () => {
    await post('/session/replay', { lessonId: lesson1Id }, userAToken).expect(
      400,
    );
  });
});

// Cabang tambahan yang belum ada green-path test di describe di atas: replay
// SUKSES, sesi penguatan (lesson habis), dan 409 (level tanpa konten). Pakai
// app + fixture terpisah (prefix P2A2- / p2a2-) supaya tidak menyentuh state
// yang dipakai describe di atas (mis. sessionAId yang masih dipakai setelah
// afterAll describe pertama selesai).
describe('session assembly - cabang tambahan (replay sukses, penguatan, 409)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  function post(path: string, body: Record<string, unknown>, token: string) {
    return request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  let userDToken: string; // replay sukses
  let userEToken: string; // sesi penguatan
  let userFToken: string; // 409

  let lessonDId: string;
  const lessonDItemIds: string[] = [];
  let itemE1Id: string;
  let itemE2Id: string;

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const stamp = Date.now();
    const past = addDays(todayWIB(), -30);

    // --- Fixture D: satu lesson DASAR yang akan diselesaikan penuh oleh
    // userD, lalu di-replay. Level DASAR aman dipakai di sini karena
    // describe pertama sudah membersihkan seluruh konten P2A- miliknya di
    // afterAll sebelum describe ini mulai (sibling describe di file yang
    // sama dieksekusi berurutan oleh Jest).
    const lessonD = await prisma.lesson.create({
      data: {
        code: `P2A2-LD-${stamp}`,
        title: 'P2A2 Lesson Replay',
        topic: 'P2A2 Topic',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'VOCABULARY',
        order: 1,
        status: 'LIVE',
      },
    });
    lessonDId = lessonD.id;
    for (let i = 1; i <= 3; i++) {
      const it = await prisma.item.create({
        data: {
          lessonId: lessonD.id,
          type: 'PILIHAN_GANDA',
          prompt: `Replay item ${i}`,
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'x',
          order: i,
          status: 'LIVE',
        },
      });
      lessonDItemIds.push(it.id);
    }

    // --- Fixture E: satu lesson MENENGAH yang sudah selesai penuh + riwayat
    // attempt salah, dipakai untuk memicu sesi penguatan (lesson habis).
    const lessonE = await prisma.lesson.create({
      data: {
        code: `P2A2-LE-${stamp}`,
        title: 'P2A2 Lesson Penguatan',
        topic: 'P2A2 Topic',
        level: 'MENENGAH',
        cefr: 'B1',
        skill: 'VOCABULARY',
        order: 1,
        status: 'LIVE',
      },
    });
    const itemE1 = await prisma.item.create({
      data: {
        lessonId: lessonE.id,
        type: 'PILIHAN_GANDA',
        prompt: 'Penguatan item 1 (tak pernah salah)',
        options: ['A', 'B', 'C', 'D'],
        answerKey: 'A',
        explanation: 'x',
        order: 1,
        status: 'LIVE',
      },
    });
    itemE1Id = itemE1.id;
    const itemE2 = await prisma.item.create({
      data: {
        lessonId: lessonE.id,
        type: 'PILIHAN_GANDA',
        prompt: 'Penguatan item 2 (sering salah)',
        options: ['A', 'B', 'C', 'D'],
        answerKey: 'A',
        explanation: 'x',
        order: 2,
        status: 'LIVE',
      },
    });
    itemE2Id = itemE2.id;

    // --- Users
    const userD = await prisma.user.create({
      data: {
        name: 'P2A2 User D',
        email: `p2a2-userd-${stamp}@ex.com`,
        role: 'USER',
        level: 'DASAR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const userE = await prisma.user.create({
      data: {
        name: 'P2A2 User E',
        email: `p2a2-usere-${stamp}@ex.com`,
        role: 'USER',
        level: 'MENENGAH',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const userF = await prisma.user.create({
      data: {
        name: 'P2A2 User F',
        email: `p2a2-userf-${stamp}@ex.com`,
        role: 'USER',
        // MAHIR: describe ini sengaja tidak membuat lesson MAHIR apa pun,
        // dan userF tidak pernah attempt apa pun → 409.
        level: 'MAHIR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });

    // --- Riwayat attempt untuk userD (lessonD selesai penuh: semua item
    // LIVE punya >=1 attempt benar) dan userE (lessonE selesai penuh +
    // itemE2 lebih sering salah daripada itemE1).
    const seedSessionD = await prisma.session.create({
      data: { userId: userD.id, date: past, status: 'COMPLETED' },
    });
    for (const itemId of lessonDItemIds) {
      await prisma.attempt.create({
        data: {
          userId: userD.id,
          itemId,
          sessionId: seedSessionD.id,
          answer: 'A',
          correct: true,
          firstTry: true,
        },
      });
    }

    const seedSessionE = await prisma.session.create({
      data: { userId: userE.id, date: past, status: 'COMPLETED' },
    });
    // itemE1: benar sekali, tidak pernah salah.
    await prisma.attempt.create({
      data: {
        userId: userE.id,
        itemId: itemE1Id,
        sessionId: seedSessionE.id,
        answer: 'A',
        correct: true,
        firstTry: true,
      },
    });
    // itemE2: benar sekali (agar lesson tercatat selesai) + 2x salah
    // (agar diprioritaskan di sesi penguatan).
    await prisma.attempt.create({
      data: {
        userId: userE.id,
        itemId: itemE2Id,
        sessionId: seedSessionE.id,
        answer: 'A',
        correct: true,
        firstTry: false,
      },
    });
    await prisma.attempt.create({
      data: {
        userId: userE.id,
        itemId: itemE2Id,
        sessionId: seedSessionE.id,
        answer: 'B',
        correct: false,
        firstTry: false,
      },
    });
    await prisma.attempt.create({
      data: {
        userId: userE.id,
        itemId: itemE2Id,
        sessionId: seedSessionE.id,
        answer: 'C',
        correct: false,
        firstTry: false,
      },
    });

    const loginD = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userD.email, password: PASSWORD })
      .expect(201);
    userDToken = loginD.body.accessToken;
    const loginE = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userE.email, password: PASSWORD })
      .expect(201);
    userEToken = loginE.body.accessToken;
    const loginF = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userF.email, password: PASSWORD })
      .expect(201);
    userFToken = loginF.body.accessToken;
  });

  afterAll(async () => {
    // FK-safe: attempt → session_item → session → review_queue → item → lesson → user
    await prisma.attempt.deleteMany({
      where: { user: { email: { startsWith: 'p2a2-' } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { session: { user: { email: { startsWith: 'p2a2-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p2a2-' } } },
    });
    await prisma.reviewQueue.deleteMany({
      where: { user: { email: { startsWith: 'p2a2-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'P2A2-' } } },
    });
    await prisma.lesson.deleteMany({
      where: { code: { startsWith: 'P2A2-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'p2a2-' } },
    });
    await app.close();
  });

  it('replay SUKSES: lesson selesai → sesi REPLAY berisi semua item LIVE urut order', async () => {
    const res = await post(
      '/session/replay',
      { lessonId: lessonDId },
      userDToken,
    ).expect(201);
    expect(res.body.kind).toBe('REPLAY');
    expect(res.body.items.map((i: any) => i.itemId)).toEqual(lessonDItemIds);
    expect(res.body.items.every((i: any) => i.source === 'LESSON')).toBe(true);
  });

  it('sesi penguatan: lesson level habis → semua REVIEW, prioritas paling sering salah', async () => {
    const res = await post('/session/today', {}, userEToken).expect(201);
    expect(res.body.kind).toBe('DAILY');
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((i: any) => i.source === 'REVIEW')).toBe(true);
    // itemE2 (2x salah) harus diprioritaskan di atas itemE1 (tak pernah salah).
    const ids = res.body.items.map((i: any) => i.itemId);
    expect(ids.indexOf(itemE2Id)).toBeLessThan(ids.indexOf(itemE1Id));
  });

  it('409: level tanpa lesson LIVE dan tanpa riwayat attempt', async () => {
    const res = await post('/session/today', {}, userFToken).expect(409);
    expect(res.body.message).toBe('Belum ada konten untuk levelmu');
  });
});
