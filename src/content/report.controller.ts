import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

type AuthUser = { sub: string; role: string };

interface ReportItemBody {
  note?: string;
}

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/report')
  async report(
    @Param('id') id: string,
    @Body() body: ReportItemBody,
    @CurrentUser() user: AuthUser,
  ) {
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (note.length < 3 || note.length > 500) {
      throw new BadRequestException('note harus 3-500 karakter');
    }

    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException();

    return this.prisma.itemReport.create({
      data: { userId: user.sub, itemId: id, note },
    });
  }
}
