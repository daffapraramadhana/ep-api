import { Module } from '@nestjs/common';
import { ImportService } from './import/import.service';

@Module({
  providers: [ImportService],
  exports: [ImportService],
})
export class ContentModule {}
