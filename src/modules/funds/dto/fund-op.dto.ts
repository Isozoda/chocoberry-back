import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FundOpDto {
  @ApiProperty({ example: 1000, description: 'Amount to deposit/withdraw in TJS' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'Monthly contribution' })
  @IsOptional()
  @IsString()
  notes?: string;
}
