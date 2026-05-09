import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FilterSalesDto } from './dto/filter-sales.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('sales')
@ApiBearerAuth('JWT')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'List sales with filters' })
  findAll(@CurrentUser() user: any, @Query() filter: FilterSalesDto) {
    return this.salesService.findAll(user.id, filter);
  }

  @Post()
  @ApiOperation({ summary: 'Create sale (auto-deducts BOM inventory)' })
  create(@CurrentUser() user: any, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user.id, dto);
  }

  @Get('stats/today')
  @ApiOperation({ summary: "Get today's sales statistics" })
  getStatsToday(@CurrentUser() user: any) {
    return this.salesService.getStatsToday(user.id);
  }

  @Get('stats/top-products')
  @ApiOperation({ summary: 'Top products by revenue' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getTopProducts(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesService.getTopProducts(user.id, from, to, limit ? parseInt(limit) : 10);
  }

  @Get('stats/hot-hours')
  @ApiOperation({ summary: 'Sales heatmap by hour of day' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getHotHours(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.salesService.getHotHours(user.id, from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.salesService.findOne(user.id, id);
  }

  @Patch(':id/void')
  @ApiOperation({ summary: 'Void a sale' })
  voidSale(@CurrentUser() user: any, @Param('id') id: string) {
    return this.salesService.voidSale(user.id, id);
  }
}
