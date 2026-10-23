// apps/api/test/journey-units.e2e-spec.ts — spec satu-perjalanan: /journey
// berbentuk unit (modul = unit berisi bab; bacaan tak dihitung) dan Beranda
// menunjuk langkah `now` yang sama. Level MAHIR, order sangat negatif supaya
// langkah tes selalu paling depan. Prefix JU- / ju-.
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { todayWIB } from '../src/common/wib';

const PASSWORD = 'Password123!';

describe('Perjalanan berbentuk unit (satu Perjalanan)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  const topic = `JU Topik ${stamp}`;
  const slugA = `ju-a-${stamp}`;
  const slugB = `ju-b-${stamp}`;
  const ids = {
    a1: '',
    a1Item: '',
    a3: '',
    a3Item: '',
    c1: '',
    t1: '',
    empty: '',
    ch1: '',
    ch2: '',
  };

  const get = (p: string, t: string) =>
    request(app.getHttpServer()).get(p).set('Authorization', `Bearer ${t}`);

  async function lesson(
    code: string,
    order: number,
    opts: { status?: 'LIVE' | 'DRAFT'; itemStatus?: 'LIVE' | 'DRAFT' } = {},
  ) {
    const l = await prisma.lesson.create({
      data: {
        code: `JU-${code}-${stamp}`,
        title: `JU ${code}`,
        topic,
        level: 'MAHIR',
        cefr: 'C1',
        skill: 'READING',
        order,
        status: opts.status ?? 'LIVE',
      },
    });
    const item = await prisma.item.create({
      data: {
        lessonId: l.id,
        type: 'PILIHAN_GANDA',
        prompt: 'p',
        options: ['A', 'B', 'C', 'D'],
        answerKey: 'A',
        explanation: 'e',
        order: 1,
        status: opts.itemStatus ?? 'LIVE',
      },
    });
    return { id: l.id, itemId: item.id };
  }

  async function module(slug: string, status: 'LIVE' | 'DRAFT') {
    return prisma.module.create({
      data: {
        slug,
        title: `Modul ${slug}`,
        summary: 's',
        level: 'MAHIR',
        cefr: 'C1',
        order: 1,
        status,
      },
    });
  }

  async function chapter(moduleId: string, order: number, lessonId?: string) {
    return prisma.moduleChapter.create({
      data: {
        moduleId,
        order,
        title: `Bab ${order}`,
        estMinutes: 7,
        body: 'x',
        blocks: [],
        lessonId: lessonId ?? null,
      },
    });
  }

  async function user(key: string, level: 'MAHIR' | null = 'MAHIR') {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const u = await prisma.user.create({
      data: {
        name: `JU ${key}`,
        email: `ju-${key}-${stamp}@ex.com`,
        role: 'USER',
        level,
        passwordHash,
        inviteStatus: 'ACCEPTED',
      },
    });
    const token = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: u.email, password: PASSWORD })
        .expect(201)
    ).body.accessToken as string;
    return { id: u.id, token };
  }

  const unitA = (body: any) =>
    body.units.find((u: any) => u.moduleSlug === slugA);

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // Modul A LIVE: bab1 kuis (order -4800), bab2 bacaan (tanpa lesson),
    // bab3 kuis (order -4900 → unit A berposisi -4900), bab4 lesson DRAFT,
    // bab5 lesson LIVE tanpa item LIVE.
    const a1 = await lesson('A1', -4800);
    const a3 = await lesson('A3', -4900);
    const a4 = await lesson('A4', -4850, { status: 'DRAFT' });
    const a5 = await lesson('A5', -4840, { itemStatus: 'DRAFT' });
    Object.assign(ids, {
      a1: a1.id,
      a1Item: a1.itemId,
      a3: a3.id,
      a3Item: a3.itemId,
    });
    const modA = await module(slugA, 'LIVE');
    ids.ch1 = (await chapter(modA.id, 1, a1.id)).id;
    ids.ch2 = (await chapter(modA.id, 2)).id;
    await chapter(modA.id, 3, a3.id);
    await chapter(modA.id, 4, a4.id);
    await chapter(modA.id, 5, a5.id);

    // Modul B LIVE: semua bab bacaan → tidak muncul di Perjalanan.
    const modB = await module(slugB, 'LIVE');
    await chapter(modB.id, 1);

    // Modul C DRAFT: lesson-nya tetap di unit topik.
    const c1 = await lesson('C1', -4700);
    const modC = await module(`ju-c-${stamp}`, 'DRAFT');
    await chapter(modC.id, 1, c1.id);
    ids.c1 = c1.id;
    ids.t1 = (await lesson('T1', -4600)).id;

    // Lesson LIVE tanpa item LIVE → tidak muncul sama sekali.
    ids.empty = (await lesson('EMPTY', -4500, { itemStatus: 'DRAFT' })).id;
  });

  afterAll(async () => {
    const users = { user: { email: { startsWith: 'ju-' } } };
    await prisma.attempt.deleteMany({ where: users });
    await prisma.sessionItem.deleteMany({ where: { session: users } });
    await prisma.session.deleteMany({ where: users });
    await prisma.reviewQueue.deleteMany({ where: users });
    await prisma.moduleChapter.deleteMany({
      where: { module: { slug: { startsWith: 'ju-' } } },
    });
    await prisma.module.deleteMany({ where: { slug: { startsWith: 'ju-' } } });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'JU-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'JU-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'ju-' } } });
    await app.close();
  });

  it('unit modul berisi bab urut ModuleChapter.order dengan posisi bab', async () => {
    const u = await user('order');
    const res = await get('/journey', u.token).expect(200);
    const unit = unitA(res.body);
    expect(unit).toMatchObject({
      kind: 'module',
      title: `Modul ${slugA}`,
      done: 0,
      total: 2,
    });
    expect(
      unit.steps.map((s: any) => [s.kind, s.chapter?.position, s.state]),
    ).toEqual([
      ['chapter', 1, 'now'],
      ['reading', 2, null],
      ['chapter', 3, 'locked'],
      ['reading', 4, null],
      ['reading', 5, null],
    ]);
    expect(unit.steps[0]).toMatchObject({
      id: ids.a1,
      title: 'Bab 1',
      itemCount: 1,
      chapter: {
        moduleSlug: slugA,
        chapterId: ids.ch1,
        order: 1,
        position: 1,
        estMinutes: 7,
      },
    });
    // unit A (min order -4900) di depan unit topik (min -4700)
    const keys = res.body.units.map((x: any) => x.moduleSlug ?? x.title);
    expect(keys.indexOf(slugA)).toBeLessThan(keys.indexOf(topic));
  });

  it('bacaan tidak dihitung dan state null', async () => {
    const u = await user('reading');
    const res = await get('/journey', u.token).expect(200);
    const reading = unitA(res.body).steps[1];
    expect(reading).toMatchObject({
      kind: 'reading',
      id: ids.ch2,
      state: null,
      itemCount: 0,
      accuracy: null,
    });
    const sum = res.body.units.reduce((n: number, x: any) => n + x.total, 0);
    expect(res.body.total).toBe(sum);
  });

  it('langkah selesai setelah now tetap done', async () => {
    const u = await user('donelater');
    const s = await prisma.session.create({
      data: {
        userId: u.id,
        date: new Date('2026-10-01'),
        kind: 'MODULE',
        status: 'COMPLETED',
      },
    });
    // bab 3 dikerjakan duluan (mis. lewat menu Modul)
    await prisma.attempt.create({
      data: {
        userId: u.id,
        itemId: ids.a3Item,
        sessionId: s.id,
        answer: 'A',
        correct: true,
        firstTry: true,
      },
    });
    const res = await get('/journey', u.token).expect(200);
    const unit = unitA(res.body);
    expect(unit.steps[0]).toMatchObject({ id: ids.a1, state: 'now' });
    expect(unit.steps[2]).toMatchObject({
      id: ids.a3,
      state: 'done',
      accuracy: 100,
    });
    expect(unit.done).toBe(1);
  });

  it('modul yang semua babnya bacaan tidak muncul', async () => {
    const u = await user('allreading');
    const res = await get('/journey', u.token).expect(200);
    expect(res.body.units.some((x: any) => x.moduleSlug === slugB)).toBe(false);
  });

  it('lesson modul DRAFT ada di unit topik', async () => {
    const u = await user('draftmod');
    const res = await get('/journey', u.token).expect(200);
    const t = res.body.units.find(
      (x: any) => x.kind === 'topic' && x.title === topic,
    );
    expect(t.moduleSlug).toBeNull();
    expect(t.steps.map((s: any) => [s.kind, s.id])).toEqual([
      ['lesson', ids.c1],
      ['lesson', ids.t1],
    ]);
  });

  it('lesson LIVE tanpa item LIVE tidak muncul sama sekali', async () => {
    const u = await user('emptylesson');
    const res = await get('/journey', u.token).expect(200);
    const all = res.body.units.flatMap((x: any) =>
      x.steps.map((s: any) => s.id),
    );
    expect(all).not.toContain(ids.empty);
  });

  it('user tanpa level → units kosong', async () => {
    const u = await user('nolevel', null);
    const res = await get('/journey', u.token).expect(200);
    expect(res.body).toEqual({ units: [], done: 0, total: 0 });
  });

  async function solve(userId: string, itemIds: string[]) {
    const s = await prisma.session.create({
      data: {
        userId,
        date: new Date('2026-10-01'),
        kind: 'MODULE',
        status: 'COMPLETED',
      },
    });
    for (const itemId of itemIds)
      await prisma.attempt.create({
        data: {
          userId,
          itemId,
          sessionId: s.id,
          answer: 'A',
          correct: true,
          firstTry: true,
        },
      });
  }

  const nowStep = (body: any) => {
    const i = body.units.findIndex((u: any) =>
      u.steps.some((s: any) => s.state === 'now'),
    );
    return {
      position: i + 1,
      unit: body.units[i],
      step: body.units[i].steps.find((s: any) => s.state === 'now'),
    };
  };

  it('summary.nextLesson = langkah now di /journey (bab modul)', async () => {
    const u = await user('nextch');
    const j = await get('/journey', u.token).expect(200);
    const now = nowStep(j.body);
    const res = await get('/me/summary', u.token).expect(200);
    expect(res.body.nextLesson).toMatchObject({
      id: ids.a1,
      kind: 'chapter',
      title: 'Bab 1',
      topic: `Modul ${slugA}`,
      itemCount: 1,
      estMinutes: 7,
      unit: { position: now.position, title: `Modul ${slugA}` },
      chapter: { moduleSlug: slugA, chapterId: ids.ch1, order: 1, position: 1 },
    });
    expect(now.step.id).toBe(ids.a1);
  });

  it('summary.nextLesson = langkah now di /journey (lesson)', async () => {
    const u = await user('nextlesson');
    await solve(u.id, [ids.a1Item, ids.a3Item]);
    const j = await get('/journey', u.token).expect(200);
    const now = nowStep(j.body);
    const res = await get('/me/summary', u.token).expect(200);
    expect(res.body.nextLesson).toMatchObject({
      id: ids.c1,
      kind: 'lesson',
      topic,
      unit: { position: now.position, title: topic },
      chapter: null,
    });
    expect(now.step.id).toBe(ids.c1);
  });

  it('sesi MODULE terbuka tampil sebagai openSession', async () => {
    const u = await user('openmod');
    await request(app.getHttpServer())
      .post('/session/module')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ chapterId: ids.ch1 })
      .expect(201);
    const res = await get('/me/summary', u.token).expect(200);
    expect(res.body.openSession).toMatchObject({
      lessonTitle: 'Bab 1',
      moduleChapterId: ids.ch1,
      answered: 0,
      total: 1,
    });
  });

  it('sesi DAILY terbuka diutamakan atas MODULE', async () => {
    const u = await user('opendaily');
    await request(app.getHttpServer())
      .post('/session/module')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ chapterId: ids.ch1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/session/today')
      .set('Authorization', `Bearer ${u.token}`)
      .expect(201);
    const res = await get('/me/summary', u.token).expect(200);
    expect(res.body.openSession.moduleChapterId).toBeNull();
  });

  it('summary tanpa moduleInProgress', async () => {
    const u = await user('nomip');
    const res = await get('/me/summary', u.token).expect(200);
    expect(res.body).not.toHaveProperty('moduleInProgress');
  });

  it('user tanpa level → nextLesson null, contentExhausted true', async () => {
    const u = await user('nolevelsum', null);
    const res = await get('/me/summary', u.token).expect(200);
    expect(res.body.nextLesson).toBeNull();
    expect(res.body.contentExhausted).toBe(true);
  });

  it('sesi SPEAKING terbuka tampil dengan kind SPEAKING (Beranda melanjutkannya, bukan sesi harian)', async () => {
    const u = await user('openspeak');
    const s = await prisma.session.create({
      data: { userId: u.id, date: todayWIB(), kind: 'SPEAKING' },
    });
    await prisma.sessionItem.create({
      data: { sessionId: s.id, itemId: ids.a1Item, source: 'LESSON', order: 0 },
    });
    const res = await get('/me/summary', u.token).expect(200);
    expect(res.body.openSession).toMatchObject({
      kind: 'SPEAKING',
      moduleChapterId: null,
    });
  });

  it('DAILY diutamakan atas SPEAKING yang juga terbuka', async () => {
    const u = await user('dailyspeak');
    const s = await prisma.session.create({
      data: { userId: u.id, date: todayWIB(), kind: 'SPEAKING' },
    });
    await prisma.sessionItem.create({
      data: { sessionId: s.id, itemId: ids.a1Item, source: 'LESSON', order: 0 },
    });
    await request(app.getHttpServer())
      .post('/session/today')
      .set('Authorization', `Bearer ${u.token}`)
      .expect(201);
    for (let i = 0; i < 3; i++) {
      const res = await get('/me/summary', u.token).expect(200);
      expect(res.body.openSession.kind).toBe('DAILY');
    }
  });

  it('sesi MODULE yang modulnya tak lagi LIVE tidak ditawarkan untuk dilanjutkan', async () => {
    const u = await user('retiredmod');
    const l = await lesson('D1', 9000);
    const mod = await module(`ju-d-${stamp}`, 'LIVE');
    const ch = await chapter(mod.id, 1, l.id);
    await request(app.getHttpServer())
      .post('/session/module')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ chapterId: ch.id })
      .expect(201);
    await prisma.module.update({
      where: { id: mod.id },
      data: { status: 'RETIRED' },
    });
    const res = await get('/me/summary', u.token).expect(200);
    expect(res.body.openSession).toBeNull();
  });
});
