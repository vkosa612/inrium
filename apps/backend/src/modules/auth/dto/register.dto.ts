import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Пароль має містити щонайменше одну літеру та одну цифру',
  })
  password!: string;

  @ApiProperty({ example: 'Brave Adventurer' })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  displayName!: string;
}
