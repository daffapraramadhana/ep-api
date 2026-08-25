import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImportService } from './import/import.service';
import { ImportController } from './import/import.controller';

@Module({
  imports: [AuthModule],
  providers: [ImportService],
  controllers: [ImportController],
  exports: [ImportService],
})
export class ContentModule {}
