import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AskAdvisorDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  question?: string;
}
