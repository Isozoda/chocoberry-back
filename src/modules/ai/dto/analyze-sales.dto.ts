import { IsIn, IsOptional, IsString } from 'class-validator';

export class AnalyzeSalesDto {
  @IsIn(['day', 'week', 'month'])
  period: 'day' | 'week' | 'month';

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  lang?: string;
}
