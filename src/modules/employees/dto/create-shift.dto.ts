import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShiftDto {
  @ApiProperty({ example: '2026-05-01T08:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ example: '2026-05-01T20:00:00Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ example: 12, description: 'Hours worked' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hoursWorked?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
