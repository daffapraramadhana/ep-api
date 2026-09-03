import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VoiceConversationController } from './voice-conversation.controller';
import { VoiceConversationWebhookController } from './voice-conversation-webhook.controller';
import { VoiceConversationService } from './voice-conversation.service';
import { ELEVENLABS_CLIENT, ElevenLabsService } from './elevenlabs-client.service';

@Module({
  imports: [AuthModule],
  controllers: [VoiceConversationController, VoiceConversationWebhookController],
  providers: [
    VoiceConversationService,
    { provide: ELEVENLABS_CLIENT, useClass: ElevenLabsService },
  ],
})
export class VoiceConversationModule {}
