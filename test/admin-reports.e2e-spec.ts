import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password123!';
const stamp = Date.now();
const LEVEL = 'DASAR' as const;

describe('GET/PATCH /admin/reports (Task 3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  function get(path: string, token: string) {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);
  }

  function patch(path: string, body: Record<string, unknown>, token: string) {
    return request(app.getHttpServer())
      .patch(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  async function makeUser(
    name: string,
    email: string,
    role: 'USER' | 'ADMIN' = 'USER',
  ) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        level: LEVEL,
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
        topic: `P3R-Topic-${stamp}`,
        level: LEVEL,
        cefr: 'A1',
        skill: 'VOCABULARY',
        order,
        status: 'LIVE',
      },
    });
  }

  async function makeItem(lessonId: string, order: number) {
    return prisma.item.create({
      data: {
        lessonId,
        type: 'PILIHAN_GANDA',
        prompt: `This is a very long prompt that should be truncated to exactly one hundred twenty characters when shown in the admin report list view. Anything beyond this point will be cut off.`,
        options: ['A', 'B', 'C', 'D'],
        answerKey: 'A',
        explanation: 'explanation',
        order,
        status: 'LIVE',
      },
    });
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    // FK-safe cleanup, scoped to this file's own 'P3R-' / 'p3r-' prefix; never touch other seed data.
    await prisma.itemReport.deleteMany({
      where: { user: { email: { startsWith: 'p3r-' } } },
    });
    await prisma.reviewQueue.deleteMany({
      where: { user: { email: { startsWith: 'p3r-' } } },
    });
    await prisma.attempt.deleteMany({
      where: { user: { email: { startsWith: 'p3r-' } } },
    });
    await prisma.sessionItem.deleteMany({
      where: { session: { user: { email: { startsWith: 'p3r-' } } } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'p3r-' } } },
    });
    await prisma.streakFreeze.deleteMany({
      where: { user: { email: { startsWith: 'p3r-' } } },
    });
    await prisma.item.deleteMany({
      where: { lesson: { code: { startsWith: 'P3R-' } } },
    });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'P3R-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'p3r-' } } });
    await app.close();
  });

  it('GET /admin/reports filter works: default OPEN returns only OPEN', async () => {
    const reporter = await makeUser(
      `P3R Report User ${stamp}`,
      `p3r-reporter-${stamp}@ex.com`,
    );
    const admin = await makeUser(
      `P3R Admin ${stamp}`,
      `p3r-admin-${stamp}@ex.com`,
      'ADMIN',
    );

    const lesson = await makeLesson(`P3R-Lesson-${stamp}`, 1);
    const item1 = await makeItem(lesson.id, 1);
    const item2 = await makeItem(lesson.id, 2);

    // Create reports: one OPEN, one RESOLVED
    const report1 = await prisma.itemReport.create({
      data: {
        userId: reporter.id,
        itemId: item1.id,
        note: 'Bug in item 1',
        status: 'OPEN',
      },
    });

    const report2 = await prisma.itemReport.create({
      data: {
        userId: reporter.id,
        itemId: item2.id,
        note: 'Bug in item 2 - fixed',
        status: 'RESOLVED',
      },
    });

    // Default (no status param) should return OPEN only
    const res = await get('/admin/reports', admin.token).expect(200);

    // Filter to only the reports we created
    const openReports = res.body.filter(
      (r: any) => [report1.id, report2.id].includes(r.id),
    );
    expect(openReports).toHaveLength(1);
    expect(openReports[0].status).toBe('OPEN');
    expect(openReports[0].note).toBe('Bug in item 1');
    expect(openReports[0].reporter.name).toBe(`P3R Report User ${stamp}`);
    expect(openReports[0].item.id).toBe(item1.id);
    expect(openReports[0].item.lessonId).toBe(lesson.id);
    expect(openReports[0].item.prompt.length).toBeLessThanOrEqual(120);
    expect(openReports[0].item.type).toBe('PILIHAN_GANDA');
    expect(openReports[0].item.status).toBe('LIVE');
  });

  it('GET /admin/reports?status=RESOLVED returns only RESOLVED', async () => {
    const reporter = await makeUser(
      `P3R Report User 2 ${stamp}`,
      `p3r-reporter2-${stamp}@ex.com`,
    );
    const admin = await makeUser(
      `P3R Admin 2 ${stamp}`,
      `p3r-admin2-${stamp}@ex.com`,
      'ADMIN',
    );

    const lesson = await makeLesson(`P3R-Lesson2-${stamp}`, 1);
    const item1 = await makeItem(lesson.id, 1);
    const item2 = await makeItem(lesson.id, 2);

    const report1 = await prisma.itemReport.create({
      data: {
        userId: reporter.id,
        itemId: item1.id,
        note: 'Bug in item 1',
        status: 'OPEN',
      },
    });

    const report2 = await prisma.itemReport.create({
      data: {
        userId: reporter.id,
        itemId: item2.id,
        note: 'Bug in item 2 - fixed',
        status: 'RESOLVED',
      },
    });

    const res = await get(
      '/admin/reports?status=RESOLVED',
      admin.token,
    ).expect(200);

    // Filter to only the reports we created
    const resolvedReports = res.body.filter(
      (r: any) => [report1.id, report2.id].includes(r.id),
    );
    expect(resolvedReports).toHaveLength(1);
    expect(resolvedReports[0].status).toBe('RESOLVED');
    expect(resolvedReports[0].note).toBe('Bug in item 2 - fixed');
    expect(resolvedReports[0].id).toBe(report2.id);
  });

  it('PATCH /admin/reports/:id resolve moves OPEN to RESOLVED', async () => {
    const reporter = await makeUser(
      `P3R Report User 3 ${stamp}`,
      `p3r-reporter3-${stamp}@ex.com`,
    );
    const admin = await makeUser(
      `P3R Admin 3 ${stamp}`,
      `p3r-admin3-${stamp}@ex.com`,
      'ADMIN',
    );

    const lesson = await makeLesson(`P3R-Lesson3-${stamp}`, 1);
    const item = await makeItem(lesson.id, 1);

    const report = await prisma.itemReport.create({
      data: {
        userId: reporter.id,
        itemId: item.id,
        note: 'Bug in item',
        status: 'OPEN',
      },
    });

    // Resolve the report
    const patchRes = await patch(
      `/admin/reports/${report.id}`,
      { status: 'RESOLVED' },
      admin.token,
    ).expect(200);

    expect(patchRes.body.status).toBe('RESOLVED');

    // Verify it no longer appears in OPEN list
    const openList = await get('/admin/reports', admin.token).expect(200);
    const found = openList.body.find((r: any) => r.id === report.id);
    expect(found).toBeUndefined();

    // Verify it appears in RESOLVED list
    const resolvedList = await get(
      '/admin/reports?status=RESOLVED',
      admin.token,
    ).expect(200);
    const resolvedFound = resolvedList.body.find((r: any) => r.id === report.id);
    expect(resolvedFound).toBeDefined();
    expect(resolvedFound.status).toBe('RESOLVED');
  });

  it('GET /admin/reports USER role returns 403', async () => {
    const user = await makeUser(
      `P3R User ${stamp}`,
      `p3r-user-${stamp}@ex.com`,
      'USER',
    );

    await get('/admin/reports', user.token).expect(403);
  });

  it('GET /admin/reports bad status query returns 400', async () => {
    const admin = await makeUser(
      `P3R Admin 4 ${stamp}`,
      `p3r-admin4-${stamp}@ex.com`,
      'ADMIN',
    );

    const res = await get(
      '/admin/reports?status=INVALID',
      admin.token,
    ).expect(400);

    expect(res.body.message).toContain('Status harus OPEN atau RESOLVED');
  });

  it('PATCH /admin/reports/:id bad body returns 400', async () => {
    const reporter = await makeUser(
      `P3R Report User 4 ${stamp}`,
      `p3r-reporter4-${stamp}@ex.com`,
    );
    const admin = await makeUser(
      `P3R Admin 5 ${stamp}`,
      `p3r-admin5-${stamp}@ex.com`,
      'ADMIN',
    );

    const lesson = await makeLesson(`P3R-Lesson4-${stamp}`, 1);
    const item = await makeItem(lesson.id, 1);

    const report = await prisma.itemReport.create({
      data: {
        userId: reporter.id,
        itemId: item.id,
        note: 'Bug in item',
        status: 'OPEN',
      },
    });

    const res = await patch(
      `/admin/reports/${report.id}`,
      { status: 'INVALID' },
      admin.token,
    ).expect(400);

    expect(res.body.message).toContain(
      'Hanya transisi ke RESOLVED yang didukung',
    );
  });

  it('PATCH /admin/reports/:id unknown id returns 404', async () => {
    const admin = await makeUser(
      `P3R Admin 6 ${stamp}`,
      `p3r-admin6-${stamp}@ex.com`,
      'ADMIN',
    );

    await patch(
      '/admin/reports/nonexistent-id',
      { status: 'RESOLVED' },
      admin.token,
    ).expect(404);
  });

  it('GET /admin/reports sorted by createdAt desc', async () => {
    const reporter = await makeUser(
      `P3R Report User 5 ${stamp}`,
      `p3r-reporter5-${stamp}@ex.com`,
    );
    const admin = await makeUser(
      `P3R Admin 7 ${stamp}`,
      `p3r-admin7-${stamp}@ex.com`,
      'ADMIN',
    );

    const lesson = await makeLesson(`P3R-Lesson5-${stamp}`, 1);
    const item1 = await makeItem(lesson.id, 1);
    const item2 = await makeItem(lesson.id, 2);
    const item3 = await makeItem(lesson.id, 3);

    // Create reports with slight delays to ensure different timestamps
    const report1 = await prisma.itemReport.create({
      data: {
        userId: reporter.id,
        itemId: item1.id,
        note: 'First report',
        status: 'OPEN',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const report2 = await prisma.itemReport.create({
      data: {
        userId: reporter.id,
        itemId: item2.id,
        note: 'Second report',
        status: 'OPEN',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const report3 = await prisma.itemReport.create({
      data: {
        userId: reporter.id,
        itemId: item3.id,
        note: 'Third report',
        status: 'OPEN',
      },
    });

    const res = await get('/admin/reports', admin.token).expect(200);

    // Should be ordered newest first
    const reports = res.body.filter(
      (r: any) =>
        [report1.id, report2.id, report3.id].includes(r.id),
    );
    expect(reports[0].id).toBe(report3.id);
    expect(reports[1].id).toBe(report2.id);
    expect(reports[2].id).toBe(report1.id);
  });
});
