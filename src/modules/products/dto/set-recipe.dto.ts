import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryUnit } from '@prisma/client';

export class RecipeItemDto {
  @ApiProperty({ example: 'uuid-of-inventory-item' })
  @IsUUID()
  inventoryItemId: string;

  @ApiProperty({ example: 0.1, description: 'Quantity per unit of product' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ enum: InventoryUnit, example: 'KG' })
  @IsEnum(InventoryUnit)
  unit: InventoryUnit;

  @ApiPropertyOptional({ example: '100g strawberry' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetRecipeDto {
  @ApiProperty({ type: [RecipeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items: RecipeItemDto[];
}
