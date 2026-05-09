import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFixedExpenseDto {
  @ApiProperty({ example: 'БАДК' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'electricity',
    description: 'electricity|water|rent|tax|internet|logistics|cleaning|other',
  })
  @IsString()
  category: string;

  @ApiProperty({ example: 1200 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'TJS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'monthly', description: 'monthly|weekly|yearly|once' })
  @IsString()
  period: string;

  @ApiProperty({ example: '2026-05-31' })
  @IsString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ example: '2026-05-20' })
  @IsOptional()
  @IsString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
