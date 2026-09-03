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
import { JourneyModule } from './journey/journey.module';
import { ProgressModule } from './progress/progress.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { VoiceConversationModule } from './voice-conversation/voice-conversation.module';

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
    JourneyModule,
    ProgressModule,
    MonitoringModule,
    VoiceConversationModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
