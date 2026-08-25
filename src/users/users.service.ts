import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        inviteStatus: true, level: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async importCsv(buf: Buffer) {
    const rows: { nama: string; email: string }[] = parse(buf, {
      columns: true, skip_empty_lines: true, trim: true, bom: true,
    });
    const errors: { row: number; message: string }[] = [];
    const invites: { name: string; email: string; inviteUrl: string }[] = [];
    const seen = new Set<string>();
    let created = 0, skipped = 0;

    for (const [i, r] of rows.entries()) {
      const row = i + 2; // baris spreadsheet (1 = header)
      const email = (r.email ?? '').toLowerCase();
      if (!r.nama || !EMAIL_RE.test(email)) {
        errors.push({ row, message: 'Nama kosong atau email tidak valid' }); skipped++; continue;
      }
      if (seen.has(email)) {
        errors.push({ row, message: `Email duplikat di dalam file: ${email}` }); skipped++; continue;
      }
      seen.add(email);
      if (await this.prisma.user.findUnique({ where: { email } })) {
        errors.push({ row, message: `Email sudah terdaftar: ${email}` }); skipped++; continue;
      }
      const token = randomUUID();
      await this.prisma.user.create({ data: { name: r.nama, email, inviteToken: token } });
      invites.push({
        name: r.nama, email,
        inviteUrl: `${process.env.WEB_ORIGIN}/invite/${token}`,
      });
      created++;
    }
    return { created, skipped, errors, invites };
  }
}
