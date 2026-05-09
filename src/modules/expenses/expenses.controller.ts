import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('expenses')
@ApiBearerAuth('JWT')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'List expenses' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.expensesService.findAll(user.id, type, from, to, page ? parseInt(page) : 1, limit ? parseInt(limit) : 50);
  }

  @Post()
  @ApiOperation({ summary: 'Create expense' })
  create(@CurrentUser() user: any, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.id, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get expense categories' })
  @ApiQuery({ name: 'expenseType', required: false })
  getCategories(@CurrentUser() user: any, @Query('expenseType') expenseType?: string) {
    return this.expensesService.getCategories(user.id, expenseType);
  }

  @Get('breakdown')
  @ApiOperation({ summary: 'Expense breakdown by type' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getBreakdown(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.expensesService.getBreakdown(user.id, from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expensesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateExpenseDto) {
    return this.expensesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete expense' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expensesService.remove(user.id, id);
  }
}
