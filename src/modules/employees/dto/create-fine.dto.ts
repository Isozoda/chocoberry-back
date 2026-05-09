import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFineDto {
  @ApiProperty({ example: 50, description: 'Fine amount in TJS' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'Late arrival', description: 'Reason for fine' })
  @IsString()
  reason: string;
}
