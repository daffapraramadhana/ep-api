// apps/api/test/module-scope.e2e-spec.ts
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB } from '../src/common/wib';

// Lesson yang ditautkan ke bab modul TIDAK boleh muncul di jalur harian
// (journey, sesi harian, sesi berbicara, next lesson Beranda), dan sesi
// MODULE COMPLETED dihitung ke target harian. Order negatif supaya lesson
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
    const login = async (email: string) =>
      (
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password: PASSWORD })
          .expect(201)
      ).body.accessToken as string;
    token = await login(u.email);
    token2 = await login(u2.email);
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

  it('/journey tidak memuat lesson milik bab', async () => {
    const res = await get('/journey', token).expect(200);
    const ids = res.body.topics.flatMap((t: any) =>
      t.lessons.map((l: any) => l.id),
    );
    expect(ids).toContain(pathLessonId);
    expect(ids).not.toContain(moduleLessonId);
  });

  it('summary.nextLesson = lesson jalur, bukan lesson bab', async () => {
    const res = await get('/me/summary', token).expect(200);
    expect(res.body.nextLesson.id).toBe(pathLessonId);
  });

  it('sesi harian memakai lesson jalur', async () => {
    const res = await post('/session/today', token).expect(201);
    const ids = res.body.items.map((i: any) => i.itemId);
    expect(ids).toEqual(expect.arrayContaining(pathItemIds));
    expect(ids.some((id: string) => moduleItemIds.includes(id))).toBe(false);
  });

  it('sesi berbicara tidak memuat UCAPAN dari lesson bab', async () => {
    const res = await post('/session/speaking', token).expect(201);
    const ids = res.body.items.map((i: any) => i.itemId);
    expect(ids).toContain(pathItemIds[1]);
    expect(ids).not.toContain(moduleItemIds[1]);
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
});
