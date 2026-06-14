import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateKitDto {
  @ApiProperty({ example: 'D&D 5e Стартовий набір' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'dnd-5e-starter-kit' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, alphanumeric, hyphen-separated',
  })
  slug?: string;

  @ApiProperty({ example: 'Повний опис набору...' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiPropertyOptional({ example: 'Все необхідне для першої гри.' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  shortDescription?: string;

  @ApiPropertyOptional({ example: 'Стартовий' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  category?: string;

  @ApiPropertyOptional({ example: 'Безкоштовно' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  priceText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  imageUrl?: string;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ description: 'GameSystem ID to link' })
  @IsOptional()
  @IsString()
  systemId?: string;
}
