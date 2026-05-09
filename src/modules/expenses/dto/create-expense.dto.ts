import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseType, PaymentMethod } from '@prisma/client';

export class CreateExpenseDto {
  @ApiPropertyOptional({ example: 'uuid-category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: ExpenseType, example: 'FIXED' })
  @IsEnum(ExpenseType)
  expenseType: ExpenseType;

  @ApiProperty({ example: 500, description: 'Amount in TJS' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'Monthly rent payment' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Landlord Name' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ example: 'uuid-employee' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: 'CASH' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsString()
  date?: string;
}
