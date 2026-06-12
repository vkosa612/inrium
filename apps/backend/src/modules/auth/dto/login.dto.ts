import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@inrium.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin12345!' })
  @IsString()
  @MaxLength(128)
  password!: string;
}
