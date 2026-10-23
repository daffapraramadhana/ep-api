// apps/api/test/module-scope.e2e-spec.ts
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB } from '../src/common/wib';

// Spec satu-perjalanan: lesson bab modul LIVE IKUT jalur harian (journey,
// sesi harian, sesi berbicara, penguatan, next lesson Beranda) dengan urutan
// bab; sesi MODULE COMPLETED dihitung ke target harian. Order negatif supaya lesson
// tes selalu paling depan meski DB dev berisi lesson lain di level ini.
// Prefix MSC- / msc-.
const PASSWORD = 'Password123!';

describe('cakupan modul (PATH_LESSON & COUNTED_SESSION_KINDS)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let token2: string;
  let userId2: string;
  let pathLessonId: string;
  let moduleLessonId: string;
  let pathItemIds: string[] = [];
  let moduleItemIds: string[] = [];
  let draftLinkedLessonId: string;
  let token3: string;
  const stamp = Date.now();

  const get = (p: string, t: string) =>
    request(app.getHttpServer()).get(p).set('Authorization', `Bearer ${t}`);
  const post = (p: string, t: string, body: object = {}) =>
    request(app.getHttpServer())
      .post(p)
      .set('Authorization', `Bearer ${t}`)
      .send(body);

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const mk = async (code: string, order: number) => {
      const l = await prisma.lesson.create({
        data: {
          code: `MSC-${code}-${stamp}`,
          title: `MSC ${code}`,
          topic: 'MSC',
          level: 'MAHIR',
          cefr: 'C1',
          skill: 'SPEAKING',
          order,
          status: 'LIVE',
        },
      });
      const a = await prisma.item.create({
        data: {
          lessonId: l.id,
          type: 'PILIHAN_GANDA',
          prompt: 'p',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'e',
          order: 1,
          status: 'LIVE',
        },
      });
      const b = await prisma.item.create({
        data: {
          lessonId: l.id,
          type: 'UCAPAN',
          prompt: 'Baca',
          answerKey: `msc ${code} sentence`,
          explanation: 'e',
          order: 2,
          status: 'LIVE',
        },
      });
      return { l, ids: [a.id, b.id] };
    };
    const modL = await mk('MOD', -1000);
    const pathL = await mk('PATH', -999);
    moduleLessonId = modL.l.id;
    moduleItemIds = modL.ids;
    pathLessonId = pathL.l.id;
    pathItemIds = pathL.ids;
    // Lesson yang ditautkan ke modul DRAFT tetap di jalur harian (keputusan
    // review: baru keluar dari Perjalanan setelah modulnya LIVE).
    const draftL = await mk('DRAFTL', -998);
    draftLinkedLessonId = draftL.l.id;

    const mod = await prisma.module.create({
      data: {
        slug: `msc-${stamp}`,
        title: 'MSC Modul',
        summary: 's',
        level: 'MAHIR',
        cefr: 'C1',
        order: 1,
        status: 'LIVE',
      },
    });
    await prisma.moduleChapter.create({
      data: {
        moduleId: mod.id,
        order: 1,
        title: 'Bab',
        estMinutes: 5,
        body: 'x',
        blocks: [],
        lessonId: moduleLessonId,
      },
    });
    const draftMod = await prisma.module.create({
      data: {
        slug: `msc-d-${stamp}`,
        title: 'MSC Draft',
        summary: 's',
        level: 'MAHIR',
        cefr: 'C1',
        order: 2,
      },
    });
    await prisma.moduleChapter.create({
      data: {
        moduleId: draftMod.id,
        order: 1,
        title: 'Bab draft',
        estMinutes: 5,
        body: 'x',
        blocks: [],
        lessonId: draftLinkedLessonId,
      },
    });

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const u = await prisma.user.create({
      data: {
        name: 'MSC',
        email: `msc-a-${stamp}@ex.com`,
        role: 'USER',
        level: 'MAHIR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
        voiceConsentAt: new Date(),
      },
    });
    const u2 = await prisma.user.create({
      data: {
        name: 'MSC2',
        email: `msc-b-${stamp}@ex.com`,
        role: 'USER',
        level: 'MAHIR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    userId2 = u2.id;
    // User 3: semua lesson tuntas → sesi harian jatuh ke penguatan. Item
    // lesson bab LIVE pernah dijawab SALAH lalu benar (prioritas tertinggi
    // penguatan — kini boleh ikut).
    const u3 = await prisma.user.create({
      data: {
        name: 'MSC3',
        email: `msc-c-${stamp}@ex.com`,
        role: 'USER',
        level: 'MAHIR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const past = await prisma.session.create({
      data: {
        userId: u3.id,
        date: new Date('2026-10-01'),
        kind: 'DAILY',
        status: 'COMPLETED',
      },
    });
    for (const [itemId, correct] of [
      ...pathItemIds.map((id) => [id, true] as const),
      ...draftL.ids.map((id) => [id, true] as const),
      ...moduleItemIds.map((id) => [id, false] as const),
      ...moduleItemIds.map((id) => [id, true] as const),
    ]) {
      await prisma.attempt.create({
        data: {
          userId: u3.id,
          itemId,
          sessionId: past.id,
          answer: 'x',
          correct,
          firstTry: !(moduleItemIds.includes(itemId) && correct),
        },
      });
    }
    const login = async (email: string) =>
      (
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password: PASSWORD })
          .expect(201)
      ).body.accessToken as string;
    token = await login(u.email);
    token2 = await login(u2.email);
    token3 = await login(u3.email);
  });

  afterAll(async () => {
    const users = { user: { email: { startsWith: 'msc-' } } };
    await prisma.attempt.deleteMany({ where: users });
    await prisma.sessionItem.deleteMany({ where: { session: users } });
    await prisma.session.deleteMany({ where: users });
    await prisma.reviewQueue.deleteMany({ where: users });
    await prisma.moduleChapter.deleteMany({
      where: { module: { slug: { startsWith: 'msc-' } } },
    });
    await prisma.module.deleteMany({ where: { slug: { startsWith: 'msc-' } } });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'MSC-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'MSC-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'msc-' } } });
    await app.close();
  });

  it('/journey memuat lesson bab modul LIVE', async () => {
    const res = await get('/journey', token).expect(200);
    const ids = res.body.topics.flatMap((t: any) =>
      t.lessons.map((l: any) => l.id),
    );
    expect(ids).toContain(pathLessonId);
    expect(ids).toContain(moduleLessonId);
  });

  it('summary.nextLesson = lesson bab modul bila itu langkah berikutnya', async () => {
    const res = await get('/me/summary', token).expect(200);
    expect(res.body.nextLesson.id).toBe(moduleLessonId);
  });

  it('sesi harian memakai lesson bab modul LIVE bila itu langkah berikutnya', async () => {
    const res = await post('/session/today', token).expect(201);
    const ids = res.body.items.map((i: any) => i.itemId);
    expect(ids).toEqual(expect.arrayContaining(moduleItemIds));
    expect(ids.some((id: string) => pathItemIds.includes(id))).toBe(false);
  });

  it('sesi berbicara memuat UCAPAN dari lesson bab modul LIVE', async () => {
    const res = await post('/session/speaking', token).expect(201);
    const ids = res.body.items.map((i: any) => i.itemId);
    expect(ids).toContain(pathItemIds[1]);
    expect(ids).toContain(moduleItemIds[1]);
    // urutan jalur: unit modul (order -1000) sebelum unit topik
    expect(ids.indexOf(moduleItemIds[1])).toBeLessThan(
      ids.indexOf(pathItemIds[1]),
    );
  });

  it('sesi MODULE COMPLETED hari ini dihitung ke target harian', async () => {
    await prisma.session.create({
      data: {
        userId: userId2,
        date: todayWIB(),
        kind: 'MODULE',
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    const res = await get('/me/summary', token2).expect(200);
    expect(res.body.sessionsCompletedToday).toBe(1);
    expect(res.body.streak).toBeGreaterThanOrEqual(1);
  });

  it('lesson yang ditautkan ke modul DRAFT tetap di /journey', async () => {
    const res = await get('/journey', token).expect(200);
    const ids = res.body.topics.flatMap((t: any) =>
      t.lessons.map((l: any) => l.id),
    );
    expect(ids).toContain(draftLinkedLessonId);
  });

  it('penguatan boleh memuat item lesson bab modul LIVE', async () => {
    const res = await post('/session/today', token3).expect(201);
    const ids = res.body.items.map((i: any) => i.itemId);
    expect(res.body.items.every((i: any) => i.source === 'REVIEW')).toBe(true);
    expect(ids).toEqual(expect.arrayContaining(moduleItemIds));
  });

  it('mesin sesi mengikuti urutan bab, bukan Lesson.order', async () => {
    // Modul kedua di depan semuanya: bab 1 → lesson order -1500, bab 2 →
    // lesson order -2000 (Lesson.order terbalik dari urutan bab).
    const mkL = async (code: string, order: number) => {
      const l = await prisma.lesson.create({
        data: {
          code: `MSC-${code}-${stamp}`,
          title: `MSC ${code}`,
          topic: 'MSC ORD',
          level: 'MAHIR',
          cefr: 'C1',
          skill: 'READING',
          order,
          status: 'LIVE',
        },
      });
      const it = await prisma.item.create({
        data: {
          lessonId: l.id,
          type: 'PILIHAN_GANDA',
          prompt: 'p',
          options: ['A', 'B', 'C', 'D'],
          answerKey: 'A',
          explanation: 'e',
          order: 1,
          status: 'LIVE',
        },
      });
      return { l, itemId: it.id };
    };
    const ch1 = await mkL('ORD1', -1500);
    const ch2 = await mkL('ORD2', -2000);
    const m = await prisma.module.create({
      data: {
        slug: `msc-o-${stamp}`,
        title: 'MSC Urutan',
        summary: 's',
        level: 'MAHIR',
        cefr: 'C1',
        order: 3,
        status: 'LIVE',
      },
    });
    for (const [order, l] of [
      [1, ch1.l],
      [2, ch2.l],
    ] as const) {
      await prisma.moduleChapter.create({
        data: {
          moduleId: m.id,
          order,
          title: `Bab ${order}`,
          estMinutes: 5,
          body: 'x',
          blocks: [],
          lessonId: l.id,
        },
      });
    }
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const u = await prisma.user.create({
      data: {
        name: 'MSC4',
        email: `msc-d-${stamp}@ex.com`,
        role: 'USER',
        level: 'MAHIR',
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const t = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: u.email, password: PASSWORD })
        .expect(201)
    ).body.accessToken as string;
    const res = await post('/session/today', t).expect(201);
    const ids = res.body.items.map((i: any) => i.itemId);
    expect(ids).toContain(ch1.itemId);
    expect(ids).not.toContain(ch2.itemId);
  });
});
