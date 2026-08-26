import 'dotenv/config';
import { readFileSync, rmSync, writeFileSync } from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * Guard konten demo untuk e2e — seluruh suite ditulis dengan baseline "DB
 * segar" (khususnya: ada level tanpa lesson LIVE). Seed demo kini mengisi
 * SEMUA level (DC-/WC-/PE-), jadi selama e2e berjalan lesson demo yang LIVE
 * diretire dulu (globalSetup) dan dikembalikan persis seperti semula
 * (globalTeardown). Bila run pernah putus di tengah dan demo tertinggal
 * RETIRED, jalankan lagi `npm run seed:demo` (idempoten, set LIVE).
 */

const DEMO_CODE_PREFIXES = ['DC-', 'WC-', 'PE-'];
const STATE_FILE = path.join(__dirname, '.demo-retired-ids.json');

export async function retireDemoContent() {
  const prisma = new PrismaClient();
  try {
    const live = await prisma.lesson.findMany({
      where: {
        status: 'LIVE',
        OR: DEMO_CODE_PREFIXES.map((p) => ({ code: { startsWith: p } })),
      },
      select: { id: true },
    });
    const ids = live.map((l) => l.id);
    if (ids.length) {
      await prisma.lesson.updateMany({
        where: { id: { in: ids } },
        data: { status: 'RETIRED' },
      });
    }
    writeFileSync(STATE_FILE, JSON.stringify(ids));
  } finally {
    await prisma.$disconnect();
  }
}

export async function restoreDemoContent() {
  const prisma = new PrismaClient();
  try {
    let ids: string[] = [];
    try {
      ids = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    } catch {
      return; // setup tidak sempat jalan / tidak ada yang diretire
    }
    if (ids.length) {
      await prisma.lesson.updateMany({
        where: { id: { in: ids } },
        data: { status: 'LIVE' },
      });
    }
    rmSync(STATE_FILE, { force: true });
  } finally {
    await prisma.$disconnect();
  }
}
