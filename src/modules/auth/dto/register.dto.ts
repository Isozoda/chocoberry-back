import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'owner@chocoberry.tj', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Ман Раисҳо', description: 'Full name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: Role, example: Role.OWNER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
