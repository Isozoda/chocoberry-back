import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StockOutDto {
  @ApiProperty({ example: 5, description: 'Quantity to remove' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 'Used for production' })
  @IsOptional()
  @IsString()
  notes?: string;
}
