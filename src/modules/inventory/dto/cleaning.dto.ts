import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CleaningDto {
  @ApiProperty({ example: 120, description: 'Raw quantity before cleaning (e.g. 120 KG)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rawQuantity: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Actual cleaned quantity (if omitted, auto-calc from cleaningLossPct)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualCleanedQuantity?: number;

  @ApiPropertyOptional({ example: 'Strawberry cleaning - morning batch' })
  @IsOptional()
  @IsString()
  notes?: string;
}
