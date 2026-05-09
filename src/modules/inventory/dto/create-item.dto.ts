import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InventoryUnit } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateItemDto {
  @ApiProperty({ example: 'Клубника' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Клубника' })
  @IsOptional()
  @IsString()
  nameRu?: string;

  @ApiPropertyOptional({ example: 'Қулфинай' })
  @IsOptional()
  @IsString()
  nameTg?: string;

  @ApiProperty({ enum: InventoryUnit, example: 'KG' })
  @IsEnum(InventoryUnit)
  unit: InventoryUnit;

  @ApiPropertyOptional({ example: 5, description: 'Minimum stock alert level' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional({ example: 'FRUIT', description: 'FRUIT | CHOCOLATE | PACKAGING' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 15, description: 'Cleaning loss percentage (e.g. 15 = 15%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cleaningLossPct?: number;
}
