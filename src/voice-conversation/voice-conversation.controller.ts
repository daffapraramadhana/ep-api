import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { VoiceConversationService } from './voice-conversation.service';

type AuthUser = { sub: string; role: string };

@Controller('voice-conversation')
@UseGuards(JwtAuthGuard)
export class VoiceConversationController {
  constructor(private svc: VoiceConversationService) {}

  @Post('start')
  start(@CurrentUser() user: AuthUser) {
    return this.svc.start(user.sub);
  }

  /** Browser laporkan id percakapan ElevenLabs setelah connect (fallback reconcile). */
  @Post(':id/register')
  register(
    @Param('id') id: string,
    @Body() body: { conversationId?: unknown },
    @CurrentUser() user: AuthUser,
  ) {
    const conversationId = body?.conversationId;
    if (typeof conversationId !== 'string' || !conversationId.trim()) {
      throw new BadRequestException('conversationId wajib diisi');
    }
    return this.svc.registerElevenlabsId(user.sub, id, conversationId.trim());
  }

  @Get(':id')
  status(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.status(user.sub, id);
  }
}
