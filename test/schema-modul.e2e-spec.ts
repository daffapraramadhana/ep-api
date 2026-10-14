import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Prefix SMD- / smd- milik file ini.
describe('schema menu modul', () => {
  const prisma = new PrismaClient();
  const stamp = Date.now();

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: 'smd-' } } },
    });
    await prisma.moduleChapter.deleteMany({
      where: { module: { slug: { startsWith: 'smd-' } } },
    });
    await prisma.module.deleteMany({ where: { slug: { startsWith: 'smd-' } } });
    await prisma.lesson.deleteMany({ where: { code: { startsWith: 'SMD-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'smd-' } } });
    await prisma.$disconnect();
  });

  it('modul + bab + lesson tertaut + sesi MODULE tersimpan; lessonId unik', async () => {
    const lesson = await prisma.lesson.create({
      data: {
        code: `SMD-L-${stamp}`,
        title: 'L',
        topic: 'T',
        level: 'DASAR',
        cefr: 'A1',
        skill: 'VOCABULARY',
        order: 1,
      },
    });
    const mod = await prisma.module.create({
      data: {
        slug: `smd-${stamp}`,
        title: 'M',
        summary: 'S',
        level: 'DASAR',
        cefr: 'A1',
        order: 1,
      },
    });
    const ch = await prisma.moduleChapter.create({
      data: {
        moduleId: mod.id,
        order: 1,
        title: 'Bab 1',
        estMinutes: 5,
        body: 'Halo',
        blocks: [],
        lessonId: lesson.id,
      },
    });
    const user = await prisma.user.create({
      data: { name: 'U', email: `smd-${stamp}@ex.com` },
    });
    const s = await prisma.session.create({
      data: {
        userId: user.id,
        date: new Date('2026-10-14'),
        kind: 'MODULE',
        moduleChapterId: ch.id,
      },
    });
    expect(s.kind).toBe('MODULE');

    const withRel = await prisma.lesson.findUniqueOrThrow({
      where: { id: lesson.id },
      include: { moduleChapter: true },
    });
    expect(withRel.moduleChapter?.id).toBe(ch.id);

    await expect(
      prisma.moduleChapter.create({
        data: {
          moduleId: mod.id,
          order: 2,
          title: 'Bab 2',
          estMinutes: 5,
          body: 'x',
          blocks: [],
          lessonId: lesson.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await expect(
      prisma.moduleChapter.create({
        data: {
          moduleId: mod.id,
          order: 1,
          title: 'Dobel',
          estMinutes: 5,
          body: 'x',
          blocks: [],
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
