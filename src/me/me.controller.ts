import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Level } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SummaryService } from './summary.service';

type AuthUser = { sub: string; role: string };

interface PatchMeBody {
  level?: Level;
  dailyTargetSessions?: number;
  soundOn?: boolean;
  voiceConsent?: boolean;
}

const LEVELS: Level[] = ['DASAR', 'MENENGAH', 'MAHIR'];

function toMeView(u: {
  id: string;
  name: string;
  email: string;
  level: Level | null;
  dailyTargetSessions: number;
  soundOn: boolean;
  onboardedAt: Date | null;
  voiceConsentAt: Date | null;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    level: u.level,
    dailyTargetSessions: u.dailyTargetSessions,
    soundOn: u.soundOn,
    onboarded: u.onboardedAt !== null,
    voiceConsentAt: u.voiceConsentAt,
  };
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private prisma: PrismaService,
    private summary: SummaryService,
  ) {}

  @Get()
  async getMe(@CurrentUser() user: AuthUser) {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.sub },
    });
    return toMeView(u);
  }

  @Patch()
  async patchMe(@Body() body: PatchMeBody, @CurrentUser() user: AuthUser) {
    if (
      body.dailyTargetSessions !== undefined &&
      ![1, 2].includes(body.dailyTargetSessions)
    ) {
      throw new BadRequestException('dailyTargetSessions harus 1 atau 2');
    }
    if (body.level !== undefined && !LEVELS.includes(body.level)) {
      throw new BadRequestException('level tidak valid');
    }
    // I5: mirror answer.service.ts's typeof guard — without a
    // ValidationPipe, a malformed `soundOn` (e.g. a string) would otherwise
    // reach prisma.user.update untyped-checked and either silently coerce or
    // 500.
    if (body.soundOn !== undefined && typeof body.soundOn !== 'boolean') {
      throw new BadRequestException('soundOn harus boolean');
    }
    if (body.voiceConsent !== undefined && typeof body.voiceConsent !== 'boolean') {
      throw new BadRequestException('voiceConsent harus boolean');
    }

    const existing = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.sub },
    });

    const newLevel = body.level !== undefined ? body.level : existing.level;
    const firstTimeOnboarded =
      existing.onboardedAt === null && newLevel !== null;

    const updated = await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        ...(body.level !== undefined ? { level: body.level } : {}),
        ...(body.dailyTargetSessions !== undefined
          ? { dailyTargetSessions: body.dailyTargetSessions }
          : {}),
        ...(body.soundOn !== undefined ? { soundOn: body.soundOn } : {}),
        ...(firstTimeOnboarded ? { onboardedAt: new Date() } : {}),
        // Consent sekali set, permanen — tidak bisa dicabut lewat endpoint ini
        // (haplus-rekaman atas permintaan = backlog admin manual).
        ...(body.voiceConsent && !existing.voiceConsentAt
          ? { voiceConsentAt: new Date() }
          : {}),
      },
    });
    return toMeView(updated);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser) {
    return this.summary.get(user.sub);
  }
}
