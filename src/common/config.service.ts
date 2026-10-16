import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppConfigService {
  private cache = new Map<string, { v: number; at: number }>();

  constructor(private prisma: PrismaService) {}

  async getInt(key: string): Promise<number> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < 60_000) return hit.v;
    const row = await this.prisma.config.findUnique({ where: { key } });
    if (!row) throw new Error(`Config '${key}' tidak ditemukan`);
    const v = parseInt(row.value, 10);
    this.cache.set(key, { v, at: Date.now() });
    return v;
  }

  /** Lupakan cache 60 dtk — dipakai test yang mengubah config di tengah jalan. */
  clearCache(): void {
    this.cache.clear();
  }
}
