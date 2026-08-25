import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

describe('schema fase 2', () => {
  const day = new Date('2026-01-05');
  afterAll(async () => {
    await prisma.session.deleteMany({ where: { user: { email: 'p2schema@test.local' } } });
    await prisma.user.deleteMany({ where: { email: 'p2schema@test.local' } });
    await prisma.$disconnect();
  });
  it('dua sesi DAILY di tanggal sama boleh; kolom baru ada', async () => {
    const u = await prisma.user.create({ data: { name: 'P2', email: 'p2schema@test.local' } });
    const s1 = await prisma.session.create({ data: { userId: u.id, date: day } });
    const s2 = await prisma.session.create({ data: { userId: u.id, date: day, kind: 'REPLAY' } });
    expect(s1.kind).toBe('DAILY'); expect(s2.xpAwarded).toBe(0);
    expect(u.soundOn).toBe(true); expect(u.onboardedAt).toBeNull();
  });
});
