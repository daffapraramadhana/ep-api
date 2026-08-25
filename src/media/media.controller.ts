import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { StorageService } from '../storage/storage.service';

const ALLOWED = new Set(['.mp3', '.m4a', '.png', '.jpg', '.jpeg', '.webp']);

@Controller()
export class MediaController {
  constructor(private storage: StorageService) {}

  @Post('admin/media')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('files', 20))
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Tidak ada file');
    const saved: string[] = [];
    const rejected: { name: string; reason: string }[] = [];
    for (const f of files) {
      const ext = path.extname(f.originalname).toLowerCase();
      if (!ALLOWED.has(ext)) {
        rejected.push({
          name: f.originalname,
          reason: 'Ekstensi tidak didukung',
        });
        continue;
      }
      if (await this.storage.exists(f.originalname)) {
        rejected.push({ name: f.originalname, reason: 'Nama sudah ada' });
        continue;
      }
      await this.storage.put(f.originalname, f.buffer);
      saved.push(f.originalname);
    }
    return { saved, rejected };
  }

  @Get('admin/media')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async list() {
    const names = await this.storage.listNames();
    return Promise.all(
      names.map(async (name) => ({
        name,
        size: (await this.storage.stat(name)).size,
      })),
    );
  }

  @Get('media/:name')
  async serve(@Param('name') name: string, @Res() res: Response) {
    if (!(await this.storage.exists(name))) return res.status(404).end();
    res.sendFile(path.basename(name), {
      root: process.env.STORAGE_DIR ?? './storage',
    });
  }
}
