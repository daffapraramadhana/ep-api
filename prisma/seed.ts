import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const CONFIG: Record<string, string> = {
  XP_FIRST_TRY: '10', XP_RETRY: '2', XP_SESSION_COMPLETE: '20',
  XP_PERFECT_SESSION: '15', XP_DAILY_REVIEW_CAP: '100',
  REVIEW_MAX_PER_SESSION: '3',
  MONITOR_INACTIVE_DAYS: '5',
  SPEAKING_MATCH_THRESHOLD: '70',
  // Talking agent (ElevenLabs) — cap & XP. Angka starting point, tunable.
  VOICE_AGENT_ENABLED: '0',
  VOICE_DAILY_CAP: '1',
  VOICE_WEEKLY_CAP: '4',
  VOICE_MIN_DURATION_SECS: '60',
  VOICE_MIN_USER_TURNS: '4',
  XP_VOICE_CONVERSATION: '40', // 2 × XP_SESSION_COMPLETE (20)
  // Audio TTS (Kokoro) — saklar darurat, batas sintesis paralel, idle lepas model.
  TTS_ENABLED: '1',
  TTS_MAX_PARALLEL: '1',
  TTS_IDLE_UNLOAD_MINUTES: '10',
};

async function main() {
  for (const [key, value] of Object.entries(CONFIG))
    await prisma.config.upsert({ where: { key }, update: {}, create: { key, value } });
  const email = process.env.ADMIN_EMAIL!;
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 10);
  await prisma.user.upsert({
    where: { email },
    // Rotate the password hash on every boot too, so changing ADMIN_PASSWORD
    // in .env.prod and redeploying actually takes effect for an existing
    // admin row (upsert's `update: {}` previously left it untouched).
    update: { passwordHash },
    create: {
      name: 'Admin', email, role: 'ADMIN', inviteStatus: 'ACCEPTED',
      passwordHash,
    },
  });
}
main().finally(() => prisma.$disconnect());
