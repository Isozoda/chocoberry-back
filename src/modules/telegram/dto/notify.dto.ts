import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class NotifyLowStockDto {
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @IsArray()
  items: { name: string; currentStock: string; minStockLevel: string; unit: string }[];
}

export class NotifyDailyReportDto {
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @IsOptional()
  @IsString()
  date?: string;

  totalSales: number;
  totalExpenses: number;
  remaining: number;
}
