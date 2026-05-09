import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustDto {
  @ApiProperty({ example: 98.5, description: 'New actual stock quantity (absolute value)' })
  @Type(() => Number)
  @IsNumber()
  newQuantity: number;

  @ApiPropertyOptional({ example: 'Inventory count correction' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
