import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class CalcPayrollDto {
  @ApiProperty({ example: '2026-05', description: 'Month in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month: string;

  @ApiPropertyOptional({
    example: false,
    description: 'If true, creates payment records immediately',
  })
  @IsOptional()
  @IsBoolean()
  applyImmediately?: boolean;
}
