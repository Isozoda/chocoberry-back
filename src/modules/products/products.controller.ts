import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { SetRecipeDto } from './dto/set-recipe.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('products')
@ApiBearerAuth('JWT')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products' })
  @ApiQuery({ name: 'cupType', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('cupType') cupType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll(user.id, cupType, page ? parseInt(page) : 1, limit ? parseInt(limit) : 100);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  create(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateProductDto) {
    return this.productsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate product' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.remove(user.id, id);
  }

  @Post(':id/recipe')
  @ApiOperation({ summary: 'Set BOM (Bill of Materials) for product' })
  setRecipe(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: SetRecipeDto) {
    return this.productsService.setRecipe(user.id, id, dto);
  }

  @Get(':id/recipe')
  @ApiOperation({ summary: 'Get product recipe/BOM' })
  getRecipe(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.getRecipe(user.id, id);
  }

  @Get(':id/margin')
  @ApiOperation({ summary: 'Get product margin from recipe + avgCost' })
  getMargin(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.getMargin(user.id, id);
  }
}
