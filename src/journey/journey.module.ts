import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionModule } from '../session/session.module';
import { JourneyController } from './journey.controller';
import { JourneyService } from './journey.service';

@Module({
  imports: [AuthModule, SessionModule],
  controllers: [JourneyController],
  providers: [JourneyService],
})
export class JourneyModule {}
