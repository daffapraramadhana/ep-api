import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImportService } from './import/import.service';
import { ImportController } from './import/import.controller';
import { ContentService } from './content.service';
import { LessonsController } from './lessons.controller';
import { ItemsController } from './items.controller';

@Module({
  imports: [AuthModule],
  providers: [ImportService, ContentService],
  controllers: [ImportController, LessonsController, ItemsController],
  exports: [ImportService, ContentService],
})
export class ContentModule {}
