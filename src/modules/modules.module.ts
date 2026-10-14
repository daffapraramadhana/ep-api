import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentModule } from '../content/content.module';
import { SessionModule } from '../session/session.module';
import { AdminModulesController } from './admin-modules.controller';
import { AdminModulesService } from './admin-modules.service';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';

@Module({
  imports: [AuthModule, ContentModule, SessionModule],
  controllers: [AdminModulesController, ModulesController],
  providers: [AdminModulesService, ModulesService],
  exports: [ModulesService],
})
export class ModulesModule {}
