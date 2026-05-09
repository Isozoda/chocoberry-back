import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { BusinessType } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'Choco Berry Pro' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: BusinessType })
  @IsOptional()
  @IsEnum(BusinessType)
  type?: BusinessType;

  @ApiPropertyOptional({ example: 'Dushanbe, Tajikistan' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+992 XX XXX XXXX' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 2.0, description: 'Default bonus % of monthly sales' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  bonusPercent?: number;
}
