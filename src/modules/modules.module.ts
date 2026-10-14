// apps/api/src/modules/modules.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentModule } from '../content/content.module';
import { AdminModulesController } from './admin-modules.controller';
import { AdminModulesService } from './admin-modules.service';

@Module({
  imports: [AuthModule, ContentModule],
  controllers: [AdminModulesController],
  providers: [AdminModulesService],
})
export class ModulesModule {}
