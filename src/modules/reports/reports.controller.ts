import { Controller, Get, Query, Res, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth('JWT')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('profit')
  @ApiOperation({ summary: 'P&L report for period' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getProfit(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getProfit(user.id, from, to);
  }

  @Get('cashflow')
  @ApiOperation({ summary: 'Cashflow statement' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getCashflow(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getCashflow(user.id, from, to);
  }

  @Get('cogs')
  @ApiOperation({ summary: 'Cost of Goods Sold' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getCogs(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getCogs(user.id, from, to);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Full daily summary' })
  @ApiQuery({ name: 'date', required: false })
  getDailySummary(@CurrentUser() user: any, @Query('date') date?: string) {
    return this.reportsService.getDailySummary(user.id, date);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Monthly P&L' })
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  @ApiQuery({ name: 'month', required: true, example: 5 })
  getMonthly(@CurrentUser() user: any, @Query('year') year: string, @Query('month') month: string) {
    return this.reportsService.getMonthly(user.id, parseInt(year), parseInt(month));
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top products by revenue' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getTopProducts(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getTopProducts(user.id, from, to);
  }

  @Get('supplier-breakdown')
  @ApiOperation({ summary: 'Supplier purchase breakdown' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getSupplierBreakdown(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getSupplierBreakdown(user.id, from, to);
  }

  @Get('hot-hours')
  @ApiOperation({ summary: 'Sales heatmap by hour' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getHotHours(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getHotHours(user.id, from, to);
  }

  @Get('payroll/:month')
  @ApiOperation({ summary: 'Monthly payroll report' })
  getPayrollReport(@CurrentUser() user: any, @Param('month') month: string) {
    return this.reportsService.getPayrollReport(user.id, month);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Export report as Excel file' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'type', required: false })
  async exportExcel(
    @CurrentUser() user: any,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ) {
    const buffer = await this.reportsService.exportExcel(user.id, from, to, type);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="chocoberry-report.xlsx"`);
    res.send(buffer);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export report as PDF file' })
  @ApiProduces('application/pdf')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportPdf(
    @CurrentUser() user: any,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const buffer = await this.reportsService.exportPdf(user.id, from, to);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="chocoberry-report.pdf"`);
    res.send(buffer);
  }
}
