// apps/api/test/module-in-path.e2e-spec.ts — Module.showInPath: kuis bab modul
// LIVE ikut Perjalanan & sesi harian bila modulnya ditandai. Prefix MIP- / mip-.
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password123!';

describe('Module.showInPath — kuis modul di Perjalanan & sesi harian', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminToken: string;
  let shownModuleId: string;
  const stamp = Date.now();
  const shown = { lessonId: '', itemIds: [] as string[] };
  const hidden = { lessonId: '', itemIds: [] as string[] };

  const get = (p: string, t: string) =>
    request(app.getHttpServer()).get(p).set('Authorization', `Bearer ${t}`);
  const post = (p: string, t: string) =>
    request(app.getHttpServer()).post(p).set('Authorization', `Bearer ${t}`);

  async function linkedLesson(
    code: string,
    order: number,
    showInPath: boolean,
  ) {
    const l = await prisma.lesson.create({
      data: {
        code: `MIP-${code}-${stamp}`,
        title: `MIP ${code}`,
        topic: `MIP ${code}`,
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
        answerKey: `mip ${code} sentence`,
        explanation: 'e',
        order: 2,
        status: 'LIVE',
      },
    });
    const mod = await prisma.module.create({
      data: {
        slug: `mip-${code.toLowerCase()}-${stamp}`,
        title: `MIP ${code}`,
        summary: 's',
        level: 'MAHIR',
        cefr: 'C1',
        order: 9300,
        status: 'LIVE',
        showInPath,
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
        lessonId: l.id,
      },
    });
    return { lessonId: l.id, itemIds: [a.id, b.id], moduleId: mod.id };
  }

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const s = await linkedLesson('SHOW', -2000, true);
    Object.assign(shown, s);
    shownModuleId = s.moduleId;
    Object.assign(hidden, await linkedLesson('HIDE', -2001, false));

    const email = `mip-${stamp}@test.local`;
    await prisma.user.create({
      data: {
        name: 'MIP',
        email,
        role: 'USER',
        level: 'MAHIR',
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        inviteStatus: 'ACCEPTED',
        voiceConsentAt: new Date(),
      },
    });
    token = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD })
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
  });

  afterAll(async () => {
    const users = { user: { email: { startsWith: 'mip-' } } };
    await prisma.attempt.deleteMany({ where: users });
    await prisma.sessionItem.deleteMany({ where: { session: users } });
    await prisma.session.deleteMany({ where: users });
    await prisma.moduleChapter.deleteMany({
      where: { module: { slug: { startsWith: 'mip-' } } },
    });
    await prisma.module.deleteMany({ where: { slug: { startsWith: 'mip-' } } });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'MIP-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'MIP-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'mip-' } } });
    await app.close();
  });

  it('/journey memuat kuis modul showInPath, bukan modul biasa', async () => {
    const res = await get('/journey', token).expect(200);
    const ids = res.body.topics.flatMap((t: any) =>
      t.lessons.map((l: any) => l.id),
    );
    expect(ids).toContain(shown.lessonId);
    expect(ids).not.toContain(hidden.lessonId);
  });

  it('sesi harian memakai soal modul showInPath', async () => {
    const res = await post('/session/today', token).expect(201);
    const ids = res.body.items.map((i: any) => i.itemId);
    expect(ids).toContain(shown.itemIds[0]);
    expect(ids.some((id: string) => hidden.itemIds.includes(id))).toBe(false);
  });

  it('sesi berbicara memuat UCAPAN modul showInPath', async () => {
    const res = await post('/session/speaking', token).expect(201);
    const ids = res.body.items.map((i: any) => i.itemId);
    expect(ids).toContain(shown.itemIds[1]);
    expect(ids).not.toContain(hidden.itemIds[1]);
  });

  it('admin bisa mematikan/menyalakan showInPath', async () => {
    const off = await request(app.getHttpServer())
      .patch(`/admin/modules/${shownModuleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ showInPath: false })
      .expect(200);
    expect(off.body.showInPath).toBe(false);
    const res = await get('/journey', token).expect(200);
    const ids = res.body.topics.flatMap((t: any) =>
      t.lessons.map((l: any) => l.id),
    );
    expect(ids).not.toContain(shown.lessonId);

    await request(app.getHttpServer())
      .patch(`/admin/modules/${shownModuleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ showInPath: 'ya' })
      .expect(400);
  });
});
