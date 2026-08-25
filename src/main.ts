import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { assertRequiredEnv } from './env-check';

async function bootstrap() {
  assertRequiredEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: false });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
