import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSystemDto {
  @ApiProperty({ example: 'Dungeons & Dragons 5e' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'dnd-5e' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, alphanumeric, hyphen-separated',
  })
  slug?: string;

  @ApiProperty({ example: 'Повний опис системи...' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiPropertyOptional({ example: 'Найпопулярніша TTRPG у світі.' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  shortDescription?: string;

  @ApiPropertyOptional({ example: 'Початківець' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  complexity?: string;

  @ApiPropertyOptional({ example: 'Фентезі' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  genre?: string;

  @ApiPropertyOptional({ type: [String], example: ['фентезі', 'класика'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Шлях до зображення (/uploads/... або https://)' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  imageUrl?: string;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}
