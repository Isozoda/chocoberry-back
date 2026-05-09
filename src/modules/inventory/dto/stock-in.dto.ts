import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StockInDto {
  @ApiProperty({ example: 50, description: 'Quantity to add' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 50, description: 'Unit cost in TJS' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiPropertyOptional({ example: 'Manual stock-in' })
  @IsOptional()
  @IsString()
  notes?: string;
}
