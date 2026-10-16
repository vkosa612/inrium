import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ description: 'Токен CAPTCHA (якщо CAPTCHA_REQUIRED=true)' })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  captchaToken?: string;
}
