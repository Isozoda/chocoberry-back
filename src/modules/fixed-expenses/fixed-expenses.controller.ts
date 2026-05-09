import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FixedExpensesService } from './fixed-expenses.service';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('fixed-expenses')
@ApiBearerAuth('JWT')
@Controller('fixed-expenses')
export class FixedExpensesController {
  constructor(private readonly service: FixedExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'List fixed expenses' })
  @ApiQuery({ name: 'month', required: false, example: '2026-05' })
  @ApiQuery({ name: 'isPaid', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('isPaid') isPaid?: string,
  ) {
    return this.service.findAll(user.id, month, isPaid);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Monthly summary: paid/pending totals' })
  @ApiQuery({ name: 'month', required: false, example: '2026-05' })
  getSummary(@CurrentUser() user: any, @Query('month') month?: string) {
    return this.service.getSummary(user.id, month);
  }

  @Post()
  @ApiOperation({ summary: 'Create fixed expense' })
  create(@CurrentUser() user: any, @Body() dto: CreateFixedExpenseDto) {
    return this.service.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fixed expense by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update fixed expense' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateFixedExpenseDto) {
    return this.service.update(user.id, id, dto);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Mark fixed expense as paid' })
  markPaid(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.markPaid(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete fixed expense' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
