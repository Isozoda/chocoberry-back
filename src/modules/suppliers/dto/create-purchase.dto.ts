import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryUnit } from '@prisma/client';

export class CreatePurchaseDto {
  @ApiPropertyOptional({ example: 'uuid-of-inventory-item', description: 'Inventory item ID' })
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @ApiPropertyOptional({ example: 4, description: 'Number of boxes (if buying by box)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  boxCount?: number;

  @ApiPropertyOptional({ example: 50, description: 'KG per box (used with boxCount)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  kgPerBox?: number;

  @ApiPropertyOptional({ example: 200, description: 'Direct quantity (if not using box calculation)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiProperty({ enum: InventoryUnit, example: 'KG' })
  @IsEnum(InventoryUnit)
  unit: InventoryUnit;

  @ApiProperty({ example: 50, description: 'Price per unit in TJS' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @ApiPropertyOptional({ example: 'Fresh batch from Aki Talabshoh' })
  @IsOptional()
  @IsString()
  notes?: string;
}
