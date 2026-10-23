import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Menu "Latihan Berbicara": POST /session/speaking merakit sesi kind SPEAKING
// berisi soal UCAPAN dari lesson level user yang belum tuntas (materi baru).
// Jalur grading/XP/SM-2 yang dipakai sama dengan sesi biasa — hanya filter
// `kind` yang dilebarkan di streak/summary/progress/monitoring. Prefix milik
// sendiri (P2S- / p2s-) supaya tidak bertabrakan dengan file e2e lain yang
// berjalan paralel terhadap DB yang sama.
const PASSWORD = 'Password123!';

describe('POST /session/speaking (menu Berbicara)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userSToken: string; // DASAR — alur lengkap (rakit → resume → selesai → target)
  let userEmptyToken: string; // MAHIR — lesson LIVE tanpa UCAPAN → 409
  let userNoLevelToken: string; // level null → 409

  let speakingItemAId: string;
  let speakingItemBId: string;
  const lessonS1ItemIds: string[] = []; // 2 UCAPAN + 1 PILIHAN_GANDA
  let nonSpeakingItemId: string;
  // DB e2e = DB dev bersama (belum terisolasi, lihat backlog). Kuis bab modul
  // LIVE nyata (mis. EFTL) ikut jalur dan menambah UCAPAN DASAR ke sesi
  // berbicara — jadikan DRAFT selama file ini berjalan, pulihkan di afterAll.
  let moduleLessonIds: string[] = [];

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

    moduleLessonIds = (
      await prisma.lesson.findMany({
        where: {
          status: 'LIVE',
          moduleChapter: { is: { module: { status: 'LIVE' } } },
        },
        select: { id: true },
      })
    ).map((l) => l.id);
    await prisma.lesson.updateMany({
      where: { id: { in: moduleLessonIds } },
      data: { status: 'DRAFT' },
    });

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const stamp = Date.now();

    // Lesson S1: DASAR, order 1 — 2 UCAPAN + 1 PILIHAN_GANDA (untuk bukti
    // sesi speaking hanya mengambil UCAPAN, bukan seluruh item lesson).
    const lessonS1 = await prisma.lesson.create({
      data: {
        code: `P2S-S1-${stamp}`,
        title: 'P2S Speaking Lesson 1',
        topic: 'P2S Topic',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'SPEAKING',
        order: 1,
        status: 'LIVE',
      },
    });
    const itemA = await prisma.item.create({
      data: {
        lessonId: lessonS1.id,
        type: 'UCAPAN',
        prompt: 'Baca kalimat ini dengan lantang.',
        answerKey: 'Good morning',
        explanation: 'Sapaan pagi.',
        order: 1,
        status: 'LIVE',
      },
    });
    speakingItemAId = itemA.id;
    lessonS1ItemIds.push(itemA.id);
    const itemB = await prisma.item.create({
      data: {
        lessonId: lessonS1.id,
        type: 'UCAPAN',
        prompt: 'Baca kalimat ini dengan lantang.',
        answerKey: 'How are you today',
        explanation: 'Sapaan menanyakan kabar.',
        order: 2,
        status: 'LIVE',
      },
    });
    speakingItemBId = itemB.id;
    lessonS1ItemIds.push(itemB.id);
    const itemC = await prisma.item.create({
      data: {
        lessonId: lessonS1.id,
        type: 'PILIHAN_GANDA',
        prompt: 'Apa arti "hello"?',
        options: ['Halo', 'Selamat tinggal', 'Terima kasih', 'Maaf'],
        answerKey: 'Halo',
        explanation: 'hello = halo.',
        order: 3,
        status: 'LIVE',
      },
    });
    nonSpeakingItemId = itemC.id;
    lessonS1ItemIds.push(itemC.id);

    // Lesson S2: DASAR, order 2 — 1 UCAPAN lagi supaya menu punya >1 soal.
    const lessonS2 = await prisma.lesson.create({
      data: {
        code: `P2S-S2-${stamp}`,
        title: 'P2S Speaking Lesson 2',
        topic: 'P2S Topic',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'SPEAKING',
        order: 2,
        status: 'LIVE',
      },
    });
    await prisma.item.create({
      data: {
        lessonId: lessonS2.id,
        type: 'UCAPAN',
        prompt: 'Baca kalimat ini dengan lantang.',
        answerKey: 'Nice to meet you',
        explanation: 'Ungkapan senang berkenalan.',
        order: 1,
        status: 'LIVE',
      },
    });

    const userS = await prisma.user.create({
      data: {
        name: 'P2S User S',
        email: `p2s-users-${stamp}@ex.com`,
        role: 'USER',
        level: 'DASAR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const userEmpty = await prisma.user.create({
      data: {
        name: 'P2S User Empty',
        email: `p2s-userempty-${stamp}@ex.com`,
        role: 'USER',
        // MAHIR: seed demo punya lesson LIVE level ini (PE-301..304) tapi TIDAK
        // SATUPUN bertipe UCAPAN — jadi jalur "ada lesson belum tuntas tapi tak
        // ada item UCAPAN" → 409.
        level: 'MAHIR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const userNoLevel = await prisma.user.create({
      data: {
        name: 'P2S User NoLevel',
        email: `p2s-usernolevel-${stamp}@ex.com`,
        role: 'USER',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });

    async function token(email: string) {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD })
        .expect(201);
      return login.body.accessToken as string;
    }
    userSToken = await token(userS.email);
    userEmptyToken = await token(userEmpty.email);
    userNoLevelToken = await token(userNoLevel.email);
  });

  afterAll(async () => {
    await prisma.lesson.updateMany({
      where: { id: { in: moduleLessonIds } },
      data: { status: 'LIVE' },
    });
    await prisma.attempt.deleteMany({
      where: { user: { email: { startsWith: 'p2s-' } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { session: { user: { email: { startsWith: 'p2s-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p2s-' } } },
    });
    await prisma.reviewQueue.deleteMany({
      where: { user: { email: { startsWith: 'p2s-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'P2S-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'P2S-' } } });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'p2s-' } },
    });
    await app.close();
  });

  let speakingSessionId: string;

  it('merakit sesi SPEAKING: hanya item UCAPAN, lessonTitle "Latihan Berbicara", targetText bocor sengaja', async () => {
    const res = await post('/session/speaking', {}, userSToken).expect(201);
    speakingSessionId = res.body.id;
    expect(res.body.kind).toBe('SPEAKING');
    expect(res.body.status).toBe('IN_PROGRESS');
    expect(res.body.lessonTitle).toBe('Latihan Berbicara');
    expect(res.body.items.length).toBe(3); // 2 (S1) + 1 (S2)
    expect(res.body.items.every((i: any) => i.type === 'UCAPAN')).toBe(true);
    expect(res.body.items.every((i: any) => i.source === 'LESSON')).toBe(true);
    expect(res.body.items.every((i: any) => i.targetText !== null)).toBe(true);
    // Soal non-UCAPAN dari lesson yang sama tidak ikut.
    expect(
      res.body.items.some((i: any) => i.itemId === nonSpeakingItemId),
    ).toBe(false);
    // Kontrak FE: kunci jawaban tidak bocor (targetText == answerKey utk
    // UCAPAN, tapi field answerKey/acceptedAnswers/explanation tetap dilarang).
    expect(res.body.items[0]).not.toHaveProperty('answerKey');
    expect(res.body.items[0]).not.toHaveProperty('acceptedAnswers');
    expect(res.body.items[0]).not.toHaveProperty('explanation');
  });

  it('panggil kedua kali = sesi yang sama (resume), bukan duplikat', async () => {
    const a = await post('/session/speaking', {}, userSToken).expect(201);
    const b = await post('/session/speaking', {}, userSToken).expect(201);
    expect(b.body.id).toBe(a.body.id);
    expect(a.body.id).toBe(speakingSessionId);
  });

  it('sesi speaking TIDAK di-resume oleh POST /session/today (kind terpisah)', async () => {
    // userS masih punya sesi SPEAKING IN_PROGRESS di sini (belum dijawab).
    // MULAI harus merakit sesi DAILY baru, bukan me-resume sesi berbicara.
    const daily = await post('/session/today', {}, userSToken).expect(201);
    expect(daily.body.kind).toBe('DAILY');
    expect(daily.body.id).not.toBe(speakingSessionId);
    const speaking = await prisma.session.findUnique({
      where: { id: speakingSessionId },
    });
    expect(speaking?.status).toBe('IN_PROGRESS');
  });

  it('jawab semua benar → session COMPLETED + bonus XP + sessionsCompletedToday naik (speaking dihitung seperti sesi biasa)', async () => {
    const items = (
      await get(`/session/${speakingSessionId}`, userSToken).expect(200)
    ).body.items as { itemId: string }[];
    expect(items.length).toBe(3);

    let last: any;
    for (const it of items) {
      // Jawab dengan kalimat referensi persis → wordOverlapRatio = 100%.
      const ref = (await prisma.item.findUnique({ where: { id: it.itemId } }))
        ?.answerKey;
      last = await post(
        `/session/${speakingSessionId}/answer`,
        { itemId: it.itemId, answer: ref },
        userSToken,
      ).expect(201);
    }

    expect(last.body.sessionCompleted).toBe(true);
    expect(last.body.summary.streakChanged).toBe(true); // hari ini "met"

    const stored = await prisma.session.findUnique({
      where: { id: speakingSessionId },
    });
    expect(stored?.status).toBe('COMPLETED');
    // Bonus sesi-lengkap + perfect-session: kind SPEAKING harus menerimanya
    // (answer.service gate dilebarkan), jadi xpAwarded > 0.
    expect(stored?.xpAwarded ?? 0).toBeGreaterThan(0);

    const summary = await get('/me/summary', userSToken).expect(200);
    expect(summary.body.sessionsCompletedToday).toBe(1);
    // Attempt xp (3 × XP_FIRST_TRY) + bonus sesi tercermin di total.
    expect(summary.body.xpTotal).toBeGreaterThan(0);
  });

  it('409: level MAHIR punya lesson LIVE tapi tak ada item UCAPAN', async () => {
    const res = await post('/session/speaking', {}, userEmptyToken).expect(409);
    expect(res.body.message).toBe(
      'Belum ada latihan berbicara baru untuk levelmu',
    );
  });

  it('409: user tanpa level (belum onboarding)', async () => {
    const res = await post('/session/speaking', {}, userNoLevelToken).expect(
      409,
    );
    expect(res.body.message).toBe('Pilih levelmu dulu di profil');
  });
});
