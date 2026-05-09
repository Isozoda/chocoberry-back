import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SupplierType } from '@prisma/client';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Аки Талабшоҳ', description: 'Supplier name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: SupplierType, example: SupplierType.FRUIT })
  @IsOptional()
  @IsEnum(SupplierType)
  type?: SupplierType;

  @ApiPropertyOptional({ example: '+992 XX XXX XXXX' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Main fruit supplier' })
  @IsOptional()
  @IsString()
  notes?: string;
}
