import { IsSafeImageUrl } from '../../../common/validators/safe-image-url.validator';
import { CoverFocusDto } from '../../../common/dto/cover-focus.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGameDto extends CoverFocusDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional({ enum: GameStatus, default: GameStatus.DRAFT })
  @IsOptional()
  @IsEnum(GameStatus)
  status?: GameStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxPlayers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gameSystemId?: string;

  @ApiPropertyOptional({ description: 'Cover image URL (/uploads/... or https://)' })
  @IsOptional()
  @IsString()
  @IsSafeImageUrl()
  coverImageUrl?: string;
}
