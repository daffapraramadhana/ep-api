import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { MediaModule } from './media/media.module';
import { ContentModule } from './content/content.module';
import { CommonModule } from './common/common.module';
import { SessionModule } from './session/session.module';
import { MeModule } from './me/me.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    StorageModule,
    MediaModule,
    ContentModule,
    CommonModule,
    SessionModule,
    MeModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
