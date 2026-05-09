import { IsString, IsNotEmpty } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  chatId: string;
}
