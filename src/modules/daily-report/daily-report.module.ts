import { Module } from '@nestjs/common';
import { DailyReportController } from './daily-report.controller';
import { DailyReportService } from './daily-report.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [DailyReportController],
  providers: [DailyReportService, PrismaService],
  exports: [DailyReportService],
})
export class DailyReportModule {}
