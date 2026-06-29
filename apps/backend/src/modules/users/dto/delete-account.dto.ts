import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Поточний пароль для підтвердження' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiProperty({ example: 'ВИДАЛИТИ', description: 'Точне підтвердження видалення' })
  @IsString()
  @MinLength(1)
  confirmation!: string;
}
