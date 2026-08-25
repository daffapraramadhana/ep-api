import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReportsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('status') status: string = 'OPEN') {
    // Validate status parameter
    if (!['OPEN', 'RESOLVED'].includes(status)) {
      throw new BadRequestException('Status harus OPEN atau RESOLVED');
    }

    const reports = await this.prisma.itemReport.findMany({
      where: { status: status as 'OPEN' | 'RESOLVED' },
      include: {
        user: {
          select: { name: true },
        },
        item: {
          select: {
            id: true,
            lessonId: true,
            prompt: true,
            type: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Truncate prompt to 120 characters
    return reports.map((report) => ({
      id: report.id,
      note: report.note,
      status: report.status,
      createdAt: report.createdAt,
      reporter: {
        name: report.user.name,
      },
      item: {
        id: report.item.id,
        lessonId: report.item.lessonId,
        prompt:
          report.item.prompt.length > 120
            ? report.item.prompt.substring(0, 120)
            : report.item.prompt,
        type: report.item.type,
        status: report.item.status,
      },
    }));
  }

  @Patch(':id')
  async resolve(@Param('id') id: string, @Body() body: Record<string, any>) {
    // Validate body - only RESOLVED status is allowed
    if (body.status !== 'RESOLVED') {
      throw new BadRequestException(
        'Hanya transisi ke RESOLVED yang didukung',
      );
    }

    // Check if report exists
    const report = await this.prisma.itemReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException();
    }

    // Update status to RESOLVED
    return this.prisma.itemReport.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });
  }
}
