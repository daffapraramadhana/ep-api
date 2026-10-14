import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  // Tanpa ini tiap app.close() (mis. per file e2e, satu proses --runInBand)
  // membocorkan pool koneksi sampai proses selesai → Postgres kehabisan slot.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
