import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DailyReportService } from './daily-report.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('daily-report')
@ApiBearerAuth('JWT')
@Controller('daily-report')
export class DailyReportController {
  constructor(private readonly dailyReportService: DailyReportService) {}

  @Post()
  @ApiOperation({ summary: 'Create daily report' })
  create(@CurrentUser() user: any, @Body() dto: CreateDailyReportDto) {
    return this.dailyReportService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List daily reports' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dailyReportService.findAll(user.id, from, to, page ? parseInt(page) : 1, limit ? parseInt(limit) : 30);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s report (auto-computed from actual data if not created)' })
  getToday(@CurrentUser() user: any) {
    return this.dailyReportService.getToday(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get daily report by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.dailyReportService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update daily report (not finalized)' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateDailyReportDto) {
    return this.dailyReportService.update(user.id, id, dto);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get daily report summary with P&L' })
  getSummary(@CurrentUser() user: any, @Param('id') id: string) {
    return this.dailyReportService.getSummary(user.id, id);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalize daily report (locked)' })
  finalize(@CurrentUser() user: any, @Param('id') id: string) {
    return this.dailyReportService.finalize(user.id, id);
  }
}
