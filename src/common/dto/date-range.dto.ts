import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DateRangeDto {
  @ApiPropertyOptional({ example: '2026-05-01', description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-05-31', description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
