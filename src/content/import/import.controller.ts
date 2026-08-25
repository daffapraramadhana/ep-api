import { BadRequestException, Controller, Post, UploadedFile,
  UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ImportService } from './import.service';

@Controller('admin/import')
@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
export class ImportController {
  constructor(private importer: ImportService) {}
  @Post('questions')
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file: Express.Multer.File) {
    if (!file?.originalname.toLowerCase().endsWith('.xlsx'))
      throw new BadRequestException('File harus .xlsx (pakai template yang dikirim)');
    return this.importer.importWorkbook(file.buffer);
  }
}
