import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashboxService } from './cashbox.service';
import { CashboxOpDto } from './dto/cashbox-op.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('cashbox')
@ApiBearerAuth('JWT')
@Controller('cashbox')
export class CashboxController {
  constructor(private readonly cashboxService: CashboxService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get cashbox current balances' })
  getBalance(@CurrentUser() user: any) {
    return this.cashboxService.get(user.id);
  }

  @Post('operation')
  @ApiOperation({ summary: 'Generic cashbox operation' })
  operation(@CurrentUser() user: any, @Body() dto: CashboxOpDto) {
    // Determine if it's IN or OUT based on some logic or just use IN by default if not specified
    // For now, let's assume the frontend sends a type that we can map.
    // The frontend CashboxOperationDto has 'CASH_IN' | 'CASH_OUT' | ...
    if (dto.type === 'CASH_IN') return this.cashboxService.cashIn(user.id, dto);
    if (dto.type === 'CASH_OUT') return this.cashboxService.cashOut(user.id, dto);
    return this.cashboxService.cashIn(user.id, dto);
  }

  @Post('open-session')
  @ApiOperation({ summary: 'Open cashbox session' })
  openSession(@CurrentUser() user: any, @Body() dto: CashboxOpDto) {
    return this.cashboxService.open(user.id, dto);
  }

  @Post('close-session')
  @ApiOperation({ summary: 'Close cashbox session' })
  closeSession(@CurrentUser() user: any, @Body() dto: CashboxOpDto) {
    return this.cashboxService.close(user.id, dto);
  }

  @Get('today')
  @ApiOperation({ summary: "Get today's cashbox report" })
  getToday(@CurrentUser() user: any) {
    return this.cashboxService.getTodayReport(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get cashbox operation history' })
  getHistory(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cashboxService.getHistory(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }
}
