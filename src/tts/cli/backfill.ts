// apps/api/src/tts/cli/backfill.ts
// Dev: `npm run tts:backfill [-- --code PREFIX] [--slug PREFIX]`
// Produksi: `node dist/src/tts/cli/backfill.js`
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { TTS_ENGINE } from '../tts-engine';
import type { TtsEngine } from '../tts-engine';
import { BackfillFilter, TtsBackfillService } from '../tts-backfill.service';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const filter: BackfillFilter = {
      codePrefix: arg('--code'),
      slugPrefix: arg('--slug'),
    };
    const r = await app.get(TtsBackfillService).backfill(filter);
    console.log(
      `✔ TTS backfill: ${r.registered} klip terdaftar, ${r.generated} dibuat, ${r.failed} gagal.`,
    );
    process.exitCode = r.failed ? 1 : 0;
  } finally {
    await app.get<TtsEngine>(TTS_ENGINE).unload();
    await app.close();
  }
}

void main();
