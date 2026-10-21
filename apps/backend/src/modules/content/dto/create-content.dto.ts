import { IsSafeImageUrl } from '../../../common/validators/safe-image-url.validator';
import { CoverFocusDto } from '../../../common/dto/cover-focus.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus, ContentType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContentDto extends CoverFocusDto {
  @ApiProperty({ example: 'Як обрати першу ігрову систему' })
  @IsString()
  @MinLength(3)
  @MaxLength(256)
  title!: string;

  @ApiPropertyOptional({
    example: 'yak-obraty-pershu-igrovu-systemu',
    description: 'Auto-generated from title if omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, alphanumeric, hyphen-separated',
  })
  slug?: string;

  @ApiProperty({ enum: ContentType })
  @IsEnum(ContentType)
  type!: ContentType;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ example: 'Короткий опис матеріалу' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  excerpt?: string;

  @ApiProperty({ example: 'Повний текст матеріалу...' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ description: 'Шлях до зображення (/uploads/... або https://)' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @IsSafeImageUrl()
  coverImageUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
