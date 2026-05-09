import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { FilterPurchasesDto } from './dto/filter-purchases.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('suppliers')
@ApiBearerAuth('JWT')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'List all suppliers' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@CurrentUser() user: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.suppliersService.findAll(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  create(@CurrentUser() user: any, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(user.id, dto);
  }

  @Get('breakdown')
  @ApiOperation({ summary: 'Supplier purchase breakdown by period' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getBreakdown(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.suppliersService.getBreakdown(user.id, from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.suppliersService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate supplier' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.suppliersService.remove(user.id, id);
  }

  @Post(':id/purchase')
  @ApiOperation({ summary: 'Record a purchase from supplier (box→kg auto + cup forecast)' })
  @ApiResponse({ status: 201, description: 'Purchase recorded with forecast' })
  createPurchase(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.suppliersService.createPurchase(user.id, id, dto);
  }

  @Get(':id/purchases')
  @ApiOperation({ summary: 'Get purchases from supplier' })
  getPurchases(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() filter: FilterPurchasesDto,
  ) {
    return this.suppliersService.getPurchases(user.id, id, filter);
  }

  @Get(':id/price-history')
  @ApiOperation({ summary: 'Get price history for supplier' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getPriceHistory(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('itemId') itemId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.suppliersService.getPriceHistory(user.id, id, itemId, from, to);
  }
}
