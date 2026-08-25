import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JourneyService } from './journey.service';

type AuthUser = { sub: string; role: string };

@Controller('journey')
@UseGuards(JwtAuthGuard)
export class JourneyController {
  constructor(private journey: JourneyService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.journey.get(user.sub);
  }
}
