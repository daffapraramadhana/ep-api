// apps/api/src/tts/cli/adopt-seed-audio.ts
// Sekali jalan: pindahkan audio `say`/WAV senyap buatan seeder ke Item.ttsText.
// Dev: `npm run tts:adopt-seed-audio` · Produksi: `node dist/src/tts/cli/adopt-seed-audio.js`
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { seedTtsEntries } from '../../../prisma/seed-tts-entries';
import { TTS_ENGINE } from '../tts-engine';
import type { TtsEngine } from '../tts-engine';
import { TtsBackfillService } from '../tts-backfill.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const r = await app
      .get(TtsBackfillService)
      .adoptSeedAudio(seedTtsEntries());
    console.log(
      `✔ Adopsi audio seeder: ${r.adopted} diadopsi, ${r.kept} dipertahankan (gagal), ${r.skipped} dilewati.`,
    );
    process.exitCode = r.kept ? 1 : 0;
  } finally {
    await app.get<TtsEngine>(TTS_ENGINE).unload();
    await app.close();
  }
}

void main();
