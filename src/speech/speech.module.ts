import { Module } from '@nestjs/common';
import { GroqSttService, STT_TRANSCRIBER } from './groq-stt.service';

@Module({
  providers: [
    GroqSttService,
    { provide: STT_TRANSCRIBER, useClass: GroqSttService },
  ],
  exports: [STT_TRANSCRIBER],
})
export class SpeechModule {}
