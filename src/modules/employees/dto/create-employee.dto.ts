import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SalaryType } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Намк' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'STAFF', description: 'OWNER | STAFF | ADMIN' })
  @IsString()
  role: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOwner?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Buys consumables for business (Намк, Баҳрулло)',
  })
  @IsOptional()
  @IsBoolean()
  isConsumableBuyer?: boolean;

  @ApiPropertyOptional({ example: '+992 XX XXX XXXX' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 500, description: 'Base salary in TJS' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ enum: SalaryType, example: 'MONTHLY' })
  @IsOptional()
  @IsEnum(SalaryType)
  salaryType?: SalaryType;

  @ApiPropertyOptional({ example: 2.0, description: 'Bonus % of monthly sales' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bonusPercent?: number;
}
