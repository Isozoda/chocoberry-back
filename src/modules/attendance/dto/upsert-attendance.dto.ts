import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const VALID_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'DAY_OFF', 'SICK'];

export class UpsertAttendanceDto {
  @IsString()
  date: string;

  @IsString()
  @IsIn(VALID_STATUSES)
  status: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bonus?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  penalty?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  overtimePay?: number;
}
