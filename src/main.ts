import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { assertRequiredEnv } from './env-check';

async function bootstrap() {
  assertRequiredEnv();
  // `rawBody: true` — webhook receiver ElevenLabs butuh bytes mentah utk
  // verifikasi HMAC (lihat voice-conversation-webhook.controller.ts). Tidak
  // memengaruhi upload multipart (multer), jadi upload audio tetap aman.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: false });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
