import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CashboxOpDto {
  @ApiProperty({ example: 1000, description: 'Amount in TJS' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'Opening cash for the day' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'CASH_IN', enum: ['CASH_IN', 'CASH_OUT'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'ref-uuid' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
