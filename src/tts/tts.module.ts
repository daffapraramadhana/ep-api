// apps/api/src/tts/tts.module.ts
import { Module } from '@nestjs/common';
import { KokoroEngine, TTS_ENGINE } from './tts-engine';
import { TtsController } from './tts.controller';
import { TtsService } from './tts.service';
import { TtsBackfillService } from './tts-backfill.service';

@Module({
  controllers: [TtsController],
  providers: [
    TtsService,
    TtsBackfillService,
    { provide: TTS_ENGINE, useClass: KokoroEngine },
  ],
  exports: [TtsService, TtsBackfillService],
})
export class TtsModule {}
