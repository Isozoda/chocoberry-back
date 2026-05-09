import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FundType } from '@prisma/client';

export class CreateFundDto {
  @ApiProperty({ enum: FundType, example: 'CHARITY' })
  @IsEnum(FundType)
  type: FundType;

  @ApiProperty({ example: 'Фонди Хайр' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Monthly charity fund' })
  @IsOptional()
  @IsString()
  notes?: string;
}
