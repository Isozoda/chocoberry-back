import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CupType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Стакан 0.3 Клубника' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Стакан 0.3 Чистая клубника' })
  @IsOptional()
  @IsString()
  nameRu?: string;

  @ApiPropertyOptional({ example: 'Стакани 0.3 Қулфинай' })
  @IsOptional()
  @IsString()
  nameTg?: string;

  @ApiPropertyOptional({ enum: CupType, example: CupType.CUP_300_ML })
  @IsOptional()
  @IsEnum(CupType)
  cupType?: CupType;

  @ApiPropertyOptional({ example: 'PURE', description: 'PURE | MIX | DOUBLE_MIX | TRIPLE_MIX' })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiProperty({ example: 35, description: 'Selling price in TJS' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'piece' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 'FRUIT_CUP' })
  @IsOptional()
  @IsString()
  category?: string;
}
