import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BusinessType } from '@prisma/client';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Choco Berry', description: 'Business name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: BusinessType, example: BusinessType.FOOD })
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
}
