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

    // I6: was a bare `create`, so the same user re-reporting the same item
    // kept inserting unbounded rows. @@unique([userId, itemId]) on
    // ItemReport now backs an upsert instead — refresh the existing report
    // (new note, back to OPEN) rather than accumulating duplicates.
    return this.prisma.itemReport.upsert({
      where: { userId_itemId: { userId: user.sub, itemId: id } },
      create: { userId: user.sub, itemId: id, note },
      update: { note, status: 'OPEN' },
    });
  }
}
