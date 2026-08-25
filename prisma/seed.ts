import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const CONFIG: Record<string, string> = {
  XP_FIRST_TRY: '10', XP_RETRY: '2', XP_SESSION_COMPLETE: '20',
  XP_PERFECT_SESSION: '15', XP_DAILY_REVIEW_CAP: '100',
  REVIEW_MAX_PER_SESSION: '3',
};

async function main() {
  for (const [key, value] of Object.entries(CONFIG))
    await prisma.config.upsert({ where: { key }, update: {}, create: { key, value } });
  const email = process.env.ADMIN_EMAIL!;
  await prisma.user.upsert({
    where: { email }, update: {},
    create: {
      name: 'Admin', email, role: 'ADMIN', inviteStatus: 'ACCEPTED',
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD!, 10),
    },
  });
}
main().finally(() => prisma.$disconnect());
