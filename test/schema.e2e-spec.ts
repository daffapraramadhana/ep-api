import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

describe('schema & seed', () => {
  afterAll(() => prisma.$disconnect());
  it('admin ada dan config terisi', async () => {
    const admin = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL! } });
    expect(admin?.role).toBe('ADMIN');
    expect(await prisma.config.count()).toBeGreaterThanOrEqual(6);
  });
});
