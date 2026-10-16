// apps/api/src/tts/tts.controller.ts
import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from '../storage/storage.service';
import { TtsService } from './tts.service';

const FILE_RE = /^([0-9a-f]{32})\.mp3$/;

/**
 * GET /tts/:id.mp3 — publik seperti /media (<audio src> tak bisa mengirim
 * Bearer). Hanya id yang sudah didaftarkan BE dari konten yang bisa
 * disintesis. File dilayani lewat jalur yang sama dengan /media (sendFile /
 * redirect) supaya Range request (iOS Safari) tetap jalan.
 */
@Controller('tts')
export class TtsController {
  /** batas tunggu sintesis sebelum 503; sintesis tetap selesai di belakang */
  static waitMs = 30_000;

  constructor(
    private readonly tts: TtsService,
    private readonly storage: StorageService,
  ) {}

  @Get(':file')
  async serve(@Param('file') file: string, @Res() res: Response) {
    const m = FILE_RE.exec(file);
    if (!m) return res.status(404).end();

    const job = this.tts.ensureFile(m[1]);
    job.catch(() => undefined); // tetap ditangani walau kalah balapan timeout
    let timer: NodeJS.Timeout | undefined;
    let fileName: string | null;
    try {
      const winner = await Promise.race([
        job,
        new Promise<'timeout'>((r) => (timer = setTimeout(() => r('timeout'), TtsController.waitMs))),
      ]);
      if (winner === 'timeout') return res.status(503).end();
      fileName = winner;
    } catch {
      return res.status(503).end();
    } finally {
      clearTimeout(timer);
    }
    if (!fileName) return res.status(404).end();

    if (!this.storage.servesLocally) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.redirect(302, this.storage.getUrl(fileName));
    }
    res.sendFile(fileName, {
      root: process.env.STORAGE_DIR ?? './storage',
      maxAge: 31_536_000_000,
      immutable: true,
    });
  }
}
