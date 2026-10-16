import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TtsModule } from '../tts/tts.module';
import { ImportService } from './import/import.service';
import { ImportController } from './import/import.controller';
import { ContentService } from './content.service';
import { LessonsController } from './lessons.controller';
import { ItemsController } from './items.controller';
import { ReportController } from './report.controller';
import { AdminReportsController } from './admin-reports.controller';

@Module({
  imports: [AuthModule, TtsModule],
  providers: [ImportService, ContentService],
  controllers: [
    ImportController,
    LessonsController,
    ItemsController,
    ReportController,
    AdminReportsController,
  ],
  exports: [ImportService, ContentService],
})
export class ContentModule {}
