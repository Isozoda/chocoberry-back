import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FundsService } from './funds.service';
import { CreateFundDto } from './dto/create-fund.dto';
import { FundOpDto } from './dto/fund-op.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('funds')
@ApiBearerAuth('JWT')
@Controller('funds')
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Get()
  @ApiOperation({ summary: 'List all funds' })
  findAll(@CurrentUser() user: any) {
    return this.fundsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a fund' })
  create(@CurrentUser() user: any, @Body() dto: CreateFundDto) {
    return this.fundsService.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fund by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.fundsService.findOne(user.id, id);
  }

  @Post(':id/deposit')
  @ApiOperation({ summary: 'Deposit into fund' })
  deposit(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: FundOpDto) {
    return this.fundsService.deposit(user.id, id, dto);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw from fund' })
  withdraw(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: FundOpDto) {
    return this.fundsService.withdraw(user.id, id, dto);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get fund transaction history' })
  getTransactions(@CurrentUser() user: any, @Param('id') id: string) {
    return this.fundsService.getTransactions(user.id, id);
  }
}
