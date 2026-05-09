import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateItemDto } from './dto/create-item.dto';
import { StockInDto } from './dto/stock-in.dto';
import { StockOutDto } from './dto/stock-out.dto';
import { WasteDto } from './dto/waste.dto';
import { CleaningDto } from './dto/cleaning.dto';
import { AdjustDto } from './dto/adjust.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('inventory')
@ApiBearerAuth('JWT')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all inventory items' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.findAll(user.id, category, page ? parseInt(page) : 1, limit ? parseInt(limit) : 100);
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory item' })
  create(@CurrentUser() user: any, @Body() dto: CreateItemDto) {
    return this.inventoryService.create(user.id, dto);
  }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get items below minimum stock level' })
  getLowStock(@CurrentUser() user: any) {
    return this.inventoryService.getLowStock(user.id);
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Get total inventory valuation' })
  getValuation(@CurrentUser() user: any) {
    return this.inventoryService.getValuation(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateItemDto) {
    return this.inventoryService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate inventory item' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.remove(user.id, id);
  }

  @Post(':id/stock-in')
  @ApiOperation({ summary: 'Manual stock in' })
  stockIn(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: StockInDto) {
    return this.inventoryService.stockIn(user.id, id, dto);
  }

  @Post(':id/stock-out')
  @ApiOperation({ summary: 'Manual stock out' })
  stockOut(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: StockOutDto) {
    return this.inventoryService.stockOut(user.id, id, dto);
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Adjust stock to actual count' })
  adjust(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AdjustDto) {
    return this.inventoryService.adjust(user.id, id, dto);
  }

  @Post(':id/waste')
  @ApiOperation({ summary: 'Write off waste/spoilage' })
  waste(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: WasteDto) {
    return this.inventoryService.waste(user.id, id, dto);
  }

  @Post(':id/cleaning')
  @ApiOperation({ summary: 'Record cleaning (raw → cleaned with loss tracking)' })
  cleaning(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CleaningDto) {
    return this.inventoryService.cleaning(user.id, id, dto);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get inventory transaction history' })
  getHistory(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getHistory(user.id, id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 50);
  }
}
