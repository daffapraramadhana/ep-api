import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionService } from './session.service';
import { AnswerService } from './answer.service';

// Format rekaman browser yang diterima. browser AudioContext/webm (Chrome/
// Android) atau mp4 (Safari/iOS). Menolak format lain = 400.
const ALLOWED_SPEECH = new Set(['.webm', '.m4a', '.mp4']);

type AuthUser = { sub: string; role: string };

@Controller('session')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(
    private session: SessionService,
    private answerService: AnswerService,
  ) {}

  @Post('today')
  today(@CurrentUser() user: AuthUser) {
    return this.session.getOrCreateToday(user.sub);
  }

  @Post('replay')
  replay(@Body() body: { lessonId: string }, @CurrentUser() user: AuthUser) {
    return this.session.replay(user.sub, body.lessonId);
  }

  @Post('speaking')
  speaking(@CurrentUser() user: AuthUser) {
    return this.session.speaking(user.sub);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.session.view(id, user.sub);
  }

  @Post(':id/answer')
  answer(
    @Param('id') id: string,
    @Body() body: { itemId: string; answer: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.answerService.submit(user.sub, id, body.itemId, body.answer);
  }

  @Post(':id/speak')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async speak(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('file wajib diupload');
    if (typeof itemId !== 'string') {
      throw new BadRequestException('itemId wajib diisi');
    }
    if (!/^audio\//.test(file.mimetype)) {
      throw new BadRequestException('file harus berformat audio');
    }
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_SPEECH.has(`.${ext}`)) {
      throw new BadRequestException('Ekstensi audio tidak didukung');
    }
    return this.answerService.submitSpeech(user.sub, id, itemId, file);
  }
}
