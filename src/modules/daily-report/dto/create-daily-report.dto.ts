import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SupplierLineDto {
  @ApiPropertyOptional({ example: 'uuid-supplier' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ example: 'Аки Талабшоҳ' })
  @IsString()
  name: string;

  @ApiProperty({ example: 5700 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;
}

export class OwnerDrawDto {
  @ApiPropertyOptional({ example: 'uuid-employee' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ example: 'Ман' })
  @IsString()
  ownerName: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateDailyReportDto {
  @ApiProperty({ example: '2026-05-01', description: 'Report date' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 26257, description: 'Total sales (sum from all channels)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalSales: number;

  @ApiPropertyOptional({ example: 20785 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashSales?: number;

  @ApiPropertyOptional({ example: 5472 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cardSales?: number;

  @ApiPropertyOptional({ example: 1300, description: 'Extra income (Trifle, etc.)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  extraIncome?: number;

  @ApiPropertyOptional({ example: 455, description: 'Operational expenses (Масрафҳо)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  operationalExp?: number;

  @ApiPropertyOptional({ example: 3300, description: 'Consumables total (Намк + Баҳрулло)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consumablesExp?: number;

  @ApiPropertyOptional({ type: [SupplierLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierLineDto)
  suppliers?: SupplierLineDto[];

  @ApiPropertyOptional({ type: [OwnerDrawDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OwnerDrawDto)
  draws?: OwnerDrawDto[];

  @ApiPropertyOptional({ example: 8450, description: 'Remaining cash (for validation)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  remaining?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
